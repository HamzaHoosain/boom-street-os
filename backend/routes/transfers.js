// backend/routes/transfers.js - ENHANCED
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// The /request route remains unchanged
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
// @desc    Fulfills the request. Now handles both financial and logistical transfers.
// @access  Private
router.post('/:id/fulfill', authMiddleware, async (req, res) => {
    const transferId = req.params.id;
    const approving_user_id = req.user.id;

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the transfer details AND the types of the business units involved
        const transferQuery = `
            SELECT 
                st.*, 
                req_bu.type as requesting_unit_type,
                pro_bu.type as providing_unit_type
            FROM stock_transfers st
            JOIN business_units req_bu ON st.requesting_unit_id = req_bu.id
            JOIN business_units pro_bu ON st.providing_unit_id = pro_bu.id
            WHERE st.id = $1
        `;
        const transferResult = await client.query(transferQuery, [transferId]);
        if (transferResult.rows.length === 0) {
            throw new Error('Stock transfer request not found.');
        }
        const transfer = transferResult.rows[0];
        
        // 2. Decrement stock from the PROVIDING business unit's inventory
        // Note: For now, we assume the providing unit has stock. A real-world app would add a check here.
        const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2';
        await client.query(updateStockQuery, [transfer.quantity_requested, transfer.product_id]);
        
        // --- NEW LOGIC: DECIDE WHICH TYPE OF TRANSFER IT IS ---
        if (transfer.requesting_unit_type !== transfer.providing_unit_type) {
            // This is a FINANCIAL transfer (e.g., Retail -> Service)
            console.log('Processing as FINANCIAL transfer...');

            const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [transfer.product_id]);
            const cost_price = productResult.rows[0].cost_price;
            const totalValue = cost_price * transfer.quantity_requested;

            // Create the "IOU" financial transactions
            const expenseQuery = "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INTERNAL_EXPENSE', $3, $4)";
            await client.query(expenseQuery, [transfer.requesting_unit_id, totalValue, `Internal transfer #${transferId}`, `transfer:${transferId}`]);
            
            const incomeQuery = "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INTERNAL_INCOME', $3, $4)";
            await client.query(incomeQuery, [transfer.providing_unit_id, totalValue, `Internal transfer #${transferId}`, `transfer:${transferId}`]);

        } else {
            // This is a purely LOGISTICAL transfer (e.g., Retail -> Retail)
            console.log('Processing as LOGISTICAL transfer...');
            // We only move inventory, no financial entries are created.
            // In the future, we might add a feature to also move the stock to the new unit's inventory.
        }
        // --- END OF NEW LOGIC ---

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