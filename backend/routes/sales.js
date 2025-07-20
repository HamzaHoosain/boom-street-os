// backend/routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/sales
// @desc    Process a new sale, with full payment method, treasury, and "On Account" logic
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, total_amount, customer_id, payment } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        let paymentStatus = 'Paid';
        if (payment.method === 'ON_ACCOUNT') {
            if (!customer_id) {
                throw new Error('A customer must be assigned to the sale to process it on account.');
            }
            paymentStatus = 'On Account';
            await client.query("UPDATE customers SET account_balance = account_balance + $1 WHERE id = $2", [total_amount, customer_id]);
        }

        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount, customer_id, payment_status) VALUES ($1, $2, $3, $4, $5) RETURNING id';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount, customer_id || null, paymentStatus]);
        const newSaleId = saleResult.rows[0].id;
        
        for (const item of cart_items) {
            await client.query('INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale) VALUES ($1, $2, $3, $4)', [newSaleId, item.id, item.quantity, item.selling_price]);
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        const incomeDescription = `Sale #${newSaleId} via ${payment.method}` + (payment.terminal_name ? ` (${payment.terminal_name})` : '');
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, total_amount, incomeDescription, `sale:${newSaleId}`]);
        
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


// GET route for the old, now-deprecated sales history (can be removed later)
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    // This route is now superseded by GET /api/transactions/:businessUnitId
    console.log("WARNING: GET /api/sales/:id is deprecated. Use /api/transactions/:id instead.");
    res.json([]);
});


module.exports = router;