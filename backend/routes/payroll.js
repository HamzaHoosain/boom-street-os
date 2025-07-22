const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/payroll/employees
// @desc    Onboard a user as an employee using the new hourly rate structure
// @access  Private (Admin/Manager)
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
// Add this new route to backend/routes/payroll.js

// @route   GET api/payroll/employees/:id/ledger
// @desc    Get a financial ledger for a single employee
// @access  Private (Admin/Manager)

router.get('/employees/:id/ledger', authMiddleware, async (req, res) => {
    const { id: employeeId } = req.params;
    try {
        // This query finds all loans and all payslips for a given employee
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

// @route   GET api/payroll/employees/:id
// @desc    Get details for a single employee
// @access  Private
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
        const result = await db.query(query, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Employee not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get Single Employee Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/payroll/employees
// @desc    Get a list of all employees with their new pay details
// @access  Private (Admin/Manager)
router.get('/employees', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT 
                e.id, 
                e.user_id, 
                u.first_name, 
                u.last_name, 
                bu.name as business_unit_name, 
                e.hourly_rate, 
                e.default_hours_per_period 
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

// @route   POST api/payroll/loans
// @desc    Issue a new loan/advance to an employee (TREASURY AWARE)
// @access  Private (Admin/Manager)
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

        const newLoan = await client.query("INSERT INTO staff_loans (employee_id, principal_amount) VALUES ($1, $2) RETURNING *", [employee_id, principal_amount]);
        await client.query("UPDATE cash_safes SET current_balance = current_balance - $1 WHERE id = $2", [principal_amount, safe_id]);
        
        const cashDesc = `Staff Loan/Advance. Notes: ${notes}`;
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

// @route   POST api/payroll/run
// @desc    Execute a new payroll run using the hourly rate structure
// @access  Private (Admin)
router.post('/run', authMiddleware, async (req, res) => {
    const { pay_period_start, pay_period_end, hours_worked, loan_repayment_amount } = req.body;
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        const employeesResult = await client.query('SELECT * FROM employees');
        const employees = employeesResult.rows;
        let totalPayrollCost = 0;

        const runQuery = "INSERT INTO payroll_runs (pay_period_start, pay_period_end, total_paid) VALUES ($1, $2, 0) RETURNING id";
        const runResult = await client.query(runQuery, [pay_period_start, pay_period_end]);
        const runId = runResult.rows[0].id;
        
        for (const emp of employees) {
            // --- NEW PAY CALCULATION LOGIC ---
            // 'hours_worked' is an object like { employee_id: hours, ... }
            // If specific hours are provided for an employee, use them. Otherwise, use their default hours.
            const hoursForPeriod = hours_worked[emp.id] || emp.default_hours_per_period;
            const gross_pay = parseFloat(emp.hourly_rate) * hoursForPeriod;
            // --- END OF NEW LOGIC ---

            let loan_deduction = 0;
            const loanResult = await client.query("SELECT * FROM staff_loans WHERE employee_id = $1 AND is_active = TRUE", [emp.id]);
            if (loanResult.rows.length > 0) {
                const loan = loanResult.rows[0];
                const remaining_balance = parseFloat(loan.principal_amount) - parseFloat(loan.amount_repaid);
                loan_deduction = Math.min(remaining_balance, parseFloat(loan_repayment_amount) || 0);

                if (loan_deduction > 0) {
                    await client.query("UPDATE staff_loans SET amount_repaid = amount_repaid + $1 WHERE id = $2", [loan_deduction, loan.id]);
                    if ((parseFloat(loan.amount_repaid) + loan_deduction) >= parseFloat(loan.principal_amount)) {
                        await client.query("UPDATE staff_loans SET is_active = FALSE WHERE id = $1", [loan.id]);
                    }
                }
            }

            const net_pay = gross_pay - loan_deduction;
            await client.query(
                "INSERT INTO payslips (payroll_run_id, employee_id, gross_pay, loan_deduction, net_pay) VALUES ($1, $2, $3, $4, $5)",
                [runId, emp.id, gross_pay, loan_deduction, net_pay]
            );

            const description = `Payroll for ${pay_period_start} to ${pay_period_end}`;
            await client.query(
                "INSERT INTO transactions (business_unit_id, amount, type, description, source_reference) VALUES ($1, $2, 'EXPENSE', $3, $4)",
                [emp.business_unit_id, net_pay, description, `payslip:${runId}-${emp.id}`]
            );
            
            totalPayrollCost += net_pay;
        }

        await client.query("UPDATE payroll_runs SET total_paid = $1 WHERE id = $2", [totalPayrollCost, runId]);
        await client.query('COMMIT');
        res.status(201).json({ msg: 'Payroll run completed successfully', runId, total_paid: totalPayrollCost });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Payroll Run Transaction Error:', err.message);
        res.status(500).send('Server error during payroll run');
    } finally {
        client.release();
    }
});
// Add these new routes to backend/routes/payroll.js

// @route   GET api/payroll/available-users
// @desc    Get a list of users who are NOT yet employees
// @access  Private
router.get('/available-users', authMiddleware, async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.first_name, u.last_name FROM users u
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE e.id IS NULL
            ORDER BY u.first_name
        `;
        const users = await db.query(query);
        res.json(users.rows);
    } catch (err) {
        console.error("Get Available Users Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/payroll/employees/:id/details
// @desc    Get the editable details for a single employee
// @access  Private
router.get('/employees/:id/details', authMiddleware, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ msg: 'Employee profile not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Get Employee Details Error:", err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/payroll/employees/:id
// @desc    Update an employee's pay details
// @access  Private
router.put('/employees/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { business_unit_id, hourly_rate, default_hours_per_period } = req.body;
    try {
        const updatedEmployee = await db.query(
            "UPDATE employees SET business_unit_id = $1, hourly_rate = $2, default_hours_per_period = $3 WHERE id = $4 RETURNING *",
            [business_unit_id, hourly_rate, default_hours_per_period, id]
        );
        res.json(updatedEmployee.rows[0]);
    } catch (err) {
        console.error("Update Employee Error:", err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;