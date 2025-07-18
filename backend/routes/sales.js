const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/sales
// @desc    Process a new RETAIL sale
// @access  Private
// This route remains unchanged as it's specific to the retail POS workflow.
router.post('/', authMiddleware, async (req, res) => {
    const { business_unit_id, cart_items, total_amount, customer_id } = req.body;
    const user_id = req.user.id;

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const saleQuery = 'INSERT INTO sales (business_unit_id, user_id, total_amount, customer_id) VALUES ($1, $2, $3, $4) RETURNING id';
        const saleResult = await client.query(saleQuery, [business_unit_id, user_id, total_amount, customer_id || null]);
        const newSaleId = saleResult.rows[0].id;

        for (const item of cart_items) {
            await client.query('INSERT INTO sale_items (sale_id, product_id, quantity_sold, price_at_sale) VALUES ($1, $2, $3, $4)', [newSaleId, item.id, item.quantity, item.selling_price]);
            await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [item.quantity, item.id]);
        }

        const description = `Sale #${newSaleId}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, total_amount, description, `sale:${newSaleId}`]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Sale processed successfully', saleId: newSaleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sale Transaction Error:', err.message);
        res.status(500).send('Server error during transaction');
    } finally {
        client.release();
    }
});


// @route   GET api/sales/:businessUnitId
// @desc    Get a COMBINED list of all sales (retail and scrap) for a business unit
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    const isOverview = businessUnitId === 'overview';

    try {
        let salesResult;
        // --- THIS IS THE NEW LOGIC ---
        if (isOverview) {
            // If the request is for the overview, combine sales from ALL business units
            const query = `
                SELECT s.id, s.sale_date, s.total_amount, COALESCE(c.name, 'Cash Sale') AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, bu.name AS business_unit_name, 'Retail' as sale_type
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                JOIN users u ON s.user_id = u.id
                JOIN business_units bu ON s.business_unit_id = bu.id
                UNION ALL
                SELECT ss.id, ss.sale_date, ss.revenue_amount as total_amount, 'Scrap Buyer' AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, bu.name AS business_unit_name, 'Scrap' as sale_type
                FROM scrap_sales ss
                JOIN users u ON ss.user_id = u.id
                JOIN business_units bu ON bu.id = 2 -- Assuming scrap sales always belong to business unit 2
                ORDER BY sale_date DESC
            `;
            salesResult = await db.query(query);
        } else {
            // Otherwise, get combined sales for only the SPECIFIC business unit
            const query = `
                SELECT s.id, s.sale_date, s.total_amount, COALESCE(c.name, 'Cash Sale') AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, 'Retail' as sale_type
                FROM sales s
                LEFT JOIN customers c ON s.customer_id = c.id
                JOIN users u ON s.user_id = u.id
                WHERE s.business_unit_id = $1
                UNION ALL
                SELECT ss.id, ss.sale_date, ss.revenue_amount as total_amount, 'Scrap Buyer' AS customer_name, u.first_name || ' ' || u.last_name AS cashier_name, 'Scrap' as sale_type
                FROM scrap_sales ss
                JOIN users u ON ss.user_id = u.id
                WHERE 2 = $1 -- Only include scrap sales if the selected business is Paradise Scrap (ID 2)
                ORDER BY sale_date DESC
            `;
            salesResult = await db.query(query, [businessUnitId]);
        }
        // --- END OF NEW LOGIC ---

        res.json(salesResult.rows);

    } catch (err) {
        console.error("Get Sales History Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;