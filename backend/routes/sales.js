// backend/routes/sales.js - FINAL SIMPLIFIED VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/sales
// @desc    Process a new sale with simplified payment method tracking (NO FEES)
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, total_amount, customer_id, payment } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create the main sale record
        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount, customer_id) VALUES ($1, $2, $3, $4) RETURNING id';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount, customer_id || null]);
        const newSaleId = saleResult.rows[0].id;
        
        // 2. Loop through cart items and update product stock
        for (const item of cart_items) {
            await client.query('INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale) VALUES ($1, $2, $3, $4)', [newSaleId, item.id, item.quantity, item.selling_price]);
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        // 3. Create the main INCOME transaction for the full sale amount
        const incomeDescription = `Sale #${newSaleId} via ${payment.method}` + (payment.terminal_name ? ` (${payment.terminal_name})` : '');
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, total_amount, incomeDescription, `sale:${newSaleId}`]);
        
        // 4. If a safe_id is provided, update its balance and log to the cash ledger
        if (payment.safe_id) {
            console.log(`Attempting to update safe ID: ${payment.safe_id} with amount: ${total_amount}`);
            const updateResult = await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [total_amount, payment.safe_id]);
            
            if (updateResult.rowCount === 0) {
                throw new Error(`Invalid safe_id provided: ${payment.safe_id}`);
            }

            await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, sale_id) VALUES ($1, $2, $3, $4, $5, $6)", [payment.safe_id, `SALE_${payment.method}`, total_amount, `Sale #${newSaleId}`, user_id, newSaleId]);
        }

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Sale processed successfully', saleId: newSaleId });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sale Transaction Error:', err.message);
        res.status(500).send({ msg: err.message });
    } finally {
        client.release();
    }
});


// GET route for unified sales history
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    const isOverview = businessUnitId === 'overview';
    try {
        let salesResult;
        if (isOverview) {
            const query = `
                SELECT s.id, s.sale_date, s.total_amount, COALESCE(c.name, 'Cash Sale') AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, bu.name AS business_unit_name, 'Retail' as sale_type
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id JOIN users u ON s.user_id = u.id JOIN business_units bu ON s.business_unit_id = bu.id
                UNION ALL
                SELECT ss.id, ss.sale_date, ss.revenue_amount as total_amount, 'Scrap Buyer' AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, bu.name AS business_unit_name, 'Scrap' as sale_type
                FROM scrap_sales ss
                JOIN users u ON ss.user_id = u.id JOIN business_units bu ON bu.id = 2
                ORDER BY sale_date DESC
            `;
            salesResult = await db.query(query);
        } else {
            const query = `
                SELECT s.id, s.sale_date, s.total_amount, COALESCE(c.name, 'Cash Sale') AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, 'Retail' as sale_type
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id JOIN users u ON s.user_id = u.id
                WHERE s.business_unit_id = $1
                UNION ALL
                SELECT ss.id, ss.sale_date, ss.revenue_amount as total_amount, 'Scrap Buyer' AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, 'Scrap' as sale_type
                FROM scrap_sales ss
                JOIN users u ON ss.user_id = u.id
                WHERE 2 = $1
                ORDER BY sale_date DESC
            `;
            salesResult = await db.query(query, [businessUnitId]);
        }
        res.json(salesResult.rows);
    } catch (err) {
        console.error("Get Sales History Error:", err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router;