// backend/routes/salesOrders.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const VAT_RATE = 0.15;

// @route   POST api/sales-orders
// @desc    Create a new sales order
// This route is correct and included for completeness.
router.post('/', authMiddleware, async (req, res) => {
    const { customer_id, business_unit_id, items } = req.body;
    const user_id = req.user.id;
    if (!business_unit_id || !items || !items.length) {
        return res.status(400).json({ msg: "Business unit and at least one item are required." });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let total_amount_inclusive = 0;
        for (const item of items) {
            total_amount_inclusive += (parseFloat(item.price_at_order) || 0) * (parseFloat(item.quantity) || 0);
        }
        const subtotal_exclusive = total_amount_inclusive / (1 + VAT_RATE);
        const total_vat = total_amount_inclusive - subtotal_exclusive;
        const soQuery = `INSERT INTO sales_orders (customer_id, business_unit_id, user_id, subtotal, total_vat, total_amount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const soResult = await client.query(soQuery, [customer_id || null, business_unit_id, user_id, subtotal_exclusive.toFixed(2), total_vat.toFixed(2), total_amount_inclusive.toFixed(2)]);
        const newSalesOrderId = soResult.rows[0].id;
        for (const item of items) {
            const itemQuery = `INSERT INTO sales_order_items (sales_order_id, product_id, quantity, price_at_order) VALUES ($1, $2, $3, $4)`;
            await client.query(itemQuery, [newSalesOrderId, item.product_id, item.quantity, item.price_at_order]);
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newSalesOrderId, msg: 'Sales Order created successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Sales Order Error:", err.message);
        res.status(500).send('Server Error: Could not create sales order.');
    } finally {
        client.release();
    }
});

// @route   GET api/sales-orders/by-business/:businessUnitId
// @desc    Get all sales orders for a specific business
// This route is correct and included for completeness.
router.get('/by-business/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `
            SELECT so.id, so.order_date, so.total_amount, so.status, c.name as customer_name
            FROM sales_orders so
            LEFT JOIN customers c ON so.customer_id = c.id
            WHERE so.business_unit_id = $1
            ORDER BY so.order_date DESC
        `;
        const salesOrders = await db.query(query, [businessUnitId]);
        res.json(salesOrders.rows);
    } catch (err) {
        console.error("Get Sales Orders Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// --- THIS IS THE CORRECTED ROUTE ---
// @route   GET api/sales-orders/:soId
// @desc    Get full details for a single SO for printing
router.get('/:soId', authMiddleware, async (req, res) => {
    const { soId } = req.params;
    try {
        const soResult = await db.query('SELECT * FROM sales_orders WHERE id = $1', [soId]);
        if (soResult.rows.length === 0) {
            return res.status(404).json({ msg: "Sales Order not found" });
        }
        const so_details = soResult.rows[0];
        
        const itemsResult = await db.query(
            `SELECT soi.*, p.name as product_name FROM sales_order_items soi JOIN products p ON soi.product_id = p.id WHERE soi.sales_order_id = $1`,
            [soId]
        );
        
        const businessUnitResult = await db.query('SELECT * FROM business_units WHERE id = $1', [so_details.business_unit_id]);
        
        let customer_details = null;
        if (so_details.customer_id) {
            const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [so_details.customer_id]);
            if (customerResult.rows.length > 0) {
                customer_details = customerResult.rows[0];
            }
        }
        
        const soData = {
            so_details,
            line_items: itemsResult.rows,
            business_unit_details: businessUnitResult.rows[0] || null,
            customer_details
        };
        res.json(soData);
    } catch (err) {
        console.error(`Get Single SO Error for ID ${soId}:`, err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;