// backend/routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// backend/routes/sales.js - ENHANCED
// @route   POST api/sales
// @desc    Process a new sale (now with optional customer_id)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    // Add customer_id to the destructured request body
    const { business_unit_id, cart_items, total_amount, customer_id } = req.body;
    const user_id = req.user.id;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create a record in the 'sales' table, now including the customer_id
        // The customer_id can be null if no customer is assigned.
        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount, customer_id) VALUES ($1, $2, $3, $4) RETURNING id, sale_date';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount, customer_id || null]);
        const newSaleId = saleResult.rows[0].id;
        
        // 2. Loop through cart items, update inventory and log sale items
        for (const item of cart_items) {
            // 2a. Insert into 'sale_items'
            const saleItemQuery = 'INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale) VALUES ($1, $2, $3, $4)';
            await client.query(saleItemQuery, [newSaleId, item.id, item.quantity, item.selling_price]);

            // 2b. Decrement stock in 'products' table
            const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2';
            await client.query(updateStockQuery, [item.quantity, item.id]);
        }

        // 3. Create a single corresponding transaction in the financial ledger
        const transactionQuery = 'INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, $3, $4, $5)';
        const description = `Sale #${newSaleId}`;
        await client.query(transactionQuery, [business_unit_id, total_amount, 'INCOME', description, newSaleId]);

        // If all queries were successful, commit the transaction
        await client.query('COMMIT');

        res.status(201).json({ msg: 'Sale processed successfully', saleId: newSaleId });

    } catch (err) {
        // If any query fails, roll back the entire transaction
        await client.query('ROLLBACK');
        console.error('Transaction Error:', err.message);
        res.status(500).send('Server error during transaction');
    } finally {
        // Release the client back to the pool
        client.release();
    }
});

module.exports = router;