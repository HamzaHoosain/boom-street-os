import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css'; // Reuse table style

// --- Child Component: Form for Issuing a Loan/Advance ---
const IssueAdvanceForm = ({ employee, onSave, onClose }) => {
    const [amount, setAmount] = useState('');
    const [safeId, setSafeId] = useState('');
    const [notes, setNotes] = useState('Staff Advance'); // Default note
    const [safes, setSafes] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch only physical cash safes, as advances are typically cash
        api.get('/cash/safes').then(res => {
            setSafes(res.data.filter(s => s.is_physical_cash));
        }).catch(err => console.error("Could not load safes", err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const loanData = {
                employee_id: employee.id,
                principal_amount: parseFloat(amount),
                safe_id: parseInt(safeId),
                notes
            };
            await onSave(loanData);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to issue advance.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>Source of Funds</label>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Till/Float --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Advance Amount (R)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required autoFocus />
            </div>
            <div className="form-group">
                <label>Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Issue Advance</button>
        </form>
    );
};


// --- Main Page Component ---
const EmployeesPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [success, setSuccess] = useState('');

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const response = await api.get('/payroll/employees');
            setEmployees(response.data);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleIssueAdvance = (employee) => {
        setSelectedEmployee(employee);
        setShowModal(true);
    };

    const handleSaveAdvance = async (loanData) => {
        try {
            await api.post('/payroll/loans', loanData);
            setShowModal(false);
            setSuccess(`Successfully issued advance of R${loanData.principal_amount.toFixed(2)} to ${selectedEmployee.first_name}.`);
            // In a full app, we might also refresh the cash safe balances here.
        } catch (error) {
            alert(error.response?.data?.msg || 'Failed to issue advance. Check details and safe balance.');
            throw error;
        }
    };

    if (loading) return <p>Loading employees...</p>;

    return (
        <div>
            <h1>Employee Management</h1>
            {success && <p className="alert-success">{success}</p>}
            
            {/* We will add a "Create Employee" button here in a future step */}
            
            {selectedEmployee && (
                <Modal show={showModal} onClose={() => setShowModal(false)} title={`Issue Advance to ${selectedEmployee.first_name} ${selectedEmployee.last_name}`}>
                    <IssueAdvanceForm employee={selectedEmployee} onSave={handleSaveAdvance} onClose={() => setShowModal(false)} />
                </Modal>
            )}

            <table className="inventory-table" style={{marginTop: '1.5rem'}}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Business Unit</th>
                        <th>Hourly Rate</th>
                        <th>Default Hours</th>
                        <th>Weekly Equivalent</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map(emp => (
                        <tr key={emp.id}>
                            <td>{emp.first_name} {emp.last_name}</td>
                            <td>{emp.business_unit_name}</td>
                            <td>R {parseFloat(emp.hourly_rate).toFixed(2)}</td>
                            <td>{emp.default_hours_per_period}</td>
                            <td>
                                {emp.default_hours_per_period > 1 
                                    ? `R ${(parseFloat(emp.hourly_rate) * emp.default_hours_per_period).toFixed(2)}`
                                    : 'N/A (Monthly)'
                                }
                            </td>
                            <td>
                                <button onClick={() => handleIssueAdvance(emp)} className="btn-edit">Issue Advance</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeesPage;