// backend/routes/dashboard.js - FINAL CORRECTED VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// This function will get all summary data for a given business unit ID
const getBusinessUnitData = async (businessUnitId) => {
    const [productsRes, salesRes, incomeRes, expenseRes] = await Promise.all([
        db.query('SELECT COUNT(*) FROM products WHERE business_unit_id = $1', [businessUnitId]),
        db.query('SELECT COUNT(*) FROM sales WHERE business_unit_id = $1', [businessUnitId]),
        db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE business_unit_id = $1 AND (type = 'INCOME' OR type = 'INTERNAL_INCOME')", [businessUnitId]),
        db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE business_unit_id = $1 AND (type = 'EXPENSE' OR type = 'INTERNAL_EXPENSE')", [businessUnitId]),
    ]);
    return {
        product_count: parseInt(productsRes.rows[0].count),
        sales_count: parseInt(salesRes.rows[0].count),
        total_income: parseFloat(incomeRes.rows[0].total),
        total_expenses: parseFloat(expenseRes.rows[0].total),
    };
};

// @route   GET api/dashboard/:businessUnitId
// @desc    Get summary metrics for dashboard
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;

    try {
        if (businessUnitId === 'overview') {
            // Logic for the company-wide overview
            const [productsRes, salesRes, incomeRes, expenseRes] = await Promise.all([
                db.query('SELECT COUNT(*) FROM products'),
                db.query('SELECT COUNT(*) FROM sales'),
                db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE (type = 'INCOME' OR type = 'INTERNAL_INCOME')"),
                db.query("SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE (type = 'EXPENSE' OR type = 'INTERNAL_EXPENSE')"),
            ]);
            res.json({
                product_count: parseInt(productsRes.rows[0].count),
                sales_count: parseInt(salesRes.rows[0].count),
                total_income: parseFloat(incomeRes.rows[0].total),
                total_expenses: parseFloat(expenseRes.rows[0].total),
            });
        } else {
            // Logic for a specific business unit
            const data = await getBusinessUnitData(businessUnitId);
            res.json(data);
        }
    } catch (err) {
        console.error("Dashboard API Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;