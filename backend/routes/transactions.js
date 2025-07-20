// backend/routes/transactions.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/transactions/:businessUnitId
// @desc    Get a unified list of all transactions
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    const isOverview = businessUnitId === 'overview';

    try {
        let result;
        if (isOverview) {
            result = await db.query(`
                SELECT t.*, bu.name as business_unit_name 
                FROM transactions t
                JOIN business_units bu ON t.business_unit_id = bu.id
                ORDER BY t.transaction_date DESC
            `);
        } else {
            result = await db.query(
                "SELECT *, '' as business_unit_name FROM transactions WHERE business_unit_id = $1 ORDER BY transaction_date DESC",
                [businessUnitId]
            );
        }
        res.json(result.rows);
    } catch (err) {
        console.error("Get Transactions Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;