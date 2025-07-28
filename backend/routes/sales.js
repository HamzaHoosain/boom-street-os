// backend/routes/sales.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const VAT_RATE = 0.15;

// @route   POST api/sales
// @desc    Process a new sale with VAT-INCLUSIVE pricing logic
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, customer_id, payment } = req.body; 
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // --- NEW VAT-INCLUSIVE CALCULATION LOGIC ---
        let total_amount_inclusive_vat = 0;
        let total_vat_amount = 0;
        
        // This array will hold the final, processed items for insertion
        const processed_cart_items = []; 

        for (const item of cart_items) {
            const item_selling_price_inclusive = parseFloat(item.selling_price) || 0;
            const item_quantity = parseFloat(item.quantity) || 0;
            const item_total_inclusive = item_selling_price_inclusive * item_quantity;

            // Back-calculate to find the pre-VAT and VAT amounts for this line item
            const item_total_exclusive = item_total_inclusive / (1 + VAT_RATE);
            const item_vat_component = item_total_inclusive - item_total_exclusive;
            
            // Add to the sale's grand totals
            total_amount_inclusive_vat += item_total_inclusive;
            total_vat_amount += item_vat_component;

            processed_cart_items.push({
                ...item,
                price_at_sale_inclusive: item_selling_price_inclusive, // The price per item (incl. VAT)
                vat_amount: item_vat_component,                        // The total VAT for this line item
            });
        }
        // --- END OF NEW CALCULATION ---


        let paymentStatus;
        let initialAmountPaid = 0;

        if (payment.method === 'ON_ACCOUNT') {
            if (!customer_id) { throw new Error('A customer must be assigned to the sale to process it on account.'); }
            paymentStatus = 'On Account';
            initialAmountPaid = 0;
            await client.query("UPDATE customers SET account_balance = account_balance + $1 WHERE id = $2", [total_amount_inclusive_vat, customer_id]);
        } else {
            paymentStatus = 'Paid';
            initialAmountPaid = total_amount_inclusive_vat;
        }

        const saleQuery = `
            INSERT INTO sales ( business_unit_id, user_id, total_amount, total_vat_amount, customer_id, payment_status, amount_paid, payment_method ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
            RETURNING id
        `;
        const saleResult = await client.query(saleQuery, [
            business_unit_id, user_id, total_amount_inclusive_vat, total_vat_amount,
            customer_id || null, paymentStatus, initialAmountPaid, payment.method
        ]);
        const newSaleId = saleResult.rows[0].id;
        
        for (const item of processed_cart_items) {
            const productRes = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.id]);
            const cost_at_sale = productRes.rows[0]?.cost_price || 0;

            // CRITICAL CHANGE: We now store the INCLUSIVE price in `price_at_sale`
            await client.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale, cost_at_sale, vat_amount) VALUES ($1, $2, $3, $4, $5, $6)', 
                [newSaleId, item.id, item.quantity, item.price_at_sale_inclusive, cost_at_sale, item.vat_amount] 
            );
            
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        const incomeDescription = `Sale #${newSaleId} via ${payment.method}` + (payment.terminal_name ? ` (${payment.terminal_name})` : '');
        
        // --- THIS IS THE CRITICAL CHANGE ---
        // We now include the `customer_id` in the transaction insert statement.
        await client.query(
            "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, customer_id) VALUES ($1, $2, 'INCOME', $3, $4, $5)", 
            [business_unit_id, total_amount_inclusive_vat, incomeDescription, `sale:${newSaleId}`, customer_id || null]
        );
           
        if (payment.method !== 'ON_ACCOUNT' && payment.safe_id) {
            await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [total_amount_inclusive_vat, payment.safe_id]);
            await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, sale_id) VALUES ($1, $2, $3, $4, $5, $6)", [payment.safe_id, `SALE_${payment.method}`, total_amount_inclusive_vat, `Sale #${newSaleId}`, user_id, newSaleId]);
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Sale processed successfully', saleId: newSaleId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sale Transaction Error:', err.message);
        if (err.message.includes('A customer must be assigned')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send({ msg: 'Server error during transaction.' });
    } finally {
        client.release();
    }
});


// Deprecated route
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    res.json([]);
});

module.exports = router;