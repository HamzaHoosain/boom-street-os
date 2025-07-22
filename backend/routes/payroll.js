const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// ----------------------------------------------------------------
// --- EMPLOYEE PROFILE MANAGEMENT (CRUD) ---
// ----------------------------------------------------------------

router.post('/employees', authMiddleware, async (req, res) => {
    const { user_id, business_unit_id, hourly_rate, default_hours_per_period } = req.body;
    try {
        const newEmployee = await db.query(
            "INSERT INTO employees (user_id, business_unit_id, hourly_rate, default_hours_per_period) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, business_unit_id, hourly_rate, default_hours_per_period]
        );
        res.status(201).json(newEmployee.rows[0]);
    } catch (err) {
        console.error("Create Employee Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/employees', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT e.id, e.user_id, u.first_name, u.last_name, 
                   bu.name as business_unit_name, e.hourly_rate, e.default_hours_per_period 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            JOIN business_units bu ON e.business_unit_id = bu.id
            ORDER BY u.first_name
        `;
        const employees = await db.query(query);
        res.json(employees.rows);
    } catch (err) {
        console.error("Get Employees Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/employees/:id/details', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Employee profile not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get Employee Details Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/employees/:id/ledger', authMiddleware, async (req, res) => {
    const { id: employeeId } = req.params;
    try {
        const query = `
            SELECT 'Loan Issued' as type, loan_date as date, principal_amount as amount, notes FROM staff_loans WHERE employee_id = $1
            UNION ALL
            SELECT 'Payroll' as type, pr.run_date as date, p.net_pay as amount, 'Net pay for ' || pr.pay_period_start || ' to ' || pr.pay_period_end as notes
            FROM payslips p
            JOIN payroll_runs pr ON p.payroll_run_id = pr.id
            WHERE p.employee_id = $1
            ORDER BY date DESC
        `;
        const ledger = await db.query(query, [employeeId]);
        res.json(ledger.rows);
    } catch (err) {
        console.error("Get Employee Ledger Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/employees/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const query = `
            SELECT e.id, e.user_id, u.first_name, u.last_name, bu.name as business_unit_name 
            FROM employees e
            JOIN users u ON e.user_id = u.id
            JOIN business_units bu ON e.business_unit_id = bu.id
            WHERE e.id = $1
        `;
        const result = await db.query(query, [parseInt(id, 10)]);
        if (result.rows.length === 0) return res.status(404).json({ msg: 'Employee not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get Single Employee Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.put('/employees/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { business_unit_id, hourly_rate, default_hours_per_period } = req.body;
    try {
        const updatedEmployee = await db.query(
            "UPDATE employees SET business_unit_id = $1, hourly_rate = $2, default_hours_per_period = $3 WHERE id = $4 RETURNING *",
            [business_unit_id, hourly_rate, default_hours_per_period, id]
        );
        if (updatedEmployee.rows.length === 0) return res.status(404).json({ msg: 'Employee profile not found' });
        res.json(updatedEmployee.rows[0]);
    } catch (err) {
        console.error("Update Employee Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/available-users', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name FROM users u
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE e.id IS NULL ORDER BY u.first_name
        `;
        const users = await db.query(query);
        res.json(users.rows);
    } catch (err) {
        console.error("Get Available Users Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// ----------------------------------------------------------------
// --- LOAN, ADVANCE, AND PAYROLL PROCESSING ---
// ----------------------------------------------------------------

router.post('/loans', authMiddleware, async (req, res) => {
    const { employee_id, principal_amount, safe_id, notes } = req.body;
    const user_id = req.user.id;
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const empRes = await client.query('SELECT business_unit_id FROM employees WHERE id = $1', [employee_id]);
        if (empRes.rows.length === 0) throw new Error('Employee not found.');
        const employee_business_unit_id = empRes.rows[0].business_unit_id;

        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [safe_id]);
        if (sourceSafe.rows.length === 0 || parseFloat(sourceSafe.rows[0].current_balance) < parseFloat(principal_amount)) {
            throw new Error('Insufficient funds in the source safe for this loan.');
        }

        const newLoan = await client.query("INSERT INTO staff_loans (employee_id, principal_amount, notes) VALUES ($1, $2, $3) RETURNING *", [employee_id, principal_amount, notes]);
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [principal_amount, safe_id]);
        const cashDesc = `Staff Loan/Advance to employee #${employee_id}. Notes: ${notes}`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'CASH_OUT', $2, $3, $4)", [safe_id, -principal_amount, cashDesc, user_id]);
        const transDesc = `Staff Advance/Loan to employee #${employee_id}. Notes: ${notes}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, 'staff_loan')", [employee_business_unit_id, principal_amount, transDesc]);
        await client.query('COMMIT');
        res.status(201).json(newLoan.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Issue Loan Error:", err.message);
        res.status(500).send({ msg: err.message || 'Server Error' });
    } finally {
        client.release();
    }
});

router.get('/active-loans', authMiddleware, async (req, res) => {
    try {
        const loans = await db.query("SELECT * FROM staff_loans WHERE is_active = TRUE");
        res.json(loans.rows);
    } catch (err) {
        console.error("Get Active Loans Error:", err.message);
        res.status(500).send('Server Error');
    }
});

router.post('/process-pay', authMiddleware, async (req, res) => {
    const { employee_id, pay_period_start, pay_period_end, hours_worked, loan_deduction, other_deductions, safe_id } = req.body;
    const user_id = req.user.id;
    if (!safe_id) return res.status(400).json({ msg: 'A payment source (safe_id) is required.' });

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        const empRes = await client.query('SELECT * FROM employees WHERE id = $1', [employee_id]);
        if (empRes.rows.length === 0) throw new Error('Employee not found.');
        const emp = empRes.rows[0];

        const gross_pay = parseFloat(emp.hourly_rate) * parseFloat(hours_worked);
        const finalLoanDeduction = parseFloat(loan_deduction) || 0;
        const finalOtherDeductions = parseFloat(other_deductions) || 0;
        const net_pay = gross_pay - finalLoanDeduction - finalOtherDeductions;
        if (net_pay < 0) throw new Error('Net pay cannot be negative.');

        const sourceSafe = await client.query('SELECT current_balance FROM cash_safes WHERE id = $1 FOR UPDATE', [safe_id]);
        if (sourceSafe.rows.length === 0 || parseFloat(sourceSafe.rows[0].current_balance) < net_pay) {
            throw new Error('Insufficient funds in the selected payment source for this payroll.');
        }
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [net_pay, safe_id]);
        const cashDesc = `Payroll payment for ${emp.first_name}`;
        await client.query("INSERT INTO cash_ledger (safe_id, type, amount, description, user_id) VALUES ($1, 'CASH_OUT', $2, $3, $4)", [safe_id, -net_pay, cashDesc, user_id]);
        
        if (finalLoanDeduction > 0) {
            const loanRes = await client.query("SELECT * FROM staff_loans WHERE employee_id = $1 AND is_active = TRUE FOR UPDATE", [emp.id]);
            if (loanRes.rows.length > 0) {
                const loan = loanRes.rows[0];
                const newAmountRepaid = parseFloat(loan.amount_repaid) + finalLoanDeduction;
                await client.query("UPDATE staff_loans SET amount_repaid = $1 WHERE id = $2", [newAmountRepaid, loan.id]);
                if (newAmountRepaid >= parseFloat(loan.principal_amount)) {
                    await client.query("UPDATE staff_loans SET is_active = FALSE WHERE id = $1", [loan.id]);
                }
            }
        }
        
        let runRes = await client.query("SELECT id FROM payroll_runs WHERE pay_period_start = $1 AND pay_period_end = $2", [pay_period_start, pay_period_end]);
        let runId;
        if (runRes.rows.length === 0) {
            const newRunRes = await client.query("INSERT INTO payroll_runs (pay_period_start, pay_period_end, total_paid) VALUES ($1, $2, 0) RETURNING id", [pay_period_start, pay_period_end]);
            runId = newRunRes.rows[0].id;
        } else {
            runId = runRes.rows[0].id;
        }

        const payslipRes = await client.query("INSERT INTO payslips (payroll_run_id, employee_id, gross_pay, loan_deduction, other_deductions, net_pay) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id", [runId, emp.id, gross_pay, finalLoanDeduction, finalOtherDeductions, net_pay]);
        const newPayslipId = payslipRes.rows[0].id;
        
        await client.query("UPDATE payroll_runs SET total_paid = total_paid + $1 WHERE id = $2", [net_pay, runId]);
        
        const description = `Payroll for ${emp.first_name} for period ${pay_period_start} to ${pay_period_end}`;
        await client.query("INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, $4)", [emp.business_unit_id, net_pay, description, `payslip:${newPayslipId}`]);

        await client.query('COMMIT');
        res.status(201).json({ msg: `Payroll for ${emp.first_name} finalized successfully.`});
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Process Pay Error:', err.message);
        res.status(500).send({ msg: err.message || 'Server error' });
    } finally {
        client.release();
    }
});
// Add this new route to backend/routes/payroll.js

// @route   GET api/payroll/last-run-date
// @desc    Get the end date of the most recent payroll run
// @access  Private
router.get('/last-run-date', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT pay_period_end FROM payroll_runs ORDER BY pay_period_end DESC LIMIT 1');
        if (result.rows.length === 0) {
            return res.json({ last_run_end_date: null });
        }
        res.json({ last_run_end_date: result.rows[0].pay_period_end });
    } catch (err) {
        console.error("Get Last Run Date Error:", err.message);
        res.status(500).send('Server Error');
    }
});
module.exports = router;