// backend/routes/categories.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        // This query finds all categories that have at least one product
        // assigned to them within the specified business unit.
        const query = `
            SELECT DISTINCT c.id, c.name 
            FROM categories c
            JOIN products p ON c.id = p.category_id
            WHERE p.business_unit_id = $1
            ORDER BY c.name
        `;
        const categories = await db.query(query, [businessUnitId]);
        res.json(categories.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;