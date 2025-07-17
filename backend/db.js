const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'boom_street_os',
    password: process.env.DB_PASSWORD,
    port: 5432,
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    
};
module.exports = { query: (text, params) => pool.query(text, params), pool };