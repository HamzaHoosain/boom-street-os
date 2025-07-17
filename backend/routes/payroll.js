// backend/routes/payroll.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('../middleware/authMiddleware');

// @route   POST api/payroll/employees
// @desc    Onboard a user as an employee with pay details
// @access  Private (Admin/Manager)
router.post('/employees', authMiddleware, async (req, res) => {
    const { user_id, business_unit_id, pay_type, pay_rate } = req.body;
    try {
        const newEmployee = await db.query(
            "INSERT INTO employees (user_id, business_unit_id, pay_type, pay_rate) VALUES ($1, $2, $3, $4) RETURNING *",
            [user_id, business_unit_id, pay_type, pay_rate]
        );
        res.status(201).json(newEmployee.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/payroll/loans
// @desc    Issue a new loan to an employee
// @access  Private (Admin/Manager)
router.post('/loans', authMiddleware, async (req, res) => {
    const { employee_id, principal_amount } = req.body;
    try {
        const newLoan = await db.query(
            "INSERT INTO staff_loans (employee_id, principal_amount) VALUES ($1, $2) RETURNING *",
            [employee_id, principal_amount]
        );
        res.status(201).json(newLoan.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/payroll/run
// @desc    Execute a new payroll run for all employees
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
            let gross_pay = 0;
            if (emp.pay_type === 'weekly') {
                gross_pay = emp.pay_rate;
            } else if (emp.pay_type === 'hourly') {
                gross_pay = emp.pay_rate * (hours_worked[emp.id] || 0);
            }

            let loan_deduction = 0;
            const loanResult = await client.query("SELECT * FROM staff_loans WHERE employee_id = $1 AND is_active = TRUE", [emp.id]);
            
            // --- THIS IS THE FIX ---
            // Only perform loan logic if an active loan actually exists
            if (loanResult.rows.length > 0) {
                const loan = loanResult.rows[0];
                const remaining_balance = loan.principal_amount - loan.amount_repaid;
                loan_deduction = Math.min(remaining_balance, loan_repayment_amount || 0);

                if (loan_deduction > 0) {
                    await client.query("UPDATE staff_loans SET amount_repaid = amount_repaid + $1 WHERE id = $2", [loan_deduction, loan.id]);
                    
                    if ((loan.amount_repaid + loan_deduction) >= loan.principal_amount) {
                        await client.query("UPDATE staff_loans SET is_active = FALSE WHERE id = $1", [loan.id]);
                    }
                }
            }
            // --- END OF FIX ---

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


module.exports = router;