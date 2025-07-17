// backend/routes/customers.js - VERIFIED AND CORRECTED
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/customers
// @desc    Create a new customer
router.post('/', authMiddleware, async (req, res) => {
    const { name, phone_number, email } = req.body;
    if (!name) {
        return res.status(400).json({ msg: 'Customer name is required.' });
    }
    try {
        const newCustomer = await db.query(
            "INSERT INTO customers (name, phone_number, email) VALUES ($1, $2, $3) RETURNING *",
            [name, phone_number || null, email || null] // Use null if fields are empty
        );
        res.status(201).json(newCustomer.rows[0]);
    } catch (err) {
        console.error("CREATE CUSTOMER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/customers
// @desc    Get all customers
router.get('/', authMiddleware, async (req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const query = `
            SELECT * FROM customers 
            WHERE name ILIKE $1 OR phone_number ILIKE $1 OR email ILIKE $1
            ORDER BY name
        `;
        const customers = await db.query(query, [`%${searchTerm}%`]);
        res.json(customers.rows);
    } catch (err) {
        console.error("GET CUSTOMERS ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/customers/:id
// @desc    Update a customer
router.put('/:id', authMiddleware, async (req, res) => {
    const { name, phone_number, email } = req.body;
    const { id } = req.params;
    if (!name) {
        return res.status(400).json({ msg: 'Customer name is required.' });
    }
    try {
        const updatedCustomer = await db.query(
            "UPDATE customers SET name = $1, phone_number = $2, email = $3 WHERE id = $4 RETURNING *",
            [name, phone_number || null, email || null, id]
        );
        if (updatedCustomer.rows.length === 0) {
            return res.status(404).json({ msg: 'Customer not found' });
        }
        res.json(updatedCustomer.rows[0]);
    } catch (err) {
        console.error("UPDATE CUSTOMER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;