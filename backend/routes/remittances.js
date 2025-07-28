// backend/routes/remittances.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/remittances/:purchaseId
// @desc    Get all data needed for a single payment remittance slip
// @access  Private
router.get('/:purchaseId', authMiddleware, async (req, res) => {
    const { purchaseId } = req.params;
    try {
        const query = `
            SELECT 
                sp.id, sp.purchase_date, sp.payout_amount, sp.weight_kg,
                p.name as product_name, p.cost_price,
                s.name as supplier_name,
                bu.name as business_unit_name, bu.address as business_unit_address, bu.phone as business_unit_phone
            FROM scrap_purchases sp
            JOIN products p ON sp.product_id = p.id
            LEFT JOIN suppliers s ON sp.supplier_id = s.id
            JOIN business_units bu ON p.business_unit_id = bu.id
            WHERE sp.id = $1
        `;
        const result = await db.query(query, [purchaseId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Purchase record not found' });
        }
        
        const row = result.rows[0];

        const remittanceData = {
            purchase_details: { id: row.id, purchase_date: row.purchase_date, payout_amount: row.payout_amount },
            item: { product_name: row.product_name, weight_kg: row.weight_kg, cost_price: row.cost_price },
            supplier_details: row.supplier_name ? { name: row.supplier_name } : null,
            business_unit_details: { name: row.business_unit_name, address: row.business_unit_address, phone: row.business_unit_phone }
        };

        res.json(remittanceData);
    } catch (err) {
        console.error("Remittance API Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;