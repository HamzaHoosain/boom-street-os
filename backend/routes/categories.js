// backend/routes/categories.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/categories/:businessUnitId
// @desc    Get all categories for a specific business unit
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;

    try {
        const query = "SELECT * FROM categories WHERE business_unit_id = $1 ORDER BY name";
        const categories = await db.query(query, [businessUnitId]);
        res.json(categories.rows);
    } catch (err) {
        console.error("Get Categories Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// @route   POST api/categories
// @desc    Create a new category for a business unit
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { name, business_unit_id } = req.body;
    if (!name || !business_unit_id) {
        return res.status(400).json({ msg: 'Name and business unit ID are required.' });
    }
    try {
        const newCategory = await db.query(
            "INSERT INTO categories (name, business_unit_id) VALUES ($1, $2) RETURNING *",
            [name, business_unit_id]
        );
        res.status(201).json(newCategory.rows[0]);
    } catch (err) {
        // Handle unique constraint violation (duplicate category name)
        if (err.code === '23505') {
            return res.status(400).json({ msg: 'A category with this name already exists for this business.' });
        }
        console.error("Create Category Error:", err.message);
        res.status(500).send("Server Error");
    }
});

// Add PUT and DELETE routes as needed in the future

module.exports = router;