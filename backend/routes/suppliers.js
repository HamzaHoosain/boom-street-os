// backend/routes/suppliers.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/suppliers
// @desc    Get all suppliers
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const suppliers = await db.query('SELECT * FROM suppliers ORDER BY name');
        res.json(suppliers.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/suppliers
// @desc    Create a new supplier
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { name, contact_person, phone_number, email } = req.body;
    try {
        const newSupplier = await db.query(
            "INSERT INTO suppliers (name, contact_person, phone_number, email) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, contact_person, phone_number, email]
        );
        res.status(201).json(newSupplier.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;