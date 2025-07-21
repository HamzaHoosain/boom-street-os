const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   GET api/reporting/profit-and-loss
// @desc    Generate a comprehensive, detailed Profit & Loss statement
// @access  Private
router.get('/profit-and-loss', authMiddleware, async (req, res) => {
    const { business_unit_id, start_date, end_date } = req.query;

    if (!business_unit_id || !start_date || !end_date) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }

    // Adjust the end date to include the entire day, fixing timezone issues
    const fullDayEndDate = `${end_date} 23:59:59.999`;

    try {
        const isOverview = business_unit_id === 'overview';
        // Create a reusable SQL filter for business unit
        const businessFilter = isOverview ? '' : `AND s.business_unit_id = ${parseInt(business_unit_id)}`;
        const transactionBusinessFilter = isOverview ? '' : `AND business_unit_id = ${parseInt(business_unit_id)}`;

        // 1. Gross Revenue (All sales income, including those on account)
        const revenueQuery = `
            SELECT COALESCE(SUM(s.total_amount), 0) as total 
            FROM sales s 
            WHERE s.sale_date BETWEEN $1 AND $2 ${businessFilter}`;
        const revenueResult = await db.query(revenueQuery, [start_date, fullDayEndDate]);
        const grossRevenue = parseFloat(revenueResult.rows[0].total);

        // 2. Cost of Goods Sold (COGS) - The sum of the cost of all items sold
        const cogsQuery = `
            SELECT COALESCE(SUM(si.quantity_sold * si.cost_at_sale), 0) as total
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
            WHERE s.sale_date BETWEEN $1 AND $2 ${businessFilter}`;
        const cogsResult = await db.query(cogsQuery, [start_date, fullDayEndDate]);
        const cogs = parseFloat(cogsResult.rows[0].total);

        // Gross Profit is the direct profit from sales
        const grossProfit = grossRevenue - cogs;

        // 3. Operating Expenses (all transactions marked as 'EXPENSE')
        const expenseQuery = `
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM transactions 
            WHERE transaction_date BETWEEN $1 AND $2 AND type = 'EXPENSE' ${transactionBusinessFilter}`;
        const expenseResult = await db.query(expenseQuery, [start_date, fullDayEndDate]);
        const operatingExpenses = parseFloat(expenseResult.rows[0].total);

        // Net Profit is what's left after all expenses are paid
        const netProfit = grossProfit - operatingExpenses;

        // 4. Expected Income (Accounts Receivable) - This is a snapshot of all customer debt
        // Note: This is NOT filtered by date, as it represents the total current amount owed.
        const receivableQuery = `SELECT COALESCE(SUM(account_balance), 0) as total FROM customers`;
        const receivableResult = await db.query(receivableQuery);
        const expectedIncome = parseFloat(receivableResult.rows[0].total);
        
        // 5. Tax Estimation (Simple example: 15% of net profit, only if profitable)
        const tax = netProfit > 0 ? netProfit * 0.15 : 0;

        // Assemble the final, detailed report object
        res.json({
            gross_revenue: grossRevenue,
            cost_of_goods_sold: cogs,
            gross_profit: grossProfit,
            operating_expenses: operatingExpenses,
            net_profit: netProfit,
            expected_income_receivable: expectedIncome,
            estimated_tax: tax
        });

    } catch (err) {
        console.error('P&L Report Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;