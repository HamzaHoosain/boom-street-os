// backend/routes/reporting.js - ENHANCED
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/reporting/profit-and-loss
// @desc    Generate a detailed Profit & Loss statement
// @access  Private
router.get('/profit-and-loss', authMiddleware, async (req, res) => {
    const { business_unit_id, start_date, end_date } = req.query;

    if (!business_unit_id || !start_date || !end_date) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }

    // --- THIS IS THE FIX ---
    // We will adjust the timestamps to cover the full day range.
    // The start_date will be interpreted as the very beginning of that day (00:00:00).
    // The end_date will be interpreted as the very end of that day (23:59:59.999).
    // The '::timestamp' cast in PostgreSQL correctly handles this.
    const fullDayEndDate = `${end_date} 23:59:59.999`;
    // --- END OF FIX ---

    try {
        let incomeQuery, expenseQuery;
        // The query parameters are now adjusted for the full day
        let queryParams = [start_date, fullDayEndDate];
        const isOverview = business_unit_id === 'overview';

        if (isOverview) {
            incomeQuery = `SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE transaction_date BETWEEN $1::timestamp AND $2::timestamp AND (type = 'INCOME' OR type = 'INTERNAL_INCOME') GROUP BY type`;
            expenseQuery = `SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE transaction_date BETWEEN $1::timestamp AND $2::timestamp AND (type = 'EXPENSE' OR type = 'INTERNAL_EXPENSE') GROUP BY type`;
        } else {
            queryParams.push(business_unit_id);
            incomeQuery = `SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE transaction_date BETWEEN $1::timestamp AND $2::timestamp AND (type = 'INCOME' OR type = 'INTERNAL_INCOME') AND business_unit_id = $3 GROUP BY type`;
            expenseQuery = `SELECT type, COALESCE(SUM(amount), 0) AS total FROM transactions WHERE transaction_date BETWEEN $1::timestamp AND $2::timestamp AND (type = 'EXPENSE' OR type = 'INTERNAL_EXPENSE') AND business_unit_id = $3 GROUP BY type`;
        }
        
        const [incomeResult, expenseResult] = await Promise.all([
            db.query(incomeQuery, queryParams),
            db.query(expenseQuery, queryParams)
        ]);

        const income_breakdown = {};
        let total_income = 0;
        incomeResult.rows.forEach(row => {
            income_breakdown[row.type] = parseFloat(row.total);
            total_income += parseFloat(row.total);
        });

        const expense_breakdown = {};
        let total_expenses = 0;
        expenseResult.rows.forEach(row => {
            expense_breakdown[row.type] = parseFloat(row.total);
            total_expenses += parseFloat(row.total);
        });

        const report = {
            summary: {
                total_income,
                total_expenses,
                net_profit: total_income - total_expenses
            },
            breakdown: {
                income: income_breakdown,
                expenses: expense_breakdown
            }
        };

        res.json(report);

    } catch (err) {
        console.error('P&L Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;