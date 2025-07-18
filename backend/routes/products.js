// backend/routes/products.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/products
// @desc    Add a new product to inventory
// @access  Private (requires token)
router.post('/', authMiddleware, async (req, res) => {
    // We will enhance this later to get business_unit_id from the user's role
    const { business_unit_id, name, sku, quantity_on_hand, unit_type, cost_price, selling_price } = req.body;

    try {
        const newProduct = await db.query(
            'INSERT INTO products (business_unit_id, name, sku, quantity_on_hand, unit_type, cost_price, selling_price) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [business_unit_id, name, sku, quantity_on_hand, unit_type, cost_price, selling_price]
        );
        res.status(201).json(newProduct.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
router.get('/overview/all', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT p.*, bu.name as business_unit_name 
            FROM products p
            JOIN business_units bu ON p.business_unit_id = bu.id
            ORDER BY bu.name, p.name
        `;
        const products = await db.query(query);
        res.json(products.rows);
    } catch (err) {
        console.error("Product Overview Error:", err.message);
        res.status(500).send('Server Error');
    }
});
// @route   GET api/products/single/:id
// @desc    Get a single product by its ID
// @access  Private
router.get('/single/:id', authMiddleware, async (req, res) => {
    try {
        const product = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
        if (product.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }
        res.json(product.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route   GET api/products
// @desc    Get all products for a business unit
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    try {
        const products = await db.query('SELECT * FROM products WHERE business_unit_id = $1 ORDER BY name', [req.params.businessUnitId]);
        res.json(products.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});
// @route   PUT api/products/:id
// @desc    Update a product's details
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    const productId = req.params.id;
    // We only allow updating these specific fields for now
    const { name, sku, cost_price, selling_price, supplier_id } = req.body;

    try {
        const updatedProduct = await db.query(
            `UPDATE products 
             SET name = $1, sku = $2, cost_price = $3, selling_price = $4, supplier_id = $5 
             WHERE id = $6 RETURNING *`,
            [name, sku, cost_price, selling_price, supplier_id, productId]
        );

        if (updatedProduct.rows.length === 0) {
            return res.status(404).json({ msg: 'Product not found' });
        }

        res.json(updatedProduct.rows[0]);
    } catch (err) {
        console.error("Update Product Error:", err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;