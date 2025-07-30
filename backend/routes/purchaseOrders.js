// backend/routes/purchaseOrders.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/purchase-orders
// @desc    Create a new purchase order
router.post('/', authMiddleware, async (req, res) => {
    const { supplier_id, business_unit_id, items } = req.body;
    const user_id = req.user.id;
    if (!supplier_id || !business_unit_id || !items || items.length === 0) {
        return res.status(400).json({ msg: "Supplier, business unit, and at least one item are required." });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let total_amount = 0;
        for (const item of items) {
            total_amount += (parseFloat(item.cost_at_order) || 0) * (parseFloat(item.quantity) || 0);
        }
        const poQuery = `INSERT INTO purchase_orders (supplier_id, business_unit_id, user_id, total_amount) VALUES ($1, $2, $3, $4) RETURNING id`;
        const poResult = await client.query(poQuery, [supplier_id, business_unit_id, user_id, total_amount.toFixed(2)]);
        const newPurchaseOrderId = poResult.rows[0].id;
        for (const item of items) {
            const itemQuery = `INSERT INTO purchase_order_items (purchase_order_id, product_id, quantity, cost_at_order) VALUES ($1, $2, $3, $4)`;
            await client.query(itemQuery, [newPurchaseOrderId, item.product_id, item.quantity, item.cost_at_order]);
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newPurchaseOrderId, msg: 'Purchase Order created successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Purchase Order Error:", err.message);
        res.status(500).send('Server Error: Could not create purchase order.');
    } finally {
        client.release();
    }
});

// @route   GET api/purchase-orders/by-business/:businessUnitId
// @desc    Get all purchase orders for a specific business
router.get('/by-business/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `
            SELECT po.id, po.order_date, po.total_amount, po.status, s.name as supplier_name
            FROM purchase_orders po
            JOIN suppliers s ON po.supplier_id = s.id
            WHERE po.business_unit_id = $1
            ORDER BY po.order_date DESC
        `;
        const purchaseOrders = await db.query(query, [businessUnitId]);
        res.json(purchaseOrders.rows);
    } catch (err) {
        console.error("Get Purchase Orders Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/purchase-orders/:poId
// @desc    Get full details for a single PO, matching the invoice logic
router.get('/:poId', authMiddleware, async (req, res) => {
    const { poId } = req.params;
    try {
        const poResult = await db.query('SELECT * FROM purchase_orders WHERE id = $1', [poId]);
        if (poResult.rows.length === 0) {
            return res.status(404).json({ msg: "Purchase Order not found" });
        }
        const po_details = poResult.rows[0];
        
        const itemsResult = await db.query(
            `SELECT poi.*, p.name as product_name FROM purchase_order_items poi JOIN products p ON poi.product_id = p.id WHERE poi.purchase_order_id = $1`,
            [poId]
        );
        
        const businessUnitResult = await db.query('SELECT * FROM business_units WHERE id = $1', [po_details.business_unit_id]);
        
        let supplier_details = null;
        if (po_details.supplier_id) {
            const supplierResult = await db.query('SELECT * FROM suppliers WHERE id = $1', [po_details.supplier_id]);
            if (supplierResult.rows.length > 0) supplier_details = supplierResult.rows[0];
        }

        const poData = {
            po_details,
            line_items: itemsResult.rows,
            business_unit_details: businessUnitResult.rows[0] || null,
            supplier_details
        };

        res.json(poData);
    } catch (err) {
        console.error(`Get Single PO Error for ID ${poId}:`, err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;