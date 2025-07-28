// backend/routes/suppliers.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/suppliers
// @desc    Get all suppliers, filtered by businessUnitId and optional search term
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    const { businessUnitId, search = '' } = req.query;

    if (!businessUnitId) {
        return res.status(400).json({ msg: 'A businessUnitId query parameter is required to fetch suppliers.' });
    }
    
    try {
        const query = `
            SELECT * FROM suppliers 
            WHERE business_unit_id = $1 AND name ILIKE $2 
            ORDER BY name
        `;
        const suppliers = await db.query(query, [businessUnitId, `%${search}%`]);
        res.json(suppliers.rows);
    } catch (err) {
        console.error("GET SUPPLIERS ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/suppliers
// @desc    Create a new supplier and link it to a business unit
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { name, contact_person, phone_number, email, business_unit_id } = req.body;
    if (!name || !business_unit_id) {
        return res.status(400).json({ msg: 'Supplier name and business unit ID are required.' });
    }
    try {
        const newSupplier = await db.query(
            "INSERT INTO suppliers (name, contact_person, phone_number, email, business_unit_id) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [name, contact_person, phone_number, email, business_unit_id]
        );
        res.status(201).json(newSupplier.rows[0]);
    } catch (err) {
        console.error("CREATE SUPPLIER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/suppliers/:id
// @desc    Get a single supplier and their purchase history
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const [supplierRes, historyRes] = await Promise.all([
            db.query('SELECT * FROM suppliers WHERE id = $1', [id]),
            db.query('SELECT * FROM scrap_purchases WHERE supplier_id = $1 ORDER BY purchase_date DESC', [id])
        ]);

        if (supplierRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Supplier not found' });
        }
        
        res.json({
            supplier: supplierRes.rows[0],
            history: historyRes.rows
        });
    } catch (err) {
        console.error("Get Supplier Details Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;