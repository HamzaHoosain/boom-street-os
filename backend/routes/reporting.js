// backend/routes/reporting.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/reporting/profit-and-loss
// @desc    Generate a Profit & Loss statement
// @access  Private (Admin/Manager)
router.get('/profit-and-loss', authMiddleware, async (req, res) => {
    // Get filter criteria from query parameters
    const { business_unit_id, start_date, end_date } = req.query;

    // Basic validation
    if (!business_unit_id || !start_date || !end_date) {
        return res.status(400).json({ msg: 'Please provide business_unit_id, start_date, and end_date.' });
    }

    try {
        // --- Calculate Total Income ---
        // This includes all direct sales and internal transfers where this unit was the provider.
        const incomeResult = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_income
             FROM transactions
             WHERE business_unit_id = $1
             AND transaction_date BETWEEN $2 AND $3
             AND (type = 'INCOME' OR type = 'INTERNAL_INCOME')`,
            [business_unit_id, start_date, end_date]
        );
        const totalIncome = parseFloat(incomeResult.rows[0].total_income);

        // --- Calculate Total Expenses ---
        // This includes all direct expenses (like scrap purchases) and internal costs.
        const expenseResult = await db.query(
            `SELECT COALESCE(SUM(amount), 0) AS total_expenses
             FROM transactions
             WHERE business_unit_id = $1
             AND transaction_date BETWEEN $2 AND $3
             AND (type = 'EXPENSE' OR type = 'INTERNAL_EXPENSE')`,
            [business_unit_id, start_date, end_date]
        );
        const totalExpenses = parseFloat(expenseResult.rows[0].total_expenses);

        // --- Calculate Net Profit ---
        const netProfit = totalIncome - totalExpenses;

        // --- Assemble the Report ---
        const report = {
            report_details: {
                business_unit_id: parseInt(business_unit_id),
                start_date: start_date,
                end_date: end_date,
            },
            summary: {
                total_income: totalIncome,
                total_expenses: totalExpenses,
                net_profit: netProfit,
            },
        };

        res.json(report);

    } catch (err) {
        console.error('P&L Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;