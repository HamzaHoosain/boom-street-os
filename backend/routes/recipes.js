// backend/routes/recipes.js

const express = require('express');
const router = express.Router(); // <--- THIS LINE WAS MISSING
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/recipes/:productId
// @desc    Get the bill of materials (recipe) for a specific finished product
router.get('/:productId', authMiddleware, async (req, res) => {
    const { productId } = req.params;
    try {
        const query = `
            SELECT 
                bom.quantity_required, 
                p.id as ingredient_id, 
                p.name as ingredient_name,
                p.quantity_on_hand
            FROM bill_of_materials bom
            JOIN products p ON bom.ingredient_product_id = p.id
            WHERE bom.finished_good_product_id = $1
        `;
        const recipeResult = await db.query(query, [productId]);
        res.json(recipeResult.rows);
    } catch (err) {
        console.error("Get Recipe Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; // This line was also implicitly needed