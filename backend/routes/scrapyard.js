// backend/routes/scrapyard.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/buy', authMiddleware, async (req, res) => {
    const { business_unit_id, purchase_items, safe_id, supplier_id } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        let total_payout = 0;
        const purchaseRecordIds = [];

        for (const item of purchase_items) {
            const productRes = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.product_id]);
            if (productRes.rows.length === 0) { throw new Error(`Product not found.`); }
            
            const cost_price = parseFloat(productRes.rows[0].cost_price);
            const payout_amount = cost_price * parseFloat(item.weight_kg);
            total_payout += payout_amount;
            
            const insertQuery = `INSERT INTO scrap_purchases (user_id, product_id, weight_kg, payout_amount, supplier_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
            const queryParams = [user_id, item.product_id, item.weight_kg, payout_amount, supplier_id || null];
            const purchaseResult = await client.query(insertQuery, queryParams);
            purchaseRecordIds.push(purchaseResult.rows[0].id);

            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand + $1 WHERE id = $2', [item.weight_kg, item.product_id]);
        }
        
        // This query will now SUCCEED because the 'account_balance' column exists.
        if (supplier_id) {
            await client.query(
                "UPDATE suppliers SET account_balance = account_balance + $1 WHERE id = $2",
                [total_payout, supplier_id]
            );
        }
        
        const safeRes = await client.query('SELECT name FROM cash_safes WHERE id=$1', [safe_id]);
        const safeName = safeRes.rows[0]?.name || 'Unknown Safe';
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [total_payout, safe_id]);
        const description = `Scrap Payout. Ref IDs: ${purchaseRecordIds.join(', ')}`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'SCRAP_PAYOUT', $2, $3, $4)", [safe_id, -total_payout, description, user_id]);
        const transactionDesc = `Scrap Payout from ${safeName}. Ref IDs: ${purchaseRecordIds.join(', ')}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, supplier_id) VALUES ($1, $2, 'EXPENSE', $3, $4, $5)", [business_unit_id, total_payout, transactionDesc, `scrap_purchase:${purchaseRecordIds.join(',')}`, supplier_id || null]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Payout processed successfully', total_payout: total_payout });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Scrap Buy Error:", err.message);
        res.status(500).send({ msg: 'Server error during scrap purchase. Check backend logs for details.' });
    } finally {
        client.release();
    }
});

router.post('/sell', authMiddleware, async (req, res) => {
    const { business_unit_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');
        
        const saleQuery = `INSERT INTO scrap_sales (user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const saleResult = await client.query(saleQuery, [user_id, product_id, weight_kg, revenue_amount, buyer_id, safe_id, invoice_number]);
        const newSaleId = saleResult.rows[0].id;
        
        await client.query("UPDATE customers SET account_balance = account_balance + $1 WHERE id = $2", [revenue_amount, buyer_id]);
        
        await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [weight_kg, product_id]);
        await client.query('UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2', [revenue_amount, safe_id]);
        const description = `Bulk Scrap Sale. Invoice: ${invoice_number || 'N/A'}. Ref Sale: ${newSaleId}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, customer_id) VALUES ($1, $2, 'INCOME', $3, $4, $5)", [business_unit_id, revenue_amount, description, `scrap_sale:${newSaleId}`, buyer_id]);
        
        await client.query('COMMIT');
        res.status(201).json({ msg: "Bulk sale processed successfully" });
        
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Scrap Sell Error:", err.message);
        res.status(500).send({ msg: 'Server error during bulk sale.' });
    } finally {
        client.release();
    }
});

module.exports = router;