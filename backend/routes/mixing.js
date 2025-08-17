// backend/routes/mixing.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// --- THIS IS THE CORRECTED ROUTE ---
// @route   POST api/mixing/execute
// @desc    Execute a paint mix, adjust stock, and log financial impact
// @access  Private
router.post('/execute', authMiddleware, async (req, res) => { // Was incorrectly named '/complete'
    const { finishedGoodId, quantityToMix, business_unit_id } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Get the recipe for the finished good
        const recipeQuery = `
            SELECT bom.*, p.cost_price, p.quantity_on_hand, p.name as ingredient_name
            FROM bill_of_materials bom
            JOIN products p ON bom.ingredient_product_id = p.id
            WHERE bom.finished_good_product_id = $1
        `;
        const recipeResult = await client.query(recipeQuery, [finishedGoodId]);
        const ingredients = recipeResult.rows;

        if (ingredients.length === 0) {
            return res.status(400).json({ msg: "No recipe found for this product. Cannot mix." });
        }

        let totalCostOfIngredients = 0;

        // Step 2: Check stock and decrement ingredients
        for (const ingredient of ingredients) {
            const quantityNeeded = parseFloat(ingredient.quantity_required) * parseFloat(quantityToMix);
            
            if (parseFloat(ingredient.quantity_on_hand) < quantityNeeded) {
                // Return a clear error message to the frontend
                return res.status(400).json({ msg: `Insufficient stock for ${ingredient.ingredient_name}. Required: ${quantityNeeded}, On Hand: ${ingredient.quantity_on_hand}` });
            }
            
            await client.query("UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2", [quantityNeeded, ingredient.ingredient_product_id]);
            totalCostOfIngredients += quantityNeeded * parseFloat(ingredient.cost_price);
        }

        // Step 3: Increment the finished good's stock
        await client.query("UPDATE products SET quantity_on_hand = quantity_on_hand + $1 WHERE id = $2", [quantityToMix, finishedGoodId]);

        // Step 4: Recalculate the finished good's cost price (Weighted Average Cost)
        const finishedGoodRes = await client.query('SELECT cost_price, quantity_on_hand FROM products WHERE id = $1', [finishedGoodId]);
        const oldCost = parseFloat(finishedGoodRes.rows[0].cost_price);
        const oldQty = parseFloat(finishedGoodRes.rows[0].quantity_on_hand) - parseFloat(quantityToMix);

        // Handle case for products that had 0 quantity to avoid division by zero
        const newWeightedAverageCost = (oldQty + parseFloat(quantityToMix)) > 0 
            ? ((oldCost * oldQty) + totalCostOfIngredients) / (oldQty + parseFloat(quantityToMix))
            : totalCostOfIngredients / parseFloat(quantityToMix);

        await client.query("UPDATE products SET cost_price = $1 WHERE id = $2", [newWeightedAverageCost.toFixed(4), finishedGoodId]);

        // Step 5: Log the COGS_ADJUSTMENT to the Unified Financial Ledger
        const finishedGoodNameRes = await client.query('SELECT name FROM products WHERE id=$1', [finishedGoodId]);
        const finishedGoodName = finishedGoodNameRes.rows[0].name;
        const description = `Mixed ${quantityToMix} units of ${finishedGoodName}`;
        
        await client.query(
            `INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, user_id) 
             VALUES ($1, $2, 'COGS_ADJUSTMENT', $3, $4, $5)`,
            [business_unit_id, totalCostOfIngredients, description, `paint_mix:${finishedGoodId}`, user_id] // amount is positive for COGS adjustment expense
        );
        
        await client.query('COMMIT');
        res.status(200).json({ msg: 'Paint mixed successfully!' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Paint Mix Error:", err.message);
        res.status(500).json({ msg: err.message || 'Server error during paint mix.' });
    } finally {
        client.release();
    }
});

module.exports = router;