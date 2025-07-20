// backend/routes/terminals.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/terminals
// @desc    Get all configured payment terminals
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const terminals = await db.query('SELECT * FROM payment_terminals ORDER BY name');
        res.json(terminals.rows);
    } catch (err) {
        console.error("Get Terminals Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// We can add POST, PUT, DELETE routes here later to manage terminals from the UI
// For now, we only need to get the list.

module.exports = router;