// backend/server.js

const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json()); // Middleware for parsing JSON bodies

// --- ROUTE IMPORTS ---
const authRoutes = require('./routes/auth');
const categoriesRoutes = require('./routes/categories');
const cashRoutes = require('./routes/cash');
const customersRoutes = require('./routes/customers');
const dashboardRoutes = require('./routes/dashboard');
const expensesRoutes = require('./routes/expenses');
const invoicesRoutes = require('./routes/invoices');
const remittancesRoutes = require('./routes/remittances'); // Correctly defined here
const logisticsRoutes = require('./routes/logistics');
// Assuming a panelbeating route file exists
// const panelbeatingRoutes = require('./routes/panelbeating'); 
const payrollRoutes = require('./routes/payroll');
const productsRoutes = require('./routes/products');
// Assuming a reporting route file exists
// const reportingRoutes = require('./routes/reporting');
const salesRoutes = require('./routes/sales');
const scrapyardRoutes = require('./routes/scrapyard');
const suppliersRoutes = require('./routes/suppliers');
const businessUnitsRoutes = require('./routes/businessUnits');
// Assuming a terminals route file exists
// const terminalsRoutes = require('./routes/terminals');
const transactionsRoutes = require('./routes/transactions');
const quotesRoutes = require('./routes/quotes');
const purchaseOrdersRoutes = require('./routes/purchaseOrders');
const salesOrdersRoutes = require('./routes/salesOrders');

const transfersRoutes = require('./routes/transfers');

// --- API ROUTE USAGE ---
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/sales-orders', salesOrdersRoutes);
app.use('/api/cash', cashRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/remittances', remittancesRoutes); // Correctly used here
app.use('/api/logistics', logisticsRoutes);
// app.use('/api/panelbeating', panelbeatingRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/products', productsRoutes);
// app.use('/api/reporting', reportingRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/stocktakes', require('./routes/stocktakes'));
app.use('/api/scrapyard', scrapyardRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/business-units', businessUnitsRoutes);
// app.use('/api/terminals', terminalsRoutes);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/transfers', transfersRoutes);

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));