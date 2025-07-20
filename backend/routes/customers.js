const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/customers
// @desc    Create a new customer
// @access  Private
router.post('/', authMiddleware, async (req, res) => {
    const { name, phone_number, email } = req.body;
    if (!name) {
        return res.status(400).json({ msg: 'Customer name is required.' });
    }
    try {
        const newCustomer = await db.query(
            "INSERT INTO customers (name, phone_number, email) VALUES ($1, $2, $3) RETURNING *",
            [name, phone_number || null, email || null]
        );
        res.status(201).json(newCustomer.rows[0]);
    } catch (err) {
        console.error("CREATE CUSTOMER ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/customers
// @desc    Get all customers with their account balance
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const searchTerm = req.query.search || '';
        const query = `
            SELECT id, name, phone_number, email, account_balance 
            FROM customers 
            WHERE name ILIKE $1 OR phone_number ILIKE $1 
            ORDER BY name
        `;
        const customers = await db.query(query, [`%${searchTerm}%`]);
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

// @route   GET api/customers/:id
// @desc    Get full details for a single customer
// @access  Private
router.get('/:id', authMiddleware, async (req, res) => {
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
            'SELECT id, sale_date, total_amount, payment_status FROM sales WHERE customer_id = $1 ORDER BY sale_date DESC',
            [req.params.id]
        );
        res.json(history.rows);
    } catch (err) {
        console.error("GET CUSTOMER HISTORY ERROR:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/customers/:id/payment
// @desc    Record a new payment against a customer's outstanding account balance
// @access  Private
router.post('/:id/payment', authMiddleware, async (req, res) => {
    const { id: customerId } = req.params;
    const { amount, safe_id, notes, business_unit_id } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Decrease the customer's account balance
        const updatedCustomer = await client.query(
            'UPDATE customers SET account_balance = account_balance - $1 WHERE id = $2 RETURNING *',
            [amount, customerId]
        );

        // 2. Increase the balance of the cash safe where the payment was received
        await client.query("UPDATE cash_safes SET current_balance = current_balance + $1 WHERE id = $2", [amount, safe_id]);

        // 3. Log this payment in the cash ledger
        const description = `Account payment from ${updatedCustomer.rows[0].name}. Notes: ${notes}`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'ACCOUNT_PAYMENT', $2, $3, $4)", [safe_id, amount, description, user_id]);

        // 4. Log this as a special "INCOME" transaction in the master financial ledger
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, amount, description, `customer_payment:${customerId}`]);

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