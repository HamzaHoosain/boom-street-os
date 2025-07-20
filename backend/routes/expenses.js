// backend/routes/expenses.js - FINAL VERIFIED VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/expenses
// @desc    Create a new general expense
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, amount, description, safe_id } = req.body;
    if (!business_unit_id || !amount || !description || !safe_id) {
        return res.status(400).json({ msg: 'Please provide all fields.' });
    }
    const user_id = req.user.id;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const newTransaction = await client.query(
            "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, 'manual_expense') RETURNING id",
            [business_unit_id, amount, description]
        );
        const transactionId = newTransaction.rows[0].id;

        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [amount, safe_id]);

        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, expense_id) VALUES ($1, 'CASH_OUT', $2, $3, $4, $5)", [safe_id, -amount, description, user_id, transactionId]);

        await client.query('COMMIT');
        res.status(201).json(newTransaction.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Expense Error:", err.message);
        res.status(500).send({ msg: err.message });
    } finally {
        client.release();
    }
});

// @route   GET api/expenses/categories
// @desc    Get all expense categories
router.get('/categories', authMiddleware, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM expense_categories ORDER BY name');
        res.json(categories.rows);
    } catch (err) {
        console.error("Get Expense Categories Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;