// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/categories
// @desc    Get all categories
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM categories ORDER BY name');
        res.json(categories.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;