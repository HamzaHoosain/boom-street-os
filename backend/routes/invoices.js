// backend/routes/invoices.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/invoices/:saleId
// @desc    Get all data needed for a single invoice, including customer account summary
// @access  Private
router.get('/:saleId', authMiddleware, async (req, res) => {
    const { saleId } = req.params;

    try {
        // --- STEP 1: Get the core sale details and join the cashier's name ---
        const saleQuery = `
            SELECT 
                s.id, s.sale_date, s.total_amount, s.total_vat_amount, s.payment_method,
                s.customer_id, s.business_unit_id,
                u.first_name, u.last_name
            FROM sales s
            JOIN users u ON s.user_id = u.id
            WHERE s.id = $1
        `;
        const saleResult = await db.query(saleQuery, [saleId]);

        if (saleResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Sale not found' });
        }
        const sale_details = saleResult.rows[0];

        // --- STEP 2: Fetch associated line items ---
        const itemsQuery = `
            SELECT si.id, si.quantity_sold, si.price_at_sale, p.name as product_name
            FROM sale_items si
            JOIN products p ON si.product_id = p.id
            WHERE si.sale_id = $1
        `;
        const itemsResult = await db.query(itemsQuery, [saleId]);
        const line_items = itemsResult.rows;

        // --- STEP 3: Fetch the business unit details using business_unit_id from the sale ---
        const businessUnitQuery = 'SELECT * FROM business_units WHERE id = $1';
        const businessUnitResult = await db.query(businessUnitQuery, [sale_details.business_unit_id]);
        const business_unit_details = businessUnitResult.rows[0] || null;

        // --- STEP 4: Fetch detailed customer data ONLY IF a customer is linked to the sale ---
        let customer_details = null;
        let unpaid_invoices = [];

        if (sale_details.customer_id) {
            // Fetch the full customer record, which includes the NEW current balance
            const customerQuery = 'SELECT * FROM customers WHERE id = $1';
            const customerResult = await db.query(customerQuery, [sale_details.customer_id]);
            
            if (customerResult.rows.length > 0) {
                customer_details = customerResult.rows[0];
                
                // Calculate the customer's balance BEFORE this transaction
                const currentBalance = parseFloat(customer_details.account_balance);
                const saleTotal = parseFloat(sale_details.total_amount);
                const previousBalance = currentBalance - saleTotal;
                customer_details.previous_balance = previousBalance.toFixed(2); // Add the new field
            }

            // Fetch all OTHER unpaid invoices for this customer
            const unpaidQuery = `
                SELECT id FROM sales 
                WHERE customer_id = $1 
                  AND id != $2 
                  AND payment_status IN ('On Account', 'Partially Paid')
                ORDER BY id ASC
            `;
            const unpaidResult = await db.query(unpaidQuery, [sale_details.customer_id, saleId]);
            unpaid_invoices = unpaidResult.rows;
        }

        // --- STEP 5: Assemble the final, correctly structured response object ---
        const invoiceData = {
            sale_details,
            line_items,
            business_unit_details,
            customer_details, // This will be the full customer object (with previous_balance) or null
            unpaid_invoices   // This will be an array of other unpaid invoices, or an empty array
        };

        res.json(invoiceData);

    } catch (err) {
        console.error("Invoice API Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;