// backend/server.js - FINAL VERIFIED & COMPLETE ROUTER
const express = require('express');
require('dotenv').config();

const app = express();
app.use(express.json());

// --- API ROUTES ---
app.use('/api/auth', require('./routes/auth'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cash', require('./routes/cash'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/expenses', require('./routes/expenses')); // <-- THIS LINE IS ESSENTIAL
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/logistics', require('./routes/logistics'));
app.use('/api/panelbeating', require('./routes/panelbeating'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/products', require('./routes/products'));
app.use('/api/reporting', require('./routes/reporting'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/scrapyard', require('./routes/scrapyard'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/terminals', require('./routes/terminals'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/transfers', require('./routes/transfers'));

// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));