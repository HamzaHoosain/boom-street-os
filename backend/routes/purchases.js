// backend/routes/purchases.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/purchases/:id
// @desc    Get details for a single scrap purchase (for remittance)
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const purchaseQuery = `
            SELECT 
                sp.*, 
                p.name as product_name, 
                s.name as supplier_name,
                b.name as business_unit_name
            FROM scrap_purchases sp
            JOIN products p ON sp.product_id = p.id
            LEFT JOIN suppliers s ON sp.supplier_id = s.id
            -- We need to find the business unit through the transaction table
            JOIN transactions t ON t.source_reference = CONCAT('scrap_purchase:', sp.id)
            JOIN business_units b ON t.business_unit_id = b.id
            WHERE sp.id = $1
        `;
        const purchaseResult = await db.query(purchaseQuery, [id]);

        if (purchaseResult.rows.length === 0) {
            return res.status(404).json({ msg: "Purchase record not found" });
        }
        
        // For a multi-item purchase, we may need to fetch all items associated with the transaction
        const mainPurchase = purchaseResult.rows[0];

        // This response structure is what RemittancePage.js will expect
        const remittanceData = {
            purchase_details: mainPurchase,
            line_items: [mainPurchase], // In this simple model, there's only one line item per purchase record
            business_unit_details: { name: mainPurchase.business_unit_name },
            supplier_details: mainPurchase.supplier_name ? { name: mainPurchase.supplier_name } : null,
        };
        
        res.json(remittanceData);

    } catch (err) {
        console.error(`Get Remittance Error for ID ${id}:`, err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;