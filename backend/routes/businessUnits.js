// backend/routes/businessUnits.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/business-units
// @desc    Get a simple list of all business units
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const units = await db.query('SELECT id, name FROM business_units ORDER BY name');
        res.json(units.rows);
    } catch (err) {
        console.error("Get Business Units Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;