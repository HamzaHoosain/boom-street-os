const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/scrapyard/buy
// @desc    Process buying a "cart" of scrap, now fully integrated with the cash treasury
// @access  Private
router.post('/buy', authMiddleware, async (req, res) => {
    // This route now requires a safe_id to specify the source of the cash payout
    const { business_unit_id, purchase_items, supplier_id, safe_id } = req.body;
    const user_id = req.user.id;

    if (!business_unit_id || !purchase_items || purchase_items.length === 0 || !safe_id) {
        return res.status(400).json({ msg: 'Missing required fields, including a payout source safe.' });
    }

    const client = await db.pool.connect();
    let totalPayout = 0;

    try {
        await client.query('BEGIN');

        // First, loop through and calculate the total payout amount
        for (const item of purchase_items) {
            const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.product_id]);
            if (productResult.rows.length === 0) {
                throw new Error(`Product with ID ${item.product_id} not found.`);
            }
            totalPayout += parseFloat(productResult.rows[0].cost_price) * item.weight_kg;
        }

        // --- NEW TREASURY LOGIC ---
        // 1. Check if the selected source safe has enough cash for the total payout
        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [safe_id]);
        if (sourceSafe.rows.length === 0) {
            throw new Error('Payout source safe not found.');
        }
        if (parseFloat(sourceSafe.rows[0].current_balance) < totalPayout) {
            throw new Error('Insufficient funds in the selected payout source.');
        }

        // 2. Debit the source safe (decrease its balance)
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [totalPayout, safe_id]);
        
        // 3. Log this specific cash movement in the cash ledger for a detailed audit trail
        const cashLedgerNotes = `Scrap Payout - ${purchase_items.length} items`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'PAYOUT_CASH', $2, $3, $4)", [safe_id, -totalPayout, cashLedgerNotes, user_id]);
        // --- END OF TREASURY LOGIC ---

        // Now, log the purchase details and update inventory
        for (const item of purchase_items) {
            const productResult = await client.query('SELECT cost_price FROM products WHERE id = $1', [item.product_id]);
            const payout_amount = parseFloat(productResult.rows[0].cost_price) * item.weight_kg;
            
            await client.query(
                'INSERT INTO scrap_purchases (user_id, product_id, weight_kg, payout_amount, supplier_id) VALUES ($1, $2, $3, $4, $5)', 
                [user_id, item.product_id, item.weight_kg, payout_amount, supplier_id || null]
            );
            
            await client.query(
                'UPDATE products SET quantity_on_hand = quantity_on_hand + $1 WHERE id = $2', 
                [item.weight_kg, item.product_id]
            );
        }
        
        // Finally, log the main EXPENSE transaction in the master financial ledger
        const description = `Scrap Purchase Payout - ${purchase_items.length} items`;
        await client.query(
            "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, 'pop')", 
            [business_unit_id, totalPayout, description]
        );

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap purchase processed successfully', total_payout: totalPayout });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Buy Transaction Error:', err.message);
        if (err.message.includes('Insufficient funds') || err.message.includes('not found')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server error during scrap purchase');
    } finally {
        client.release();
    }
});

// The /sell route is unchanged from your version
router.post('/sell', authMiddleware, async (req, res) => {
    const { business_unit_id, product_id, weight_kg, revenue_amount } = req.body;
    const user_id = req.user.id;

    if (!business_unit_id || !product_id || !weight_kg || !revenue_amount) {
        return res.status(400).json({ msg: 'Please provide all required fields.' });
    }
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        const stockCheck = await client.query('SELECT quantity_on_hand FROM products WHERE id = $1', [product_id]);
        if (stockCheck.rows.length === 0 || parseFloat(stockCheck.rows[0].quantity_on_hand) < parseFloat(weight_kg)) {
            throw new Error('Not enough stock available for this sale.');
        }

        const saleResult = await client.query('INSERT INTO scrap_sales (user_id, product_id, weight_kg, revenue_amount) VALUES ($1, $2, $3, $4) RETURNING id', [user_id, product_id, weight_kg, revenue_amount]);
        const newSaleId = saleResult.rows[0].id;

        await client.query('UPDATE products SET quantity_on_hand = quantity_on_hand - $1 WHERE id = $2', [weight_kg, product_id]);

        const description = `Bulk Scrap Sale #${newSaleId}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'INCOME', $3, $4)", [business_unit_id, revenue_amount, description, `scrap_sale:${newSaleId}`]);

        await client.query('COMMIT');
        res.status(201).json({ msg: 'Scrap sale processed successfully', saleId: newSaleId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Scrap Sell Transaction Error:', err.message);
        if (err.message.includes('Not enough stock')) {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server error during scrap sale');
    } finally {
        client.release();
    }
});

module.exports = router;