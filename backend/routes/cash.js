// backend/routes/cash.js - FINAL VERIFIED & ROBUST VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/cash/safes
// @desc    Get all cash safes and their current balances
router.get('/safes', authMiddleware, async (req, res) => {
    try {
        const safes = await db.query('SELECT * FROM cash_safes ORDER BY id');
        res.json(safes.rows);
    } catch (err) {
        console.error("Get Safes Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/cash/transfer
// @desc    Move a specified amount of cash between two safes
router.post('/transfer', authMiddleware, async (req, res) => {
    const { from_safe_id, to_safe_id, amount, notes, business_unit_id } = req.body;
    const user_id = req.user.id;

    if (!from_safe_id || !to_safe_id || !amount || !notes || !business_unit_id) {
        return res.status(400).json({ msg: "Missing required fields for cash transfer." });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // --- ENHANCED LOGIC WITH MORE CHECKS ---
        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [from_safe_id]);
        if (sourceSafe.rows.length === 0) throw new Error('Source safe not found.');
        if (parseFloat(sourceSafe.rows[0].current_balance) < parseFloat(amount)) {
            throw new Error('Insufficient funds in the source safe.');
        }

        const destinationSafe = await client.query('SELECT id FROM cash_safes WHERE id = $1 FOR UPDATE', [to_safe_id]);
        if (destinationSafe.rows.length === 0) throw new Error('Destination safe not found.');
        // --- END OF ENHANCED LOGIC ---

        // 1. Debit the "from" safe
        const debitResult = await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [amount, from_safe_id]);
        console.log(`Debit successful for safe ${from_safe_id}, rows affected: ${debitResult.rowCount}`);
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'TRANSFER_OUT', $2, $3, $4)", [from_safe_id, -amount, notes, user_id]);

        // 2. Credit the "to" safe
        const creditResult = await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [amount, to_safe_id]);
        console.log(`Credit successful for safe ${to_safe_id}, rows affected: ${creditResult.rowCount}`);
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'TRANSFER_IN', $2, $3, $4)", [to_safe_id, amount, notes, user_id]);
        
        // 3. Log the neutral TRANSFER transaction for auditing
        const description = `Cash Transfer: ${notes}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'TRANSFER', $3, 'cash_transfer')", [business_unit_id, amount, description]);

        await client.query('COMMIT');
        res.status(200).json({ msg: 'Cash transfer successful' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Cash Transfer Error:", err.message);
        if (err.message.includes('Insufficient funds') || err.message.includes('not found')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;