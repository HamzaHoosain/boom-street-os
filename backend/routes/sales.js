// backend/routes/sales.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/sales
// @desc    Process a new sale
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, total_amount } = req.body;
    const user_id = req.user.id; // From our authMiddleware

    // Get a client from the connection pool to run a transaction
    const client = await db.pool.connect();

    try {
        // Start a database transaction
        await client.query('BEGIN');

        // 1. Create a record in the 'sales' table
        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount) VALUES ($1, $2, $3) RETURNING id, sale_date';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount]);
        const newSaleId = saleResult.rows[0].id;
        const saleDate = saleResult.rows[0].sale_date;

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