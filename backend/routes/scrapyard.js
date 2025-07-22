const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/scrapyard/buyers
// @desc    Get the list of all configured bulk buyers
// @access  Private
router.get('/buyers', authMiddleware, async (req, res) => {
    try {
        const buyers = await db.query('SELECT * FROM bulk_buyers ORDER BY name');
        res.json(buyers.rows);
    } catch (err) {
        console.error("Get Bulk Buyers Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/scrapyard/buyers
// @desc    Create a new bulk buyer
// @access  Private
router.post('/buyers', authMiddleware, async (req, res) => {
    const { name } = req.body;
    try {
        const newBuyer = await db.query("INSERT INTO bulk_buyers (name) VALUES ($1) RETURNING *", [name]);
        res.status(201).json(newBuyer.rows[0]);
    } catch (err) {
        console.error("Create Bulk Buyer Error:", err.message);
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
        if (updatedBuyer.rows.length === 0) {
            return res.status(404).json({ msg: 'Buyer not found' });
        }
        res.json(updatedBuyer.rows[0]);
    } catch (err) {
        console.error("Update Bulk Buyer Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/scrapyard/buy
// @desc    Process buying a "cart" of scrap and calculate weighted average cost
// @access  Private
router.post('/buy', authMiddleware, async (req, res) => {
    const { business_unit_id, purchase_items, supplier_id, safe_id } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        let totalPayout = 0;

        for (const item of purchase_items) {
            const { product_id, weight_kg } = item;
            
            const productRes = await client.query('SELECT quantity_on_hand, average_cost_price, cost_price FROM products WHERE id = $1 FOR UPDATE', [product_id]);
            const product = productRes.rows[0];
            const current_stock_kg = parseFloat(product.quantity_on_hand);
            const current_avg_cost = parseFloat(product.average_cost_price);
            const purchase_cost_per_kg = parseFloat(product.cost_price);

            const current_stock_value = current_stock_kg * current_avg_cost;
            const purchase_value = weight_kg * purchase_cost_per_kg;
            const new_total_stock_kg = current_stock_kg + weight_kg;
            
            // Calculate new average, handle division by zero if it's the first purchase
            const new_avg_cost = new_total_stock_kg > 0 ? (current_stock_value + purchase_value) / new_total_stock_kg : 0;

            await client.query(
                'UPDATE products SET quantity_on_hand = $1, average_cost_price = $2 WHERE id = $3',
                [new_total_stock_kg, new_avg_cost.toFixed(2), product_id]
            );
            
            const payout_amount = purchase_cost_per_kg * weight_kg;
            totalPayout += payout_amount;
            await client.query('INSERT INTO scrap_purchases (user_id, product_id, weight_kg, payout_amount, supplier_id) VALUES ($1, $2, $3, $4, $5)', [user_id, product_id, weight_kg, payout_amount, supplier_id || null]);
        }
        
        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [safe_id]);
        if (sourceSafe.rows.length === 0 || parseFloat(sourceSafe.rows[0].current_balance) < totalPayout) {
            throw new Error('Insufficient funds in the source safe.');
        }
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [totalPayout, safe_id]);
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'PAYOUT_CASH', $2, $3, $4)", [safe_id, -totalPayout, `Scrap Payout`, user_id]);
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, 'pop')", [business_unit_id, totalPayout, `Scrap Purchase Payout`]);
        
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

// @route   POST api/scrapyard/sell
// @desc    Process selling scrap in bulk with COGS, buyers, and treasury
// @access  Private
router.post('/sell', authMiddleware, async (req, res) => {
    const { business_unit_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const productRes = await client.query('SELECT average_cost_price FROM products WHERE id = $1', [product_id]);
        if (productRes.rows.length === 0) throw new Error("Product not found");
        const avg_cost = parseFloat(productRes.rows[0].average_cost_price);
        const cost_of_goods_sold = avg_cost * weight_kg;

        await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [weight_kg, product_id]);

        const saleResult = await client.query(
            `INSERT INTO scrap_sales (user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number, cost_of_goods_sold) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
            [user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number, cost_of_goods_sold]
        );
        const newScrapSaleId = saleResult.rows[0].id;

        const incomeDesc = `Bulk Scrap Sale #${newScrapSaleId}`;
        const cogsDesc = `COGS for Bulk Scrap Sale #${newScrapSaleId}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, revenue_amount, incomeDesc, `scrap_sale:${newScrapSaleId}`]);
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, $4)", [business_unit_id, cost_of_goods_sold, cogsDesc, `scrap_cogs:${newScrapSaleId}`]);
        
        await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [revenue_amount, safe_id]);
        
        // Corrected cash ledger entry for scrap sales
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, scrap_sale_id) VALUES ($1, 'SALE_SCRAP', $2, $3, $4, $5)", [safe_id, revenue_amount, incomeDesc, user_id, newScrapSaleId]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap sale processed successfully', saleId: newScrapSaleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Sell Transaction Error:', err.message);
        res.status(500).send({ msg: err.message || 'Server error' });
    } finally {
        client.release();
    }
});

module.exports = router;