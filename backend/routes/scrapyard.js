// backend/routes/scrapyard.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/scrapyard/buy
// @desc    Process buying scrap from a seller (Now with automated price calculation)
// @access  Private
router.post('/buy', authMiddleware, async (req, res) => {
    // NOTE: User no longer sends payout_amount. We calculate it.
    const { business_unit_id, product_id, weight_kg } = req.body;
    const user_id = req.user.id;

    if (!business_unit_id || !product_id || !weight_kg) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // --- NEW LOGIC ---
        // 1. Get the product's defined cost price (price per KG)
        const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [product_id]);
        if (productResult.rows.length === 0) {
            throw new Error('Product not found.');
        }
        const cost_per_kg = productResult.rows.cost_price;
        const payout_amount = cost_per_kg * weight_kg; // Calculate the total payout

        // 2. Log the purchase in the 'scrap_purchases' table
        const purchaseQuery = 'INSERT INTO scrap_purchases (user_id, product_id, weight_kg, payout_amount) VALUES ($1, $2, $3, $4) RETURNING id';
        const purchaseResult = await client.query(purchaseQuery, [user_id, product_id, weight_kg, payout_amount]);
        const newPurchaseId = purchaseResult.rows.id;

        // 3. Add the weight to our inventory in the 'products' table
        const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand + $1 WHERE id = $2';
        await client.query(updateStockQuery, [weight_kg, product_id]);

        // 4. Log this as an EXPENSE in the financial ledger
        const transactionQuery = 'INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, $3, $4, $5)';
        const description = `Scrap Purchase #${newPurchaseId}`;
        await client.query(transactionQuery, [business_unit_id, payout_amount, 'EXPENSE', description, `purchase:${newPurchaseId}`]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap purchase processed successfully', purchaseId: newPurchaseId, calculated_payout: payout_amount });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Buy Transaction Error:', err.message);
        res.status(500).send('Server error during scrap purchase');
    } finally {
        client.release();
    }
});


// @route   POST api/scrapyard/sell
// @desc    Process selling scrap to a processor
// @access  Private
router.post('/sell', authMiddleware, async (req, res) => {
    const { business_unit_id, product_id, weight_kg, revenue_amount } = req.body;
    const user_id = req.user.id;

    if (!business_unit_id || !product_id || !weight_kg || !revenue_amount) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }
    
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Log the sale in the 'scrap_sales' table
        const saleQuery = 'INSERT INTO scrap_sales (user_id, product_id, weight_kg, revenue_amount) VALUES ($1, $2, $3, $4) RETURNING id';
        const saleResult = await client.query(saleQuery, [user_id, product_id, weight_kg, revenue_amount]);
        const newSaleId = saleResult.rows[0].id;

        // 2. Remove the weight from our inventory
        const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2';
        await client.query(updateStockQuery, [weight_kg, product_id]);

        // 3. Log this as INCOME in the financial ledger
        const transactionQuery = 'INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, $3, $4, $5)';
        const description = `Scrap Sale #${newSaleId}`;
        await client.query(transactionQuery, [business_unit_id, revenue_amount, 'INCOME', description, newSaleId]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap sale processed successfully', saleId: newSaleId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Sell Transaction Error:', err.message);
        res.status(500).send('Server error during scrap sale');
    } finally {
        client.release();
    }
});


module.exports = router;