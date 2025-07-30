// backend/routes/products.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/products
// @desc    Add a new product to inventory, now with all required fields
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    // Correctly destructure all necessary fields from the request body
    const { 
        business_unit_id, name, sku, quantity_on_hand, unit_type, 
        cost_price, selling_price, category_id 
    } = req.body;

    // Add checks for required fields
    if (!business_unit_id || !name || !unit_type || !selling_price || !cost_price) {
        return res.status(400).json({ msg: 'Missing required fields: business_unit_id, name, unit_type, prices.' });
    }

    try {
        const newProduct = await db.query(
            'INSERT INTO products (business_unit_id, name, sku, quantity_on_hand, unit_type, cost_price, selling_price, category_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [business_unit_id, name, sku || null, quantity_on_hand || 0, unit_type, cost_price, selling_price, category_id || null]
        );
        res.status(201).json(newProduct.rows[0]);
    } catch (err) {
        console.error("Create Product Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// @route   PUT api/products/:id
// @desc    Update a product's details, now with all required fields
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    const productId = req.params.id;
    // Correctly destructure all necessary fields from the request body
    const { 
        name, sku, cost_price, selling_price, supplier_id, category_id, unit_type 
    } = req.body;

    try {
        const updatedProduct = await db.query(
            `UPDATE products 
             SET name = $1, sku = $2, cost_price = $3, selling_price = $4, supplier_id = $5, category_id = $6, unit_type = $7 
             WHERE id = $8 RETURNING *`,
            [name, sku || null, cost_price, selling_price, supplier_id || null, category_id || null, unit_type, productId]
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


// @route   GET api/products/overview/all
// @desc    Get a simplified list of all products from all business units
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


// @route   GET api/products/alpha/:businessUnitId
// @desc    Get all products for a business, sorted alphabetically
router.get('/alpha/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `SELECT * FROM products WHERE business_unit_id = $1 ORDER BY name ASC`;
        const products = await db.query(query, [businessUnitId]);
        res.json(products.rows);
    } catch (err) {
        console.error("Get Alpha Products Error:", err.message);
        res.status(500).send("Server Error");
     }
});


// @route   GET api/products/:businessUnitId
// @desc    Get all products for a business, intelligently sorted by popularity (main POS route)
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `
            SELECT
                p.id, p.business_unit_id, p.name, p.sku, p.unit_type,
                p.cost_price, p.selling_price, p.quantity_on_hand,
                p.category_id, p.image_url,
                COALESCE(SUM(si.quantity_sold), 0) AS total_quantity_sold
            FROM
                products p
            LEFT JOIN
                sale_items si ON p.id = si.product_id
            WHERE
                p.business_unit_id = $1
            GROUP BY
                p.id
            ORDER BY
                total_quantity_sold DESC,
                p.name ASC;
        `;
        const products = await db.query(query, [businessUnitId]);
        res.json(products.rows);
    } catch (err) {
        console.error("Get Products Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// Any image upload route would also go here.

module.exports = router;