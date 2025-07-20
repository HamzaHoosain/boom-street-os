// backend/routes/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/transactions/:businessUnitId
// @desc    Get a unified, intelligent list of all transactions
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    const isOverview = businessUnitId === 'overview';

    try {
        let result;
        // This advanced query joins transactions with the sales table
        // to fetch the payment_status for any transaction that is a sale.
        const query = `
            SELECT 
                t.id,
                t.transaction_date,
                t.amount,
                t.type,
                t.description,
                t.source_reference,
                bu.name as business_unit_name,
                s.payment_status -- This is the new, crucial piece of data
            FROM transactions t
            JOIN business_units bu ON t.business_unit_id = bu.id
            LEFT JOIN sales s ON t.source_reference = 'sale:' || s.id -- Join only if the transaction is a sale
            WHERE ${isOverview ? '1=1' : 't.business_unit_id = $1'}
            ORDER BY t.transaction_date DESC
        `;
        
        if (isOverview) {
            result = await db.query(query);
        } else {
            result = await db.query(query, [businessUnitId]);
        }
        res.json(result.rows);
    } catch (err) {
        console.error("Get Transactions Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;