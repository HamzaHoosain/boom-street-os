// backend/routes/transactions.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET /api/transactions
// @desc    Get all transactions for a business, with filtering and summaries
router.get('/', authMiddleware, async (req, res) => {
    const { businessUnitId, startDate, endDate, type } = req.query;
    if (!businessUnitId) { return res.status(400).json({ msg: "Business Unit ID is required." }); }

     try {
        let queryParams = [businessUnitId];
        
        // --- THIS IS THE DEFINITIVE, ROBUST QUERY ---
        let baseQuery = `
            SELECT 
                t.id, t.transaction_date, t.description, t.type, t.amount, t.source_reference,
                c.name as customer_name,
                s.name as supplier_name,
                -- We use a subquery in the SELECT statement for safety.
                -- This will only execute for rows where the source_reference is a sale.
                (CASE
                    WHEN t.source_reference LIKE 'sale:%'
                    THEN (SELECT sl.payment_method FROM sales sl WHERE sl.id = CAST(SUBSTRING(t.source_reference FROM 6) AS INTEGER))
                    ELSE NULL
                END) as payment_method
            FROM transactions t
            LEFT JOIN customers c ON t.customer_id = c.id
            LEFT JOIN suppliers s ON t.supplier_id = s.id
            WHERE t.business_unit_id = $1
        `;

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
        const transactions = transactionsResult.rows;

        // --- NEW SUMMARY CALCULATION IN JAVASCRIPT (This logic is correct) ---
        let totalIncome = 0;
        let totalExpense = 0;
        transactions.forEach(t => {
            const amount = parseFloat(t.amount);
            if (t.type === 'INCOME' && t.payment_method !== 'ON_ACCOUNT') {
                totalIncome += amount;
            } else if (t.type === 'ACCOUNT_PAYMENT') {
                totalIncome += amount;
            } else if (t.type.includes('EXPENSE')) {
                totalExpense += Math.abs(amount);
            }
        });
        
        res.json({
            transactions: transactions,
            summary: {
                totalIncome: totalIncome.toFixed(2),
                totalExpense: totalExpense.toFixed(2)
            }
        });

    } catch (err) {
        console.error("Get Transactions Error:", err.message);
        res.status(500).send('Server Error');
    }
});


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
            // SIMPLE, SEPARATE QUERIES ARE MORE RELIABLE
            const saleDetailsRes = await db.query('SELECT s.*, c.name as customer_name FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = $1', [saleId]);
            const itemDetailsRes = await db.query('SELECT si.*, p.name as product_name FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = $1', [saleId]);

            details = { 
                type: 'Sale', 
                sale_details: saleDetailsRes.rows[0],
                items: itemDetailsRes.rows 
            };

        } else if (sourceRef && sourceRef.startsWith('scrap_purchase:')) {
            const purchaseIdString = sourceRef.split(':')[1];
            const purchaseIds = purchaseIdString.split(',').map(id => parseInt(id));

            const purchaseRes = await db.query(`
                SELECT sp.*, p.name as product_name, s.name as supplier_name
                FROM scrap_purchases sp
                JOIN products p ON sp.product_id = p.id
                LEFT JOIN suppliers s ON sp.supplier_id = s.id
                WHERE sp.id = ANY($1::int[])
            `, [purchaseIds]);
            
            details = { 
                type: 'Scrap Purchase', 
                supplier_name: purchaseRes.rows[0]?.supplier_name || 'Walk-in',
                items: purchaseRes.rows // Send the full array of items
            };
        
        } else if (sourceRef && sourceRef.startsWith('stock_take:')) {
            const stockTakeId = sourceRef.split(':')[1];

            const stockTakeDetailsRes = await db.query(`SELECT st.*, u.first_name || ' ' || u.last_name as user_name FROM stock_takes st JOIN users u ON st.user_id = u.id WHERE st.id = $1`, [stockTakeId]);
            const itemDetailsRes = await db.query(`SELECT sti.*, p.name as product FROM stock_take_items sti JOIN products p ON sti.product_id = p.id WHERE sti.stock_take_id = $1`, [stockTakeId]);

            details = { 
                type: 'Stock Take', 
                stock_take_details: stockTakeDetailsRes.rows[0],
                items: itemDetailsRes.rows 
            };
        } else {
            details = { type: 'Generic' };
        }

        res.json({ transaction, details });

    } catch (err) {
        console.error("Get Transaction Details Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/transactions/:id/void
// @desc    Voids a transaction and creates a reversing entry
// @access  Private (should be restricted to managers/admins in the future)
router.put('/:id/void', authMiddleware, async (req, res) => {
    const { id: transactionId } = req.params;
    const user_id = req.user.id; // Get the ID of the user performing the void
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // Step 1: Fetch the original transaction
        const originalTxRes = await client.query('SELECT * FROM transactions WHERE id = $1', [transactionId]);
        if (originalTxRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Transaction not found' });
        }
        const originalTx = originalTxRes.rows[0];

        // Step 2: Check if it's already voided to prevent double-voiding
        if (originalTx.status === 'Void') {
            return res.status(400).json({ msg: 'This transaction has already been voided.' });
        }

        // Step 3: Mark the original transaction as 'Void'
        await client.query("UPDATE transactions SET status = 'Void' WHERE id = $1", [transactionId]);

        // Step 4: Create the reversing transaction
        // It's a mirror image of the original, but with the amount inverted.
        const reversingAmount = -parseFloat(originalTx.amount);
        const reversingType = originalTx.type.includes('INCOME') ? 'REVERSAL_INCOME' : 'REVERSAL_EXPENSE';
        const reversingDescription = `Reversal of Txn #${originalTx.id}: ${originalTx.description}`;

        await client.query(
            `INSERT INTO transactions (business_unit_id, amount, type, description, status, user_id, customer_id, supplier_id, source_reference)
             VALUES ($1, $2, $3, $4, 'Reversal', $5, $6, $7, $8)`,
            [
                originalTx.business_unit_id,
                reversingAmount,
                reversingType,
                reversingDescription,
                user_id,
                originalTx.customer_id,
                originalTx.supplier_id,
                `reversal_of:${originalTx.id}`
            ]
        );

        // Step 5: (CRITICAL) Reverse the financial impact on the relevant safe or account
        // This logic will grow as your system grows.
        if (originalTx.source_reference) {
            const [sourceType, sourceId] = originalTx.source_reference.split(':');
            
            // If it was a sale that was paid to a safe
            if (sourceType === 'sale') {
                const saleRes = await client.query('SELECT safe_id FROM cash_ledger WHERE sale_id = $1', [sourceId]);
                const safeId = saleRes.rows[0]?.safe_id;
                if (safeId) {
                    // Subtract the original amount from the safe
                    await client.query('UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2', [originalTx.amount, safeId]);
                }
            }
            // If it was a scrap payout from a safe
            if (sourceType === 'scrap_purchase') {
                 const purchaseRes = await client.query('SELECT safe_id FROM cash_ledger WHERE transaction_id IN (SELECT id FROM transactions WHERE source_reference = $1)', [originalTx.source_reference]);
                 const safeId = purchaseRes.rows[0]?.safe_id;
                 if (safeId){
                     // Add the money back to the safe (since original amount was negative)
                     await client.query('UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2', [originalTx.amount, safeId]);
                 }
            }
        }
        
        await client.query('COMMIT');
        res.status(200).json({ msg: 'Transaction voided successfully.' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Void Transaction Error:", err.message);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

module.exports = router;