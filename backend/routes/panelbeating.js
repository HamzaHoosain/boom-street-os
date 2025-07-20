// backend/routes/panelbeating.js - FINAL COMPLETE VERSION
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/panelbeating/jobs
// @desc    Get all job cards
// @access  Private
// --- THIS IS THE NEW ROUTE ---
router.get('/jobs', authMiddleware, async (req, res) => {
    try {
        // In the future, we could add filtering by business_unit_id if you have more than one workshop
        const jobs = await db.query('SELECT * FROM jobs ORDER BY created_at DESC');
        res.json(jobs.rows);
    } catch (err) {
        console.error("Get Jobs Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/jobs/:id/items', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const items = await db.query(
            `SELECT ji.*, p.name as product_name 
             FROM job_items ji
             JOIN products p ON ji.product_id = p.id
             WHERE ji.job_id = $1`,
            [id]
        );
        res.json(items.rows);
    } catch (err) {
        console.error("Get Job Items Error:", err.message);
        res.status(500).send('Server Error');
    }
});
// --- END OF NEW ROUTE ---


// @route   POST api/panelbeating/jobs
// @desc    Create a new job card
// @access  Private
// This is your existing, correct code
router.post('/jobs', authMiddleware, async (req, res) => {
    const { customer_name, vehicle_details } = req.body;

    try {
        const newJob = await db.query(
            "INSERT INTO jobs (customer_name, vehicle_details, status) VALUES ($1, $2, 'In Progress') RETURNING *",
            [customer_name, vehicle_details]
        );
        res.status(201).json(newJob.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route   POST api/panelbeating/jobs/:id/items
// @desc    Add a consumable item to a specific job
// @access  Private
// This is your existing, correct code
router.post('/jobs/:id/items', authMiddleware, async (req, res) => {
    const jobId = req.params.id;
    const { product_id, quantity_used } = req.body;
    // Panel Beating is business_unit_id 4
    const business_unit_id = 4; 

    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get the product's current cost price
        const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [product_id]);
        if (productResult.rows.length === 0) {
            throw new Error('Product not found.');
        }
        const cost_price = productResult.rows[0].cost_price;
        const totalCost = cost_price * quantity_used;

        // 2. Add the item to the 'job_items' table
        const jobItemQuery = 'INSERT INTO job_items (job_id, product_id, quantity_used, cost_at_time_of_use) VALUES ($1, $2, $3, $4) RETURNING id';
        await client.query(jobItemQuery, [jobId, product_id, quantity_used, cost_price]);

        // 3. Decrement the stock from the 'products' table
        const updateStockQuery = 'UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2';
        await client.query(updateStockQuery, [quantity_used, product_id]);

        // 4. Log this consumption as an EXPENSE (Cost of Goods Sold) in the financial ledger
        const transactionQuery = 'INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, $3, $4, $5)';
        const description = `Parts for Job #${jobId}`;
        const sourceReference = `job:${jobId}`;
        await client.query(transactionQuery, [business_unit_id, totalCost, 'EXPENSE', description, sourceReference]);
        
        await client.query('COMMIT');
        res.status(201).json({ msg: 'Item successfully added to job' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Add Job Item Transaction Error:', err.message);
        res.status(500).send('Server error while adding item to job');
    } finally {
        client.release();
    }
});


module.exports = router;