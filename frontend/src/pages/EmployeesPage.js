import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css';

// --- Reusable Form for both Adding and Editing Employees ---
const EmployeeForm = ({ onSave, onClose, employee }) => {
    // If we are editing, we fetch the specific employee details
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
        
        // If we are adding a new employee, fetch users who aren't yet employees
        if (!employee) {
            api.get('/payroll/available-users').then(res => setAvailableUsers(res.data));
        } else {
            // If editing, fetch the full details to pre-populate the form
            api.get(`/payroll/employees/${employee.id}/details`).then(res => {
                setFormData({
                    business_unit_id: res.data.business_unit_id,
                    hourly_rate: res.data.hourly_rate,
                    default_hours_per_period: res.data.default_hours_per_period
                });
            });
        }
    }, [employee]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {!employee && (
                <div className="form-group">
                    <label>Select User</label>
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
                <label>Rate (R/hr or Monthly Salary)</label>
                <input type="number" step="0.01" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Default Hours (46 for Weekly, 1 for Monthly)</label>
                <input type="number" step="0.01" name="default_hours_per_period" value={formData.default_hours_per_period} onChange={handleChange} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Save Employee</button>
        </form>
    );
};

// --- Reusable Form for Issuing a Loan/Advance ---
const IssueAdvanceForm = ({ employee, onSave, onClose }) => {
    const [amount, setAmount] = useState('');
    const [safeId, setSafeId] = useState('');
    const [notes, setNotes] = useState('Staff Advance');
    const [safes, setSafes] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
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
            <div className="form-group"><label>Source of Funds</label><select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required><option value="">-- Select Till/Float --</option>{safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="form-group"><label>Advance Amount (R)</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required autoFocus /></div>
            <div className="form-group"><label>Notes</label><input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" /></div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Issue Advance</button>
        </form>
    );
};


// --- Main Page Component ---
const EmployeesPage = () => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalMode, setModalMode] = useState(null); // 'add', 'edit', or 'advance'
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();

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

    const handleSaveEmployee = async (employeeData) => {
        try {
            if (modalMode === 'edit') {
                await api.put(`/payroll/employees/${selectedEmployee.id}`, employeeData);
                setSuccess(`Successfully updated details for ${selectedEmployee.first_name}.`);
            } else {
                await api.post('/payroll/employees', employeeData);
                setSuccess(`Successfully added new employee.`);
            }
            closeModal();
            fetchEmployees();
        } catch (error) {
            alert('Failed to save employee.');
            throw error;
        }
    };
    
    const handleSaveAdvance = async (loanData) => {
        try {
            await api.post('/payroll/loans', loanData);
            closeModal();
            setSuccess(`Successfully issued advance of R ${loanData.principal_amount.toFixed(2)} to ${selectedEmployee.first_name}.`);
        } catch (error) {
            alert(error.response?.data?.msg || 'Failed to issue advance. Check details and safe balance.');
            throw error;
        }
    };

    const handleRowClick = (employeeId) => {
        navigate(`/employees/${employeeId}`);
    };

    const closeModal = () => {
        setModalMode(null);
        setSelectedEmployee(null);
    };

    if (loading) return <p>Loading employees...</p>;

    return (
        <div>
            <h1>Employee Management</h1>
            {success && <p className="alert-success" style={{marginTop: '1rem'}}>{success}</p>}
            
            <div style={{ margin: '2rem 0' }}>
                <button onClick={() => setModalMode('add')} className="btn-login" style={{maxWidth: '250px'}}>
                    Add New Employee
                </button>
            </div>
            
            <Modal show={!!modalMode} onClose={closeModal} title={
                modalMode === 'add' ? 'Add New Employee' :
                modalMode === 'edit' ? `Edit ${selectedEmployee?.first_name}` :
                `Issue Advance to ${selectedEmployee?.first_name}`
            }>
                {modalMode === 'add' && <EmployeeForm onSave={handleSaveEmployee} onClose={closeModal} />}
                {modalMode === 'edit' && <EmployeeForm onSave={handleSaveEmployee} onClose={closeModal} employee={selectedEmployee} />}
                {modalMode === 'advance' && <IssueAdvanceForm employee={selectedEmployee} onSave={handleSaveAdvance} onClose={closeModal} />}
            </Modal>

            <table className="inventory-table" style={{marginTop: '1.5rem'}}>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Business Unit</th>
                        <th>Rate (R/hr)</th>
                        <th>Default Hours</th>
                        <th>Pay Structure</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {employees.map(emp => {
                        const hourlyRate = parseFloat(emp.hourly_rate);
                        const defaultHours = parseFloat(emp.default_hours_per_period);
                        let payStructureDisplay = 'N/A';
                        if (defaultHours > 1) {
                            payStructureDisplay = `R ${(hourlyRate * defaultHours).toFixed(2)} / week`;
                        } else if (defaultHours === 1) {
                            const dailyRate = (hourlyRate / 26).toFixed(2);
                            payStructureDisplay = `R ${dailyRate} / day (Monthly)`;
                        }
                        return (
                            <tr key={emp.id} className="clickable-row" onClick={() => handleRowClick(emp.id)}>
                                <td>{emp.first_name} {emp.last_name || ''}</td>
                                <td>{emp.business_unit_name}</td>
                                <td>R {hourlyRate.toFixed(2)}</td>
                                <td>{defaultHours > 1 ? defaultHours : 'N/A'}</td>
                                <td>{payStructureDisplay}</td>
                                <td>
                                    <button onClick={(e) => { e.stopPropagation(); setModalMode('edit'); setSelectedEmployee(emp); }} className="btn-edit">Edit</button>
                                    <button onClick={(e) => { e.stopPropagation(); setModalMode('advance'); setSelectedEmployee(emp); }} className="btn-edit" style={{marginLeft: '0.5rem'}}>Issue Advance</button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeesPage;