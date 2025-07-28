// backend/routes/stocktakes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/stocktakes
// @desc    Process a new stock take and create all necessary records
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, notes, items } = req.body;
    const user_id = req.user.id;

    if (!items || items.length === 0) {
        return res.status(400).json({ msg: 'Stock take must include at least one item.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        let totalVarianceValue = 0;

        // 1. Create the parent stock_takes record
        const stockTakeRes = await client.query(
            'INSERT INTO stock_takes (business_unit_id, user_id, notes) VALUES ($1, $2, $3) RETURNING id',
            [business_unit_id, user_id, notes]
        );
        const newStockTakeId = stockTakeRes.rows[0].id;

        // 2. Loop through each counted item
        for (const item of items) {
            const { product_id, counted_qty } = item;

            // Get the current system quantity and cost price for the product
            const productRes = await client.query('SELECT quantity_on_hand, cost_price FROM products WHERE id = $1 FOR UPDATE', [product_id]);
            if (productRes.rows.length === 0) {
                throw new Error(`Product with ID ${product_id} not found.`);
            }
            const product = productRes.rows[0];
            const system_qty = parseFloat(product.quantity_on_hand);
            const cost_at_time = parseFloat(product.cost_price);

            // Calculate variances
            const variance_qty = parseFloat(counted_qty) - system_qty;
            const variance_value = variance_qty * cost_at_time;
            totalVarianceValue += variance_value;
            
            // 3. Insert the detailed stock_take_items record
            await client.query(
                `INSERT INTO stock_take_items 
                (stock_take_id, product_id, system_qty, counted_qty, variance_qty, cost_at_time, variance_value) 
                VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [newStockTakeId, product_id, system_qty, counted_qty, variance_qty, cost_at_time, variance_value]
            );

            // 4. IMPORTANT: Update the product's actual stock level to the new counted quantity
            await client.query(
                'UPDATE products SET quantity_on_hand = $1 WHERE id = $2',
                [counted_qty, product_id]
            );
        }

        // 5. Create a single, consolidated transaction in the Unified Financial Ledger for the total variance
        if (totalVarianceValue !== 0) {
            // Determine transaction type and description
            const transactionType = totalVarianceValue > 0 ? 'STOCK_GAIN' : 'EXPENSE';
            const description = totalVarianceValue > 0 
                ? `Stock Gain from Stock Take #${newStockTakeId}`
                : `Stock Loss/Shrinkage from Stock Take #${newStockTakeId}`;
            
            // The amount is always positive, the `type` determines if it's income or expense
            const transactionAmount = Math.abs(totalVarianceValue);
            
            await client.query(
                "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, $3, $4, $5)",
                [business_unit_id, transactionAmount, transactionType, description, `stock_take:${newStockTakeId}`]
            );
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Stock take processed successfully', stockTakeId: newStockTakeId, variance: totalVarianceValue });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Stock Take Error:", err.message);
        res.status(500).send({ msg: 'Server error during stock take processing.' });
    } finally {
        client.release();
    }
});


module.exports = router;