// backend/routes/transfers.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/transfers/request
// @desc    A user from one unit requests stock from another
// @access  Private
router.post('/request', authMiddleware, async (req, res) => {
    const { requesting_unit_id, providing_unit_id, product_id, quantity_requested } = req.body;
    const requesting_user_id = req.user.id;

    try {
        const newRequest = await db.query(
            "INSERT INTO stock_transfers (requesting_unit_id, providing_unit_id, product_id, quantity_requested, status, requesting_user_id) VALUES ($1, $2, $3, $4, 'Pending', $5) RETURNING *",
            [requesting_unit_id, providing_unit_id, product_id, quantity_requested, requesting_user_id]
        );
        res.status(201).json(newRequest.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/transfers/:id/fulfill
// @desc    A manager from the providing unit approves and fulfills the request
// @access  Private
router.post('/:id/fulfill', authMiddleware, async (req, res) => {
    const transferId = req.params.id;
    const approving_user_id = req.user.id;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the transfer details
        const transferResult = await client.query('SELECT * FROM stock_transfers WHERE id = $1', [transferId]);
        if (transferResult.rows.length === 0) {
            throw new Error('Stock transfer request not found.');
        }
        const transfer = transferResult.rows[0];
        
        // 2. Get the product's cost price to create the financial transaction
        const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [transfer.product_id]);
        if (productResult.rows.length === 0) {
            throw new Error('Product not found.');
        }
        const cost_price = productResult.rows[0].cost_price;
        const totalValue = cost_price * transfer.quantity_requested;

        // 3. Decrement stock from the PROVIDING business unit's inventory
        // NOTE: This assumes the providing unit HAS the stock. We are not adding stock to the requesting unit.
        // The requesting unit will use the item, and we already accounted for that expense in the job card.
        // This transfer simply moves the inventory liability.
        const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2';
        await client.query(updateStockQuery, [transfer.quantity_requested, transfer.product_id]);

        // 4. Create TWO financial transactions to create the "IOU"
        // 4a. An EXPENSE for the requesting unit
        const expenseQuery = "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INTERNAL_EXPENSE', $3, $4)";
        await client.query(expenseQuery, [transfer.requesting_unit_id, totalValue, `Internal transfer #${transferId}`, `transfer:${transferId}`]);
        
        // 4b. An INCOME for the providing unit
        const incomeQuery = "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INTERNAL_INCOME', $3, $4)";
        await client.query(incomeQuery, [transfer.providing_unit_id, totalValue, `Internal transfer #${transferId}`, `transfer:${transferId}`]);

        // 5. Update the stock transfer request to 'Completed'
        const updateTransferQuery = "UPDATE stock_transfers SET status = 'Completed', approving_user_id = $1, completed_at = NOW() WHERE id = $2";
        await client.query(updateTransferQuery, [approving_user_id, transferId]);
        
        await client.query('COMMIT');
        res.status(200).json({ msg: 'Stock transfer completed successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Fulfill Transfer Transaction Error:', err.message);
        res.status(500).send('Server error during transfer fulfillment');
    } finally {
        client.release();
    }
});


module.exports = router;