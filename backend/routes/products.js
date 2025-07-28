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
// @route   GET api/products/:businessUnitId
// @desc    Get all products for a business, intelligently sorted by popularity
// @access  Private
router.get('/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        // --- THIS IS THE NEW, MORE POWERFUL SQL QUERY ---
        // It joins products with sale_items, sums the total quantity sold for each product,
        // and then orders the results by that total quantity in descending order.
        const query = `
            SELECT
                p.id,
                p.business_unit_id,
                p.name,
                p.sku,
                p.unit_type,
                p.cost_price,
                p.selling_price,
                p.quantity_on_hand,
                p.category_id,
                p.image_url,
                -- We use COALESCE to treat products never sold (NULL sum) as having a total of 0.
                COALESCE(SUM(si.quantity_sold), 0) AS total_quantity_sold
            FROM
                products p
            -- A LEFT JOIN is critical here. It ensures that products which have NEVER been sold
            -- are still included in the list (they will just have a popularity of 0).
            LEFT JOIN
                sale_items si ON p.id = si.product_id
            WHERE
                p.business_unit_id = $1
            GROUP BY
                p.id -- Group by the unique product ID to sum correctly
            ORDER BY
                total_quantity_sold DESC, -- Sort by most popular first
                p.name ASC; -- Then sort alphabetically for products with the same popularity
        `;

        const products = await db.query(query, [businessUnitId]);
        res.json(products.rows);
    } catch (err) {
        console.error("Get Products Error:", err.message);
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

// In backend/routes/products.js, add this new route
router.get('/alpha/:businessUnitId', authMiddleware, async (req, res) => {
    const { businessUnitId } = req.params;
    try {
        const query = `SELECT * FROM products WHERE business_unit_id = $1 ORDER BY name ASC`;
        const products = await db.query(query, [businessUnitId]);
        res.json(products.rows);
    } catch (err) { /* ... error handling ... */ }
});

module.exports = router;