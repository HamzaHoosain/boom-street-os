// backend/routes/transactions.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/transactions
// @desc    Get transactions with advanced filtering and calculated summaries
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
    try {
        const {
            businessUnitId,
            startDate,
            endDate,
            type
        } = req.query;

        if (!businessUnitId) {
            return res.status(400).json({ msg: 'Business Unit ID is required.' });
        }

        let query = `
            SELECT t.id, t.transaction_date, t.amount, t.type, t.description, t.source_reference, c.name as customer_name, s.name as supplier_name
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN suppliers s ON t.supplier_id = s.id
            WHERE t.business_unit_id = $1
        `;
        const queryParams = [businessUnitId];
        let paramIndex = 2;

        if (startDate) {
            query += ` AND t.transaction_date >= $${paramIndex++}`;
            queryParams.push(startDate);
        }
        if (endDate) {
            query += ` AND t.transaction_date <= $${paramIndex++}`;
            queryParams.push(endDate);
        }
        if (type) {
            query += ` AND t.type = $${paramIndex++}`;
            queryParams.push(type);
        }
        
        query += ' ORDER BY t.transaction_date DESC';

        // Fetch the filtered list of transactions
        const transactionsResult = await db.query(query, queryParams);

        // --- NEW: Calculate Summaries ---
        // We run a separate, more efficient query for summaries over the same period
        let summaryQuery = `
            SELECT 
                COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as totalIncome,
                COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as totalExpense
            FROM transactions
            WHERE business_unit_id = $1
        `;
        // Use the same parameters for the date/type filters
        const summaryParams = [...queryParams];
        
        const summaryResult = await db.query(summaryQuery, summaryParams);

        res.json({
            transactions: transactionsResult.rows,
            summary: summaryResult.rows[0]
        });

    } catch (err) {
        console.error("Get Transactions Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// --- NEW: The Drill-Down Route ---
// @route   GET api/transactions/details/:id
// @desc    Get rich contextual details for a single transaction
// @access  Private
router.get('/details/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const transactionRes = await db.query('SELECT * FROM transactions WHERE id = $1', [id]);
        if (transactionRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Transaction not found' });
        }
        const transaction = transactionRes.rows[0];
        const sourceRef = transaction.source_reference;

        let details = {};

        // Use the `source_reference` to determine where to get more details
        if (sourceRef && sourceRef.startsWith('sale:')) {
            const saleId = sourceRef.split(':')[1];
            // Re-use our powerful invoice query to get everything
            const invoiceQuery = `
                 SELECT s.*, c.name as customer_name, array_agg(json_build_object('name', p.name, 'qty', si.quantity_sold, 'price', si.price_at_sale)) as items
                 FROM sales s
                 LEFT JOIN customers c ON s.customer_id = c.id
                 JOIN sale_items si ON s.id = si.sale_id
                 JOIN products p ON si.product_id = p.id
                 WHERE s.id = $1
                 GROUP BY s.id, c.name
            `;
            const invoiceRes = await db.query(invoiceQuery, [saleId]);
            details = { type: 'Sale', ...invoiceRes.rows[0] };

        } else if (sourceRef && sourceRef.startsWith('scrap_purchase:')) {
            const purchaseId = sourceRef.split(':')[1];
            const purchaseQuery = `
                SELECT sp.*, p.name as product_name, s.name as supplier_name
                FROM scrap_purchases sp
                JOIN products p ON sp.product_id = p.id
                LEFT JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.id = $1
            `;
            const purchaseRes = await db.query(purchaseQuery, [purchaseId]);
            details = { type: 'Scrap Purchase', ...purchaseRes.rows[0] };
        
        } else if (sourceRef && sourceRef.startsWith('stock_take:')) {
            const stockTakeId = sourceRef.split(':')[1];
            const stockTakeQuery = `
                SELECT st.*, u.first_name || ' ' || u.last_name as user_name, array_agg(json_build_object('product', p.name, 'variance', sti.variance_qty, 'value', sti.variance_value)) as items
                FROM stock_takes st
                JOIN users u ON st.user_id = u.id
                JOIN stock_take_items sti ON st.id = sti.stock_take_id
                JOIN products p ON sti.product_id = p.id
                WHERE st.id = $1
                GROUP BY st.id, user_name
            `;
            const stockTakeRes = await db.query(stockTakeQuery, [stockTakeId]);
            details = { type: 'Stock Take', ...stockTakeRes.rows[0] };
        } else {
            details = { type: 'Generic', info: 'No further details available for this transaction type.' };
        }

        res.json({ transaction, details });

    } catch (err) {
        console.error("Get Transaction Details Error:", err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;