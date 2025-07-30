// backend/routes/quotes.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

const VAT_RATE = 0.15;

// @route   POST api/quotes
// @desc    Create a new sales quote
router.post('/', authMiddleware, async (req, res) => {
    // This POST route is correct from the previous step. It is included here for completeness.
    const { customer_id, business_unit_id, items } = req.body;
    const user_id = req.user.id;

    if (!business_unit_id || !items || items.length === 0) {
        return res.status(400).json({ msg: "Business unit and at least one item are required." });
    }
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        let total_amount_inclusive = 0;
        for (const item of items) {
            total_amount_inclusive += (parseFloat(item.price_at_quote) || 0) * (parseFloat(item.quantity) || 0);
        }
        const subtotal_exclusive = total_amount_inclusive / (1 + VAT_RATE);
        const total_vat = total_amount_inclusive - subtotal_exclusive;
        const quoteQuery = `INSERT INTO quotes (customer_id, business_unit_id, user_id, subtotal, total_vat, total_amount) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`;
        const quoteResult = await client.query(quoteQuery, [customer_id || null, business_unit_id, user_id, subtotal_exclusive.toFixed(2), total_vat.toFixed(2), total_amount_inclusive.toFixed(2)]);
        const newQuoteId = quoteResult.rows[0].id;
        for (const item of items) {
            await client.query(`INSERT INTO quote_items (quote_id, product_id, quantity, price_at_quote) VALUES ($1, $2, $3, $4)`, [newQuoteId, item.product_id, item.quantity, item.price_at_quote]);
        }
        await client.query('COMMIT');
        res.status(201).json({ id: newQuoteId, msg: 'Quote created successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Quote Error:", err.message);
        res.status(500).send('Server Error: Could not create quote.');
    } finally {
        client.release();
    }
});

// --- NEW/MODIFIED ROUTES ---

// @route   GET api/quotes/by-business/:businessUnitId
// @desc    Get all quotes for a specific business
router.get('/by-business/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `
            SELECT q.id, q.quote_date, q.total_amount, q.status, c.name as customer_name
            FROM quotes q
            LEFT JOIN customers c ON q.customer_id = c.id
            WHERE q.business_unit_id = $1
            ORDER BY q.quote_date DESC
        `;
        const quotes = await db.query(query, [businessUnitId]);
        res.json(quotes.rows);
    } catch (err) {
        console.error("Get Quotes Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/quotes/:quoteId
// @desc    Get full details for a single quote, matching the invoice logic
router.get('/:quoteId', authMiddleware, async (req, res) => {
    const { quoteId } = req.params;
    try {
        const quoteResult = await db.query('SELECT * FROM quotes WHERE id = $1', [quoteId]);
        if (quoteResult.rows.length === 0) {
            return res.status(404).json({ msg: "Quote not found" });
        }
        const quote_details = quoteResult.rows[0];

        const itemsResult = await db.query(
            `SELECT qi.*, p.name as product_name FROM quote_items qi JOIN products p ON qi.product_id = p.id WHERE qi.quote_id = $1`,
            [quoteId]
        );
        
        const businessUnitResult = await db.query('SELECT * FROM business_units WHERE id = $1', [quote_details.business_unit_id]);
        
        let customer_details = null;
        if (quote_details.customer_id) {
            const customerResult = await db.query('SELECT * FROM customers WHERE id = $1', [quote_details.customer_id]);
            if (customerResult.rows.length > 0) customer_details = customerResult.rows[0];
        }

        const quoteData = {
            quote_details,
            line_items: itemsResult.rows,
            business_unit_details: businessUnitResult.rows[0] || null,
            customer_details
        };

        res.json(quoteData);
    } catch (err) {
        console.error(`Get Single Quote Error for ID ${quoteId}:`, err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;