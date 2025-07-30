// backend/routes/transactions.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/transactions
// @desc    Get all transactions for a business, with filtering and summaries
router.get('/', authMiddleware, async (req, res) => {
    // This main route for fetching the list is correct and remains unchanged.
    const { businessUnitId, startDate, endDate, type } = req.query;
    if (!businessUnitId) { return res.status(400).json({ msg: "Business Unit ID is required." }); }
    try {
        let queryParams = [businessUnitId];
        let baseQuery = `SELECT t.*, c.name as customer_name, s.name as supplier_name FROM transactions t LEFT JOIN customers c ON t.customer_id = c.id LEFT JOIN suppliers s ON t.supplier_id = s.id WHERE t.business_unit_id = $1`;
        let paramIndex = 2;
        if (startDate) { baseQuery += ` AND t.transaction_date >= $${paramIndex++}`; queryParams.push(startDate); }
        if (endDate) {
            const inclusiveEndDate = new Date(endDate);
            inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
            baseQuery += ` AND t.transaction_date < $${paramIndex++}`;
            queryParams.push(inclusiveEndDate.toISOString().split('T')[0]);
        }
        if (type) { baseQuery += ` AND t.type = $${paramIndex++}`; queryParams.push(type); }
        baseQuery += ' ORDER BY t.transaction_date DESC, t.id DESC';
        const transactionsResult = await db.query(baseQuery, queryParams);
        
        let summaryQueryParams = [businessUnitId];
        let summaryBaseQuery = `SELECT type, SUM(amount) as total FROM transactions WHERE business_unit_id = $1`;
        let summaryParamIndex = 2;
        if (startDate) { summaryBaseQuery += ` AND transaction_date >= $${summaryParamIndex++}`; summaryQueryParams.push(startDate); }
        if (endDate) {
            const inclusiveEndDate = new Date(endDate);
            inclusiveEndDate.setDate(inclusiveEndDate.getDate() + 1);
            summaryBaseQuery += ` AND transaction_date < $${summaryParamIndex++}`;
            summaryQueryParams.push(inclusiveEndDate.toISOString().split('T')[0]);
        }
        summaryBaseQuery += ' GROUP BY type';
        const summaryResult = await db.query(summaryBaseQuery, summaryQueryParams);
        
        let totalIncome = 0;
        let totalExpense = 0;
        summaryResult.rows.forEach(row => {
            if (row.type.includes('INCOME')) { totalIncome += parseFloat(row.total); } 
            else if (row.type.includes('EXPENSE')) { totalExpense += Math.abs(parseFloat(row.total)); }
        });
        
        res.json({
            transactions: transactionsResult.rows,
            summary: { totalIncome: totalIncome.toFixed(2), totalExpense: totalExpense.toFixed(2) }
        });
    } catch (err) {
        console.error("Get Transactions Error:", err.message);
        res.status(500).send('Server Error');
    }
});


// --- THIS IS THE DEFINITIVELY CORRECTED DRILL-DOWN ROUTE ---
// @route   GET api/transactions/details/:id
// @desc    Get rich contextual details for a single transaction
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

        if (sourceRef && sourceRef.startsWith('sale:')) {
            const saleId = sourceRef.split(':')[1];
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
            // CRITICAL FIX: Correctly parse multiple IDs
            const purchaseIdString = sourceRef.split(':')[1];
            const purchaseIds = purchaseIdString.split(',').map(id => parseInt(id));

            // CRITICAL FIX: Use the 'ANY' operator to find ALL matching purchases
            const purchaseQuery = `
                SELECT sp.*, p.name as product_name, s.name as supplier_name
                FROM scrap_purchases sp
                JOIN products p ON sp.product_id = p.id
                LEFT JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.id = ANY($1::int[])
            `;
            const purchaseRes = await db.query(purchaseQuery, [purchaseIds]);
            
            // Re-assemble the data for the frontend
            const totalPayout = purchaseRes.rows.reduce((sum, item) => sum + parseFloat(item.payout_amount), 0);
            details = { 
                type: 'Scrap Purchase', 
                supplier_name: purchaseRes.rows[0]?.supplier_name || 'Walk-in',
                items: purchaseRes.rows.map(item => ({
                    product_name: item.product_name,
                    weight_kg: item.weight_kg,
                    payout_amount: item.payout_amount
                })),
                total_payout: totalPayout
            };
        
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