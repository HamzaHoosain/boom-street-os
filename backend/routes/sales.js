const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/sales
// @desc    Process a new sale with final payment, amount paid, and cost_at_sale logic
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, total_amount, customer_id, payment } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        let paymentStatus = 'Paid';
        let initialAmountPaid = 0;

        if (payment.method === 'ON_ACCOUNT') {
            if (!customer_id) {
                throw new Error('A customer must be assigned to the sale to process it on account.');
            }
            paymentStatus = 'On Account';
            initialAmountPaid = 0; 
            await client.query("UPDATE customers SET account_balance = account_balance + $1 WHERE id = $2", [total_amount, customer_id]);
        } else {
            paymentStatus = 'Paid';
            initialAmountPaid = total_amount;
        }

        // 1. Create the main sale record with correct payment_status and amount_paid
        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount, customer_id, payment_status, amount_paid) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount, customer_id || null, paymentStatus, initialAmountPaid]);
        const newSaleId = saleResult.rows[0].id;
        
        // 2. Loop through cart items, update product stock, AND RECORD COST AT SALE
        for (const item of cart_items) {
            // --- THIS IS THE CRITICAL FIX ---
            // Get the current cost_price of the product to store for COGS calculation
            const productRes = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.id]);
            const cost_at_sale = productRes.rows[0]?.cost_price || 0;
            // --- END OF FIX ---

            // Now, insert the sale item including the cost_at_sale
            await client.query(
                'INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale, cost_at_sale) VALUES ($1, $2, $3, $4, $5)', 
                [newSaleId, item.id, item.quantity, item.selling_price, cost_at_sale]
            );
            
            // Decrement stock
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        // 3. Create the main INCOME transaction (unchanged)
        const incomeDescription = `Sale #${newSaleId} via ${payment.method}` + (payment.terminal_name ? ` (${payment.terminal_name})` : '');
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, total_amount, incomeDescription, `sale:${newSaleId}`]);
        
        // 4. Update cash safes ONLY if it was an immediate payment (unchanged)
        if (payment.method !== 'ON_ACCOUNT' && payment.safe_id) {
            await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [total_amount, payment.safe_id]);
            await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, sale_id) VALUES ($1, $2, $3, $4, $5, $6)", [payment.safe_id, `SALE_${payment.method}`, total_amount, `Sale #${newSaleId}`, user_id, newSaleId]);
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