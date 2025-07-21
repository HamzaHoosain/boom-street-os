// backend/routes/scrapyard.js - FINAL ADVANCED VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// --- NEW ROUTE to get the list of bulk buyers ---
router.get('/buyers', authMiddleware, async (req, res) => {
    try {
        const buyers = await db.query('SELECT * FROM bulk_buyers ORDER BY name');
        res.json(buyers.rows);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// --- OVERHAULED 'buy' route to calculate average cost ---
router.post('/buy', authMiddleware, async (req, res) => {
    const { business_unit_id, purchase_items, supplier_id, safe_id } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        let totalPayout = 0;

        for (const item of purchase_items) {
            const { product_id, weight_kg } = item;
            
            // --- NEW COGS LOGIC (PART 1) ---
            // 1. Get current stock and average cost
            const productRes = await client.query('SELECT quantity_on_hand, average_cost_price, cost_price FROM products WHERE id = $1 FOR UPDATE', [product_id]);
            const product = productRes.rows[0];
            const current_stock_kg = parseFloat(product.quantity_on_hand);
            const current_avg_cost = parseFloat(product.average_cost_price);
            const purchase_cost_per_kg = parseFloat(product.cost_price);

            // 2. Calculate the new average cost price
            const current_stock_value = current_stock_kg * current_avg_cost;
            const purchase_value = weight_kg * purchase_cost_per_kg;
            const new_total_stock_kg = current_stock_kg + weight_kg;
            const new_avg_cost = (current_stock_value + purchase_value) / new_total_stock_kg;

            // 3. Update the product with new stock and new average cost
            await client.query(
                'UPDATE products SET quantity_on_hand = $1, average_cost_price = $2 WHERE id = $3',
                [new_total_stock_kg, new_avg_cost.toFixed(2), product_id]
            );
            // --- END COGS LOGIC ---
            
            const payout_amount = purchase_cost_per_kg * weight_kg;
            totalPayout += payout_amount;
            await client.query('INSERT INTO scrap_purchases (user_id, product_id, weight_kg, payout_amount, supplier_id) VALUES ($1, $2, $3, $4, $5)', [user_id, product_id, weight_kg, payout_amount, supplier_id || null]);
        }
        
        // Treasury logic remains the same
        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [safe_id]);
        if (sourceSafe.rows.length === 0 || parseFloat(sourceSafe.rows[0].current_balance) < totalPayout) {
            throw new Error('Insufficient funds in the source safe.');
        }
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [totalPayout, safe_id]);
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'PAYOUT_CASH', $2, $3, $4)", [safe_id, -totalPayout, `Scrap Payout`, user_id]);
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description) VALUES ($1, $2, 'EXPENSE', $3)", [business_unit_id, totalPayout, `Scrap Purchase Payout`]);
        
        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap purchase processed successfully', total_payout: totalPayout });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Buy Transaction Error:', err.message);
        res.status(500).send({ msg: err.message || 'Server error' });
    } finally {
        client.release();
    }
});

// --- OVERHAULED 'sell' route for COGS, buyers, and treasury ---
router.post('/sell', authMiddleware, async (req, res) => {
    const { business_unit_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // --- NEW COGS LOGIC (PART 2) ---
        // 1. Get the product's current average cost to calculate COGS for this sale
        const productRes = await client.query('SELECT average_cost_price FROM products WHERE id = $1', [product_id]);
        const avg_cost = parseFloat(productRes.rows[0].average_cost_price);
        const cost_of_goods_sold = avg_cost * weight_kg;
        // --- END COGS LOGIC ---

        // No longer check/limit by stock
        // 2. Decrement inventory
        await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [weight_kg, product_id]);

        // 3. Create the scrap_sales record with all new details
        const saleResult = await client.query(
            `INSERT INTO scrap_sales (user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number, cost_of_goods_sold) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number, cost_of_goods_sold]
        );
        const newSaleId = saleResult.rows[0].id;

        // 4. Create TWO master financial transactions: INCOME and COGS
        const incomeDesc = `Bulk Scrap Sale #${newSaleId}`;
        const cogsDesc = `COGS for Bulk Scrap Sale #${newSaleId}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, revenue_amount, incomeDesc, `scrap_sale:${newSaleId}`]);
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, $4)", [business_unit_id, cost_of_goods_sold, cogsDesc, `scrap_cogs:${newSaleId}`]);
        
        // 5. Update the destination cash safe (bank account)
        await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [revenue_amount, safe_id]);
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, sale_id) VALUES ($1, 'SALE_SCRAP', $2, $3, $4, $5)", [safe_id, revenue_amount, incomeDesc, user_id, newSaleId]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap sale processed successfully', saleId: newSaleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Sell Transaction Error:', err.message);
        res.status(500).send({ msg: err.message || 'Server error' });
    } finally {
        client.release();
    }
});
// Add these new routes to backend/routes/scrapyard.js

// @route   POST api/scrapyard/buyers
// @desc    Create a new bulk buyer
// @access  Private
router.post('/buyers', authMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        const newBuyer = await db.query("INSERT INTO bulk_buyers (name) VALUES ($1) RETURNING *", [name]);
        res.status(201).json(newBuyer.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/scrapyard/buyers/:id
// @desc    Update a bulk buyer's name
// @access  Private
router.put('/buyers/:id', authMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        const updatedBuyer = await db.query("UPDATE bulk_buyers SET name = $1 WHERE id = $2 RETURNING *", [name, req.params.id]);
        res.json(updatedBuyer.rows[0]);
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

module.exports = router;