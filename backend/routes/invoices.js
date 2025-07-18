// backend/routes/invoices.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/invoices/:saleId
// @desc    Get all data needed for a single invoice
// @access  Private
router.get('/:saleId', authMiddleware, async (req, res) => {
    const { saleId } = req.params;
    try {
        // Use Promise.all to fetch sale details, customer details, and line items in parallel
        const [saleResult, itemsResult] = await Promise.all([
            db.query(
                `SELECT s.*, c.name as customer_name, c.phone_number as customer_phone, u.first_name, u.last_name
                 FROM sales s
                 LEFT JOIN customers c ON s.customer_id = c.id
                 JOIN users u ON s.user_id = u.id
                 WHERE s.id = $1`, 
                [saleId]
            ),
            db.query(
                `SELECT si.*, p.name as product_name, p.sku as product_sku
                 FROM sale_items si
                 JOIN products p ON si.product_id = p.id
                 WHERE si.sale_id = $1`,
                [saleId]
            )
        ]);

        if (saleResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Sale not found' });
        }

        const invoiceData = {
            sale_details: saleResult.rows[0],
            line_items: itemsResult.rows
        };

        res.json(invoiceData);

    } catch (err) {
        console.error("Invoice API Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;