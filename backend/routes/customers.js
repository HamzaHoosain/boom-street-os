// backend/routes/customers.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/customers
// @desc    Create a new customer for a specific business unit
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    // CRITICAL FIX: The request body now includes business_unit_id
    const { name, phone_number, email, business_unit_id } = req.body; 
    
    if (!name || !business_unit_id) {
        return res.status(400).json({ msg: 'Customer name and business unit ID are required.' });
    }
    try {
        // The INSERT query now correctly includes business_unit_id
        const newCustomer = await db.query(
            "INSERT INTO customers (name, phone_number, email, business_unit_id) VALUES ($1, $2, $3, $4) RETURNING *",
            [name, phone_number || null, email || null, business_unit_id]
        );
        res.status(201).json(newCustomer.rows[0]);
    } catch (err) {
        console.error("CREATE CUSTOMER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});
// @route   GET api/customers
// @desc    Get all customers for a specific business (used for search modals)
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    // This route is correct and unchanged
    try {
        const { businessUnitId, search = '' } = req.query;
        if (!businessUnitId) {
            return res.status(400).json({ msg: "A businessUnitId is required to fetch customers." });
        }
        const query = `
            SELECT id, name, phone_number, email, account_balance 
            FROM customers 
            WHERE business_unit_id = $1 AND (name ILIKE $2 OR phone_number ILIKE $2) 
            ORDER BY name
        `;
        const customers = await db.query(query, [businessUnitId, `%${search}%`]);
        res.json(customers.rows);
    } catch (err) {
        console.error("GET CUSTOMERS ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/customers/:id
// @desc    Update a customer's contact details
// @access  Private
router.put('/:id', authMiddleware, async (req, res) => {
    // This route is correct and unchanged
    const { name, phone_number, email } = req.body;
    const { id } = req.params;
    if (!name) {
        return res.status(400).json({ msg: 'Customer name is required.' });
    }
    try {
        const updatedCustomer = await db.query(
            "UPDATE customers SET name = $1, phone_number = $2, email = $3 WHERE id = $4 RETURNING *",
            [name, phone_number || null, email || null, id]
        );
        if (updatedCustomer.rows.length === 0) {
            return res.status(404).json({ msg: 'Customer not found' });
        }
        res.json(updatedCustomer.rows[0]);
    } catch (err) {
        console.error("UPDATE CUSTOMER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- THIS IS THE NEW ROUTE THAT WAS MISSING ---
// @route   GET api/customers/:id/details
// @desc    Get all special data for a single customer (favourites, custom prices)
// @access  Private
router.get('/:id/details', authMiddleware, async (req, res) => {
    try {
        const { id: customerId } = req.params;

        // Fetch custom prices and favourite products in parallel for efficiency
        const [pricesResult, favouritesResult] = await Promise.all([
            db.query(
                'SELECT product_id, custom_price FROM customer_product_prices WHERE customer_id = $1', 
                [customerId]
            ),
            db.query(
                'SELECT product_id FROM customer_favourite_products WHERE customer_id = $1',
                [customerId]
            )
        ]);
        
        // The frontend expects an array of product IDs, not objects.
        const favouriteProductIds = favouritesResult.rows.map(row => row.product_id);

        // Assemble the final JSON object in the exact structure the frontend expects
        res.json({
            customPrices: pricesResult.rows,
            favouriteProductIds: favouriteProductIds
        });

    } catch (err) {
        console.error("GET CUSTOMER DETAILS ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});
// --- END OF NEW ROUTE ---


// @route   GET api/customers/:id
// @desc    Get basic details for a single customer (used for CustomerDetailsPage)
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
    // This route is correct and unchanged
    try {
        const customer = await db.query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
        if (customer.rows.length === 0) {
            return res.status(404).json({ msg: 'Customer not found' });
        }
        res.json(customer.rows[0]);
    } catch (err) {
        console.error("GET CUSTOMER DETAILS ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/customers/:id/history
// @desc    Get the full purchase history for a single customer
// @access  Private
router.get('/:id/history', authMiddleware, async (req, res) => {
    try {
        const history = await db.query(
            'SELECT id, sale_date, total_amount, payment_status, amount_paid FROM sales WHERE customer_id = $1 ORDER BY sale_date DESC',
            [req.params.id]
        );
        res.json(history.rows);
    } catch (err) {
        console.error("GET CUSTOMER HISTORY ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- NEW ROUTE to get only UNPAID invoices for a customer ---
// @route   GET api/customers/:id/unpaid
// @desc    Get a list of unpaid or partially paid invoices for a customer
// @access  Private
router.get('/:id/unpaid', authMiddleware, async (req, res) => {
    try {
        const unpaidSales = await db.query(
            `SELECT id, sale_date, total_amount, amount_paid 
             FROM sales 
             WHERE customer_id = $1 AND (payment_status = 'On Account' OR payment_status = 'Partially Paid')
             ORDER BY sale_date ASC`, // Oldest invoices first
            [req.params.id]
        );
        res.json(unpaidSales.rows);
    } catch (err) {
        console.error("GET CUSTOMER UNPAID ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// --- OVERHAULED ROUTE to process a detailed payment allocation ---
// @route   POST api/customers/:id/payment
// @desc    Record a new payment and apply it to specific invoices
// @access  Private
router.post('/:id/payment', authMiddleware, async (req, res) => {
    const { id: customerId } = req.params;
    const { total_amount, safe_id, notes, business_unit_id, allocations } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create a single "parent" payment record
        const paymentQuery = `
            INSERT INTO customer_payments (customer_id, total_amount, safe_id, user_id, notes) 
            VALUES ($1, $2, $3, $4, $5) RETURNING id`;
        const paymentResult = await client.query(paymentQuery, [customerId, total_amount, safe_id, user_id, notes]);
        const newPaymentId = paymentResult.rows[0].id;

        // 2. Loop through each allocation and apply it
        for (const alloc of allocations) {
            const { sale_id, amount_applied } = alloc;
            await client.query('UPDATE sales SET amount_paid = amount_paid + $1 WHERE id = $2', [amount_applied, sale_id]);
            await client.query('INSERT INTO sale_payment_allocations (sale_id, payment_id, amount_applied) VALUES ($1, $2, $3)', [sale_id, newPaymentId, amount_applied]);
        }

        // 3. Recalculate and update the customer's total account balance
        const balanceResult = await client.query(
            `SELECT COALESCE(SUM(total_amount - amount_paid), 0) as new_balance
             FROM sales 
             WHERE customer_id = $1 AND payment_status IN ('On Account', 'Partially Paid')`,
            [customerId]
        );
        const newBalance = balanceResult.rows[0].new_balance;
        const updatedCustomer = await client.query('UPDATE customers SET account_balance = $1 WHERE id = $2 RETURNING *', [newBalance, customerId]);

        // 4. Update the cash safe and cash ledger
        await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [total_amount, safe_id]);
        const description = `Account payment from ${updatedCustomer.rows[0].name}. Notes: ${notes}`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id, payment_id) VALUES ($1, 'ACCOUNT_PAYMENT', $2, $3, $4, $5)", [safe_id, total_amount, description, user_id, newPaymentId]);

        // 5. Update the master transaction ledger
        const paymentDescription = `Account payment from Customer ID #${customerId}`;
        await client.query(
            "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference, customer_id) VALUES ($1, $2, 'INCOME', $3, $4, $5)",
            [business_unit_id, total_amount, paymentDescription, `customer_payment:${newPaymentId}`, customerId]
        );
        // 6. Loop back through the affected invoices to update their final status
        for (const alloc of allocations) {
            const sale_id = alloc.sale_id;
            const saleRes = await client.query('SELECT total_amount, amount_paid FROM sales WHERE id = $1', [sale_id]);
            const sale = saleRes.rows[0];
            if (parseFloat(sale.amount_paid) >= parseFloat(sale.total_amount)) {
                await client.query("UPDATE sales SET payment_status = 'Paid' WHERE id = $1", [sale_id]);
            } else {
                await client.query("UPDATE sales SET payment_status = 'Partially Paid' WHERE id = $1", [sale_id]);
            }
        }

         await client.query('COMMIT');
        res.json(updatedCustomer.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Record Payment Error:", err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;