// backend/routes/purchaseOrders.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const VAT_RATE = 0.15; // Standard 15% VAT

// @route   POST api/purchase-orders
// @desc    Create a new purchase order with VAT calculation
router.post('/', authMiddleware, async (req, res) => {
    const { supplier_id, business_unit_id, items } = req.body;
    const user_id = req.user.id;
    if (!supplier_id || !business_unit_id || !items || !items.length) {
        return res.status(400).json({ msg: "Supplier, business unit, and items are required." });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // --- NEW VAT-AWARE CALCULATION FOR PURCHASES ---
        let total_cost_exclusive = 0;
        for (const item of items) {
            total_cost_exclusive += (parseFloat(item.cost_at_order) || 0) * (parseFloat(item.quantity) || 0);
        }
        const total_vat = total_cost_exclusive * VAT_RATE;
        const total_amount_inclusive = total_cost_exclusive + total_vat;
        
        // Use your existing `total_vat_amount` and `total_amount` columns
        const poQuery = `
            INSERT INTO purchase_orders (supplier_id, business_unit_id, user_id, total_amount, total_vat_amount, status) 
            VALUES ($1, $2, $3, $4, $5, 'Draft') RETURNING id`;
        const poResult = await client.query(poQuery, [supplier_id, business_unit_id, user_id, total_amount_inclusive.toFixed(2), total_vat.toFixed(2)]);
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

// @route   GET api/purchase-orders/:poId/items
// @desc    Get just the line items for a specific Purchase Order
router.get('/:poId/items', authMiddleware, async (req, res) => {
    const { poId } = req.params;
    try {
        const query = `
            SELECT poi.product_id, poi.quantity, p.name as product_name
            FROM purchase_order_items poi
            JOIN products p ON poi.product_id = p.id
            WHERE poi.purchase_order_id = $1
            ORDER BY p.name;
        `;
        const itemsResult = await db.query(query, [poId]);
        res.json(itemsResult.rows);
    } catch (err) {
        console.error(`Get PO Items Error for ID ${poId}:`, err.message);
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

// @route   POST api/purchase-orders/:poId/receive
// @desc    Receive stock, update inventory, and create all financial records
router.post('/:poId/receive', authMiddleware, async (req, res) => {
    const { poId } = req.params;
    const { itemsReceived } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        const poRes = await client.query('SELECT supplier_id, business_unit_id FROM purchase_orders WHERE id = $1 FOR UPDATE', [poId]);
        if (poRes.rows.length === 0) { throw new Error("Purchase order not found."); }
        const { supplier_id, business_unit_id } = poRes.rows[0];

        let totalReceivedValue_Exclusive = 0;

        for (const receivedItem of itemsReceived) {
            const qty = parseFloat(receivedItem.quantity_received);
            if (isNaN(qty) || qty <= 0) continue;

            const poItemRes = await client.query('SELECT cost_at_order FROM purchase_order_items WHERE purchase_order_id = $1 AND product_id = $2', [poId, receivedItem.product_id]);
            if (poItemRes.rows.length === 0) { throw new Error(`Product ID ${receivedItem.product_id} is not on this PO.`); }
            
            const cost_at_order = parseFloat(poItemRes.rows[0].cost_at_order);
            const receivedValueExclusive = qty * cost_at_order;
            totalReceivedValue_Exclusive += receivedValueExclusive;

            // Log the individual item receipt for auditing
            await client.query(
                `INSERT INTO purchase_order_receipts (purchase_order_id, product_id, quantity_received, received_by_user_id) VALUES ($1, $2, $3, $4)`,
                [poId, receivedItem.product_id, qty, user_id]
            );

            // Update product stock and WAC
            const productRes = await client.query('SELECT quantity_on_hand, cost_price FROM products WHERE id = $1 FOR UPDATE', [receivedItem.product_id]);
            const { quantity_on_hand, cost_price } = productRes.rows[0];
            const oldTotalValue = parseFloat(quantity_on_hand) * parseFloat(cost_price);
            const newTotalQty = parseFloat(quantity_on_hand) + qty;
            const newWac = newTotalQty > 0 ? (oldTotalValue + receivedValueExclusive) / newTotalQty : cost_at_order;
            await client.query('UPDATE products SET quantity_on_hand = $1, cost_price = $2 WHERE id = $3', [newTotalQty, newWac.toFixed(4), receivedItem.product_id]);
        }

        // --- Correct VAT-Aware Financial Logic (moved outside the loop) ---
        const totalVatOnPurchase = totalReceivedValue_Exclusive * VAT_RATE;
        const totalPayableAmount_Inclusive = totalReceivedValue_Exclusive + totalVatOnPurchase;

        // 1. Update supplier's balance with the FULL inclusive amount
        await client.query('UPDATE suppliers SET account_balance = account_balance + $1 WHERE id = $2', [totalPayableAmount_Inclusive, supplier_id]);
        
        // 2. Create an INVENTORY_ACQUIRED transaction for the EXCLUSIVE value of the goods
        const invDescription = `Received stock for PO #${poId}`;
        await client.query(
            `INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, supplier_id)
             VALUES ($1, $2, 'INVENTORY_ACQUIRED', $3, $4, $5)`,
            [business_unit_id, totalReceivedValue_Exclusive, invDescription, `po_receipt:${poId}`, supplier_id]
        );
        
        // 3. Create a VAT_CLAIMABLE transaction for the VAT portion
        const vatDescription = `VAT claimable on stock received for PO #${poId}`;
        await client.query(
            `INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, supplier_id)
             VALUES ($1, $2, 'VAT_CLAIMABLE', $3, $4, $5)`,
            [business_unit_id, totalVatOnPurchase, vatDescription, `po_receipt_vat:${poId}`, supplier_id]
        );
        
        await client.query("UPDATE purchase_orders SET status = 'Received' WHERE id = $1", [poId]);
        
        await client.query('COMMIT');
        res.status(200).json({ msg: "Stock received successfully and financials updated." });

    } catch(err) {
        await client.query('ROLLBACK');
        console.error("Receive Stock Error:", err.message);
        res.status(400).send({ msg: err.message || "An unexpected error occurred." });
    } finally {
        client.release();
    }
});

module.exports = router;