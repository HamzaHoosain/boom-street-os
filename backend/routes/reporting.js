// backend/routes/reporting.js

const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/reporting/dashboard-report
// @desc    Generate a comprehensive BI report with KPIs and detailed lists
// @access  Private
router.get('/dashboard-report', authMiddleware, async (req, res) => {
    // This correctly destructures all query parameters from the request
    const { business_unit_id, start_date, end_date, itemsLimit, customersLimit, purchasesLimit } = req.query;

    if (!business_unit_id || !start_date || !end_date) {
        return res.status(400).json({ msg: 'Business unit, start date, and end date are required.' });
    }
    const fullDayEndDate = `${end_date} 23:59:59.999`;

    // Reusable SQL filter snippets for multi-tenancy
    const transactionFilter = `t.business_unit_id = ${parseInt(business_unit_id)}`; // Aliased
    const salesFilter = `s.business_unit_id = ${parseInt(business_unit_id)}`;
    
    // Correctly create separate limit clauses for each query
    const itemsLimitClause = parseInt(itemsLimit) === 0 ? '' : `LIMIT ${parseInt(itemsLimit) || 10}`;
    const customersLimitClause = parseInt(customersLimit) === 0 ? '' : `LIMIT ${parseInt(customersLimit) || 10}`;
    const purchasesLimitClause = parseInt(purchasesLimit) === 0 ? '' : `LIMIT ${parseInt(purchasesLimit) || 10}`;
    
    try {
        // --- THIS IS THE DEFINITIVE FIX FOR FINANCIAL ACCURACY ---
        const financialsQuery = `
            SELECT type, SUM(amount) as total
            FROM transactions
            WHERE business_unit_id = $1
              AND transaction_date BETWEEN $2 AND $3
            GROUP BY type
        `;
        const financialsResult = await db.query(financialsQuery, [business_unit_id, start_date, fullDayEndDate]);
        
        let grossRevenue = 0;
        let operatingExpenses = 0;
        financialsResult.rows.forEach(row => {
            if (row.type === 'INCOME') {
                grossRevenue = parseFloat(row.total);
            }
            if (row.type === 'EXPENSE') {
                operatingExpenses = Math.abs(parseFloat(row.total));
            }
        });

        const cogsQuery = `
            SELECT COALESCE(SUM(si.quantity_sold * si.cost_at_sale), 0) as total_cogs
            FROM sale_items si JOIN sales s ON si.sale_id = s.id
            WHERE ${salesFilter} AND s.sale_date BETWEEN $1 AND $2
        `;
        const cogsResult = await db.query(cogsQuery, [start_date, fullDayEndDate]);
        const costOfGoodsSold = parseFloat(cogsResult.rows[0].total_cogs);


        // --- 2. PROFITABILITY CALCULATIONS (This logic is correct) ---
        const grossProfit = grossRevenue - costOfGoodsSold;
        const netProfit = grossProfit - operatingExpenses;


        // --- 3. ACCOUNTS RECEIVABLE (This logic is correct) ---
        const receivableQuery = `
            SELECT COALESCE(SUM(account_balance), 0) as total_receivable 
            FROM customers WHERE business_unit_id = $1 AND account_balance > 0
        `;
        const receivableResult = await db.query(receivableQuery, [business_unit_id]);
        const accountsReceivable = parseFloat(receivableResult.rows[0].total_receivable);
        

        // --- 4. TOP PERFORMING ITEMS LIST (CORRECTED) ---
        const topItemsQuery = `
            SELECT
                p.name as product_name,
                SUM(si.quantity_sold) as units_sold,
                SUM(si.quantity_sold * si.price_at_sale) as revenue,
                SUM(si.quantity_sold * si.cost_at_sale) as cogs,
                SUM((si.quantity_sold * si.price_at_sale) - (si.quantity_sold * si.cost_at_sale)) as profit
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            JOIN products p ON si.product_id = p.id
            WHERE ${salesFilter} AND s.sale_date BETWEEN $1 AND $2
            GROUP BY p.name
            ORDER BY profit DESC
            ${itemsLimitClause} -- Uses the correct limit clause
        `;
        const topItemsResult = await db.query(topItemsQuery, [start_date, fullDayEndDate]);


        // --- 5. TOP CUSTOMERS LIST (CORRECTED) ---
        const topCustomersQuery = `
            SELECT
                c.name as customer_name,
                c.account_balance,
                COUNT(s.id) as number_of_sales,
                SUM(s.total_amount) as total_revenue
            FROM sales s
            JOIN customers c ON s.customer_id = c.id
            WHERE ${salesFilter} AND s.customer_id IS NOT NULL AND s.sale_date BETWEEN $1 AND $2
            GROUP BY c.id, c.name, c.account_balance
            ORDER BY total_revenue DESC
            ${customersLimitClause} -- Uses the correct limit clause
        `;
        const topCustomersResult = await db.query(topCustomersQuery, [start_date, fullDayEndDate]);

         // --- 6. TOP PURCHASED ITEMS LIST (THIS IS THE DEFINITIVELY CORRECTED QUERY) ---
        const topPurchasesQuery = `
            SELECT
                prod.name as product_name,
                SUM(sp.weight_kg) as total_weight,
                SUM(sp.payout_amount) as total_payout
            FROM scrap_purchases sp
            JOIN products prod ON sp.product_id = prod.id
            WHERE sp.id IN (
                -- This subquery creates the correct link.
                -- First, find all 'scrap_purchase' transaction source_references within the date range.
                -- Then, unnest the comma-separated IDs into rows.
                SELECT DISTINCT UNNEST(string_to_array(substring(source_reference from 16), ','))::integer
                FROM transactions
                WHERE business_unit_id = $1
                  AND type = 'EXPENSE'
                  AND source_reference LIKE 'scrap_purchase:%'
                  AND transaction_date BETWEEN $2 AND $3
            )
            GROUP BY prod.name
            ORDER BY total_payout DESC
            ${purchasesLimitClause}
        `;
        // Pass the correct parameters to this query
        const topPurchasesResult = await db.query(topPurchasesQuery, [business_unit_id, start_date, fullDayEndDate]);

        // --- FINAL RESPONSE ASSEMBLY (This is correct) ---
        res.json({
            profitAndLoss: {
                gross_revenue: grossRevenue,
                cost_of_goods_sold: costOfGoodsSold,
                gross_profit: grossProfit,
                operating_expenses: operatingExpenses,
                net_profit: netProfit,
            },
            keyMetrics: {
                accounts_receivable: accountsReceivable,
                profit_margin: grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0
            },
            detailedLists: {
                top_selling_products: topItemsResult.rows,
                top_customers_by_revenue: topCustomersResult.rows,
                top_purchased_products: topPurchasesResult.rows
            }
        });

    } catch (err) {
        console.error('Dashboard Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;