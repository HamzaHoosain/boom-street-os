// frontend/src/pages/EmployeesPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './EmployeesPage.css'; // You will need a new CSS file for the tabs
import '../components/inventory/Inventory.css'; // Reuse table styles
// At the top of frontend/src/pages/EmployeesPage.js
import IssueAdvanceForm from '../components/employees/IssueAdvanceForm';

// --- Reusable Form for Adding/Editing Employees ---
const EmployeeForm = ({ onSave, onClose, employee }) => {
    const [formData, setFormData] = useState({
        user_id: employee?.user_id || '',
        business_unit_id: employee?.business_unit_id || '',
        hourly_rate: employee?.hourly_rate || '',
        default_hours_per_period: employee?.default_hours_per_period || ''
    });
    const [availableUsers, setAvailableUsers] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);

    useEffect(() => {
        api.get('/business-units').then(res => setBusinessUnits(res.data));
        
        if (!employee) {
            api.get('/payroll/available-users').then(res => setAvailableUsers(res.data));
        }
    }, [employee]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {!employee && (
                <div className="form-group">
                    <label>Select User Account</label>
                    <select name="user_id" value={formData.user_id} onChange={handleChange} className="form-control" required>
                        <option value="">-- Select a User --</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                </div>
            )}
            <div className="form-group">
                <label>Assign to Business Unit</label>
                <select name="business_unit_id" value={formData.business_unit_id} onChange={handleChange} className="form-control" required>
                    <option value="">-- Select Business --</option>
                    {businessUnits.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Rate (R/hr or Salary)</label>
                <input type="number" step="0.01" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Default Hours/Pay Period</label>
                <input type="number" step="0.01" name="default_hours_per_period" value={formData.default_hours_per_period} onChange={handleChange} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Save Employee</button>
        </form>
    );
};


// --- Individual Row for the Payroll Tab ---
const PayrollRow = ({ employee, activeLoan, onFinalize, safes }) => {
    // This component is extracted from your PayrollPage.js for clarity
    const [hours, setHours] = useState(employee.default_hours_per_period);
    const [loanDeduction, setLoanDeduction] = useState('0.00');
    const [otherDeductions, setOtherDeductions] = useState('0.00');
    const [safeId, setSafeId] = useState('');

    const grossPay = parseFloat(employee.hourly_rate) * parseFloat(hours || 0);
    const netPay = grossPay - (parseFloat(loanDeduction) || 0) - (parseFloat(otherDeductions) || 0);
    const remainingLoan = activeLoan ? parseFloat(activeLoan.principal_amount) - parseFloat(activeLoan.amount_repaid) : 0;

    const handleFinalize = () => {
        if (!safeId) return alert("Please select a payment source.");
        if (netPay < 0) return alert("Net pay cannot be negative.");
        onFinalize({
            employee_id: employee.id,
            hours_worked: parseFloat(hours),
            loan_deduction: parseFloat(loanDeduction),
            other_deductions: parseFloat(otherDeductions),
            safe_id: parseInt(safeId)
        });
    };
    
    return (
        <tr>
            <td>{employee.first_name} {employee.last_name}</td>
            <td><input type="number" value={hours} onChange={e => setHours(e.target.value)} className="form-control" style={{maxWidth: '100px'}} /></td>
            <td>R {grossPay.toFixed(2)}</td>
            <td>{activeLoan ? `Owed: R ${remainingLoan.toFixed(2)}` : 'None'}</td>
            <td><input type="number" step="0.01" value={loanDeduction} onChange={e => setLoanDeduction(e.target.value)} className="form-control" style={{maxWidth: '100px'}} /></td>
            <td><input type="number" step="0.01" value={otherDeductions} onChange={e => setOtherDeductions(e.target.value)} className="form-control" style={{maxWidth: '100px'}} /></td>
            <td><strong>R {netPay.toFixed(2)}</strong></td>
            <td>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Source --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </td>
            <td><button onClick={handleFinalize} className="btn-edit">Finalize Pay</button></td>
        </tr>
    );
};


