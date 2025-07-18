// backend/server.js

const express = require('express');
require('dotenv').config();

const app = express();

// --- MIDDLEWARE SETUP ---
// This is the most critical part. This line MUST come before your routes are defined.
// It tells Express to expect and parse incoming request bodies as JSON.
app.use(express.json());


// --- API ROUTES ---
// The server will now use the JSON middleware above for all these routes.
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/sales',require('./routes/sales'));
app.use('/api/scrapyard', require('./routes/scrapyard'));
app.use('/api/panelbeating', require('./routes/panelbeating'));
app.use('/api/transfers', require('./routes/transfers'));
app.use('/api/logistics', require('./routes/logistics'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/reporting', require('./routes/reporting'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/invoices', require('./routes/invoices'));


// --- SERVER STARTUP ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));