import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../components/inventory/Inventory.css';
import './ReportsPage.css';

// --- Individual Employee Row Component ---
const PayrollRow = ({ employee, activeLoan, onFinalize, safes }) => {
    const [hours, setHours] = useState(employee.default_hours_per_period);
    const [loanDeduction, setLoanDeduction] = useState('0.00');
    const [otherDeductions, setOtherDeductions] = useState('0.00');
    const [safeId, setSafeId] = useState('');

    const grossPay = parseFloat(employee.hourly_rate) * parseFloat(hours || 0);
    const netPay = grossPay - (parseFloat(loanDeduction) || 0) - (parseFloat(otherDeductions) || 0);
    const remainingLoan = activeLoan ? parseFloat(activeLoan.principal_amount) - parseFloat(activeLoan.amount_repaid) : 0;

    const handleFinalize = () => {
        if (!safeId) {
            alert("Please select a payment source for this employee.");
            return;
        }
        if (netPay < 0) {
            alert("Net pay cannot be negative. Please adjust deductions.");
            return;
        }
        const payrollData = {
            employee_id: employee.id,
            hours_worked: parseFloat(hours),
            loan_deduction: parseFloat(loanDeduction),
            other_deductions: parseFloat(otherDeductions),
            safe_id: parseInt(safeId)
        };
        onFinalize(payrollData);
    };
    
    return (
        <tr>
            <td>{employee.first_name} {employee.last_name}</td>
            <td>R {grossPay.toFixed(2)}</td>
            <td>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Source --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </td>
            <td>{activeLoan ? `Owed: R ${remainingLoan.toFixed(2)}` : 'None'}</td>
            <td><input type="number" step="0.01" value={loanDeduction} onChange={e => setLoanDeduction(e.target.value)} className="form-control" style={{maxWidth: '100px'}} /></td>
            <td><input type="number" step="0.01" value={otherDeductions} onChange={e => setOtherDeductions(e.target.value)} className="form-control" style={{maxWidth: '100px'}} /></td>
            <td><strong>R {netPay.toFixed(2)}</strong></td>
            <td><button onClick={handleFinalize} className="btn-edit">Finalize Pay</button></td>
        </tr>
    );
};


// --- Main Payroll Page Component ---
const PayrollPage = () => {
    const [allEmployees, setAllEmployees] = useState([]);
    const [filteredEmployees, setFilteredEmployees] = useState([]);
    const [activeLoans, setActiveLoans] = useState([]);
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { selectedBusiness } = useContext(AuthContext);

    // State for the payroll run form
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loanDeduction, setLoanDeduction] = useState('250.00');
    const [hoursWorked, setHoursWorked] = useState({});

    // Helper to format dates to YYYY-MM-DD
    const formatDate = (date) => date.toISOString().split('T')[0];

    // Unified data fetching hook
    useEffect(() => {
        setLoading(true);
        const fetchInitialData = async () => {
            try {
                const [employeesRes, loansRes, safesRes, lastRunRes] = await Promise.all([
                    api.get('/payroll/employees'),
                    api.get('/payroll/active-loans'),
                    api.get('/cash/safes'),
                    api.get('/payroll/last-run-date')
                ]);

                setAllEmployees(employeesRes.data);
                setActiveLoans(loansRes.data);
                setSafes(safesRes.data);

                // Calculate the next pay period
                const lastDate = lastRunRes.data.last_run_end_date;
                const lastEnd = lastDate ? new Date(lastDate) : new Date(new Date().setDate(new Date().getDate() - 7)); // Default to last week if never run
                const nextStart = new Date(lastEnd);
                nextStart.setDate(nextStart.getDate() + 1);
                const nextEnd = new Date(nextStart);
                nextEnd.setDate(nextEnd.getDate() + 6);
                setStartDate(formatDate(nextStart));
                setEndDate(formatDate(nextEnd));
            } catch (err) {
                setError('Failed to load initial payroll data. Please try again.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [success]); // Re-fetch all data after a successful payroll run

    // Effect for filtering employees based on selected business
    useEffect(() => {
        if (!selectedBusiness) return;
        let employeesToDisplay = [];
        if (selectedBusiness.business_unit_id) {
            employeesToDisplay = allEmployees.filter(e => e.business_unit_name === selectedBusiness.business_unit_name);
        } else {
            employeesToDisplay = allEmployees;
        }
        setFilteredEmployees(employeesToDisplay);
        
        const initialHours = {};
        employeesToDisplay.forEach(emp => {
            initialHours[emp.id] = emp.default_hours_per_period;
        });
        setHoursWorked(initialHours);
    }, [selectedBusiness, allEmployees]);


    const handleHoursChange = (employeeId, hours) => {
        setHoursWorked({ ...hoursWorked, [employeeId]: hours });
    };

    const handleFinalizePay = async (payrollData) => {
        setSuccess(''); setError('');
        const finalData = {
            ...payrollData,
            pay_period_start: startDate,
            pay_period_end: endDate,
        };
        try {
            const response = await api.post('/payroll/process-pay', finalData);
            setSuccess(response.data.msg);
            // After a successful payment, refresh the active loans list
            api.get('/payroll/active-loans').then(res => setActiveLoans(res.data));
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to process pay.');
        }
    };

    if (loading) return <p>Loading payroll data...</p>;

    return (
        <div>
            <h1>Individual Payroll for {selectedBusiness?.business_unit_name || 'All Businesses'}</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}

            <div className="report-controls">
                <div className="form-group">
                    <label>Pay Period Start</label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={e => setStartDate(e.target.value)} 
                        className="form-control" 
                    />
                </div>
                <div className="form-group">
                    <label>Pay Period End</label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={e => setEndDate(e.target.value)} 
                        className="form-control" 
                    />
                </div>
                <div className="form-group">
                    <label>Standard Loan Deduction (R)</label>
                    <input type="number" value={loanDeduction} onChange={e => setLoanDeduction(e.target.value)} className="form-control" />
                </div>
            </div>
            
            <table className="inventory-table" style={{marginTop: '1.5rem'}}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Gross Pay</th>
                        <th>Payment Source</th>
                        <th>Active Loan</th>
                        <th>Loan Deduction</th>
                        <th>Other Deductions</th>
                        <th>Net Pay</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredEmployees.map(emp => (
                        <PayrollRow 
                            key={emp.id} 
                            employee={emp}
                            activeLoan={activeLoans.find(loan => loan.employee_id === emp.id)}
                            onFinalize={handleFinalizePay}
                            safes={safes}
                        />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PayrollPage;