// --- The NEW Main Page "Hub" Component ---
const EmployeesPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('manage'); // 'manage' or 'payroll'
    
    // Data State
    const [employees, setEmployees] = useState([]);
    const [activeLoans, setActiveLoans] = useState([]);
    const [safes, setSafes] = useState([]);
    const [lastRunDate, setLastRunDate] = useState(null);

    // Form/Modal State
    const [modalMode, setModalMode] = useState(null);
    const [selectedEmployee, setSelectedEmployee] = useState(null);

    // UI State
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetchData = async () => {
        if (!selectedBusiness) return;
        setLoading(true);
        try {
            const endpoint = `/payroll/employees?businessUnitId=${selectedBusiness.business_unit_id}`;
            const [employeesRes, loansRes, safesRes, lastRunRes] = await Promise.all([
                api.get(endpoint),
                api.get('/payroll/active-loans'),
                api.get('/cash/safes'),
                api.get('/payroll/last-run-date')
            ]);
            setEmployees(employeesRes.data);
            setActiveLoans(loansRes.data);
            setSafes(safesRes.data);

            const lastEnd = lastRunRes.data.last_run_end_date ? new Date(lastRunRes.data.last_run_end_date) : new Date(new Date().setDate(new Date().getDate() - 7));
            const nextStart = new Date(lastEnd);
            nextStart.setDate(nextStart.getDate() + 1);
            const nextEnd = new Date(nextStart);
            nextEnd.setDate(nextEnd.getDate() + 6);
            setStartDate(nextStart.toISOString().split('T')[0]);
            setEndDate(nextEnd.toISOString().split('T')[0]);
        } catch (error) {
            console.error("Failed to fetch employee data", error);
            setError("Could not load employee data.");
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBusiness]);

    const handleSaveEmployee = async (employeeData) => {
        try {
            if (modalMode === 'edit') {
                await api.put(`/payroll/employees/${selectedEmployee.id}`, employeeData);
                setSuccess(`Updated details for ${selectedEmployee.first_name}.`);
            } else {
                await api.post('/payroll/employees', employeeData);
                setSuccess(`Added new employee.`);
            }
            closeModal();
            fetchData();
        } catch (error) {
            alert('Failed to save employee.'); throw error;
        }
    };
    
     const handleSaveAdvance = async (loanData) => {
        try {
            // This API call now works because the backend table exists
            await api.post('/payroll/loans', loanData);
            
            setSuccess(`Successfully issued advance of R ${loanData.principal_amount.toFixed(2)} to ${selectedEmployee.first_name}.`);
            closeModal();
            
            // CRITICAL FIX: We must re-fetch all data to show the new
            // active loan in the payroll tab.
            fetchData();
        } catch (error) {
            // We can now throw the error and it will be caught by the form,
            // allowing the form to display a specific error message.
            throw error; 
        }
    };
    
    const handleFinalizePay = async (payrollData) => {
        setSuccess(''); setError('');
        const finalData = { ...payrollData, pay_period_start: startDate, pay_period_end: endDate };
        try {
            const response = await api.post('/payroll/process-pay', finalData);
            setSuccess(response.data.msg);
            fetchData(); // Refresh everything to show new ledger entries and update loan balances
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to process pay.');
        }
    };

    const handleRowClick = (employeeId) => navigate(`/employees/${employeeId}`);
    const closeModal = () => { setModalMode(null); setSelectedEmployee(null); };

    if (!selectedBusiness) return <div><h1>Employees</h1><p>Please select a business unit from the header.</p></div>;
    if (loading) return <p>Loading employee & payroll data...</p>;
    
    return (
        <div>
            <h1>Employee & Payroll Management</h1>
            <p>Managing employees for <strong>{selectedBusiness.business_unit_name}</strong>.</p>
            
            <div className="order-tabs" style={{ margin: '2rem 0' }}>
                <button onClick={() => setActiveTab('manage')} className={activeTab === 'manage' ? 'active' : ''}>Manage Employees</button>
                <button onClick={() => setActiveTab('payroll')} className={activeTab === 'payroll' ? 'active' : ''}>Run Payroll</button>
            </div>
            
            {success && <p className="alert-success">{success}</p>}
            {error && <p className="alert-error">{error}</p>}
            
            {activeTab === 'manage' && (
                <div>
                    <button onClick={() => setModalMode('add')} className="btn-login" style={{maxWidth: '250px', marginBottom: '1.5rem'}}>Add New Employee</button>
                    <table className="inventory-table">
                         <thead><tr><th>Name</th><th>Business Unit</th><th>Rate (R/hr)</th><th>Default Hours</th><th>Pay Structure</th><th>Actions</th></tr></thead>
                        <tbody>
                            {employees.map(emp => (
                                <tr key={emp.id} className="clickable-row" onClick={() => handleRowClick(emp.id)}>
                                    <td>{emp.first_name} {emp.last_name || ''}</td><td>{emp.business_unit_name}</td>
                                    <td>R {parseFloat(emp.hourly_rate).toFixed(2)}</td><td>{emp.default_hours_per_period}</td>
                                    <td>{ /* Pay structure calculation */}</td>
                                    <td>
                                        <button onClick={(e) => { e.stopPropagation(); setModalMode('edit'); setSelectedEmployee(emp); }} className="btn-edit">Edit</button>
                                        <button onClick={(e) => { e.stopPropagation(); setModalMode('advance'); setSelectedEmployee(emp); }} className="btn-edit" style={{marginLeft: '0.5rem'}}>Advance</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            {activeTab === 'payroll' && (
                <div>
                    <div className="report-controls">
                        <div className="form-group"><label>Pay Period Start</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-control" /></div>
                        <div className="form-group"><label>Pay Period End</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-control" /></div>
                    </div>
                    <table className="inventory-table" style={{marginTop: '1.5rem'}}>
                        <thead><tr><th>Name</th><th>Hours Worked</th><th>Gross Pay</th><th>Active Loan</th><th>Loan Deduction</th><th>Other Deductions</th><th>Net Pay</th><th>Payment Source</th><th>Actions</th></tr></thead>
                        <tbody>
                            {employees.map(emp => (
                                <PayrollRow key={emp.id} employee={emp} activeLoan={activeLoans.find(loan => loan.employee_id === emp.id)} onFinalize={handleFinalizePay} safes={safes} />
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal show={!!modalMode} onClose={closeModal} title={modalMode === 'add' ? 'Add Employee' : modalMode === 'edit' ? `Edit ${selectedEmployee?.first_name}` : `Issue Advance to ${selectedEmployee?.first_name}`}>
                {modalMode === 'add' && <EmployeeForm onSave={handleSaveEmployee} onClose={closeModal} />}
                {modalMode === 'edit' && <EmployeeForm onSave={handleSaveEmployee} onClose={closeModal} employee={selectedEmployee} />}
                {modalMode === 'advance' && <IssueAdvanceForm employee={selectedEmployee} onSave={handleSaveAdvance} onClose={closeModal} />}
            </Modal>
        </div>
    );
};

export default EmployeesPage;