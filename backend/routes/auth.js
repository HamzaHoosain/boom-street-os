// backend/routes/auth.js - FINAL COMPLETE VERSION
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const router = express.Router(); // This line was missing from the partial snippet

// @route   POST api/auth/register
// @desc    Register a new user
router.post('/register', async (req, res) => {
    const { firstName, lastName, email, password } = req.body;
    try {
        let user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (user.rows.length > 0) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        const newUser = await db.query(
            'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
            [firstName, lastName, email, passwordHash]
        );
        res.status(201).json({ msg: 'User registered successfully', userId: newUser.rows[0].id });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user, get token, AND their role assignments with business type
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const user = userResult.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const assignmentsResult = await db.query(
            `SELECT
                ura.role_id,
                r.role_name,
                ura.business_unit_id,
                bu.name AS business_unit_name,
                bu.type AS type
             FROM user_role_assignments ura
             JOIN roles r ON ura.role_id = r.id
             LEFT JOIN business_units bu ON ura.business_unit_id = bu.id
             WHERE ura.user_id = $1`,
            [user.id]
        );
        const assignments = assignmentsResult.rows;

        const payload = {
            user: {
                id: user.id,
                email: user.email,
                assignments: assignments
            }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ 
                    token,
                    user: {
                        id: user.id,
                        firstName: user.first_name,
                        assignments: assignments
                    }
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

module.exports = router; // This line was also missing from the partial snippet