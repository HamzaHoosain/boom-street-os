// backend/routes/sales.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// Define VAT rate as a constant for easy modification
const VAT_RATE = 0.15; // 15% VAT

// @route   POST api/sales
// @desc    Process a new sale with final payment, amount paid, and cost_at_sale logic
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    // Removed 'total_amount' from destructuring as it will now be calculated on the backend
    const { business_unit_id, cart_items, customer_id, payment } = req.body; 
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // --- Start VAT Calculation ---
        let subtotal_pre_vat = 0;
        const processed_cart_items = []; // To store items with calculated individual vat_amount
        for (const item of cart_items) {
            // Ensure selling_price and quantity are parsed as floats/numbers
            const item_selling_price = parseFloat(item.selling_price) || 0;
            const item_quantity = parseFloat(item.quantity) || 0;

            const item_total_pre_vat = item_selling_price * item_quantity;
            const item_vat_amount = item_total_pre_vat * VAT_RATE;
            subtotal_pre_vat += item_total_pre_vat;
            
            processed_cart_items.push({
                ...item,
                selling_price: item_selling_price, // Ensure it's a number
                quantity: item_quantity,           // Ensure it's a number
                item_vat_amount: item_vat_amount   // Add calculated VAT for this specific item
            });
        }

        const total_vat_amount = subtotal_pre_vat * VAT_RATE;
        const total_amount_inclusive_vat = subtotal_pre_vat + total_vat_amount; // This is the final VAT-inclusive total
        // --- End VAT Calculation ---

        let paymentStatus = 'Paid';
        let initialAmountPaid = 0;

        if (payment.method === 'ON_ACCOUNT') {
            if (!customer_id) {
                throw new Error('A customer must be assigned to the sale to process it on account.');
            }
            paymentStatus = 'On Account';
            initialAmountPaid = 0; 
            // Update customer account balance with the full VAT-inclusive amount
            await client.query("UPDATE customers SET account_balance = account_balance + $1 WHERE id = $2", [total_amount_inclusive_vat, customer_id]);
        } else {
            paymentStatus = 'Paid';
            initialAmountPaid = total_amount_inclusive_vat; // Amount paid is the full VAT-inclusive total
        }

        // 1. Create the main sale record, now including total_vat_amount
        const saleQuery = `
            INSERT INTO sales (business_unit_id, user_id, total_amount, total_vat_amount, customer_id, payment_status, amount_paid) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id
        `;
        const saleResult = await client.query(saleQuery, [
            business_unit_id, 
            user_id, 
            total_amount_inclusive_vat, // Store VAT-inclusive total
            total_vat_amount,           // Store the calculated total VAT component
            customer_id || null, 
            paymentStatus, 
            initialAmountPaid
        ]);
        const newSaleId = saleResult.rows[0].id;
        
        // 2. Loop through processed cart items, update product stock, record cost_at_sale and vat_amount per item
        for (const item of processed_cart_items) { // Use processed_cart_items which now includes item_vat_amount
            // Get the current cost_price of the product to store for COGS calculation
            const productRes = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.id]);
            const cost_at_sale = productRes.rows[0]?.cost_price || 0;

            // Insert the sale item including the cost_at_sale AND vat_amount
            await client.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale, cost_at_sale, vat_amount) VALUES ($1, $2, $3, $4, $5, $6)', 
                [newSaleId, item.id, item.quantity, item.selling_price, cost_at_sale, item.item_vat_amount] 
            );
            
            // Decrement stock
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        // 3. Create the main INCOME transaction (now with VAT-inclusive amount - Golden Rule)
        const incomeDescription = `Sale #${newSaleId} via ${payment.method}` + (payment.terminal_name ? ` (${payment.terminal_name})` : '');
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, total_amount_inclusive_vat, incomeDescription, `sale:${newSaleId}`]);
        
        // 4. Update cash safes ONLY if it was an immediate payment (now with VAT-inclusive amount)
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


// The GET route for the old sales history (now superseded by /api/transactions)
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    console.log("WARNING: The route GET /api/sales/:id is deprecated and will be removed. Please use GET /api/transactions/:id instead.");
    res.json([]); // Return empty array to prevent breaking old logic
});


module.exports = router;