// frontend/src/pages/EmployeeDetailsPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import Modal from '../components/layout/Modal';
import EmployeeForm from '../components/employees/EmployeeForm'; // <-- IMPORT the reusable form
import './CustomerDetailsPage.css'; // Reuse styles
import '../components/inventory/Inventory.css'; // Reuse table styles

// --- New Form for Assigning a Manual Task ---
const AssignTaskForm = ({ onSave }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ title, description });
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Task Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="form-control" required autoFocus/>
            </div>
            <div className="form-group">
                <label>Description / Notes</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="form-control" rows="3"></textarea>
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Assign Task</button>
        </form>
    );
};

// --- The Main, Overhauled Page Component ---
const EmployeeDetailsPage = () => {
    const { id: employeeId } = useParams();
    const { selectedBusiness } = useContext(AuthContext);
    
    const [employee, setEmployee] = useState(null);
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);

    const fetchData = async () => {
        if (!employeeId) return;
        setLoading(true);
        try {
            const [employeeRes, ledgerRes] = await Promise.all([
                api.get(`/payroll/employees/${employeeId}`),
                api.get(`/payroll/employees/${employeeId}/ledger`)
            ]);
            setEmployee(employeeRes.data);
            setLedger(ledgerRes.data);
        } catch (error) {
            console.error("Failed to fetch employee details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [employeeId]);
    
    const handleSaveEmployeeDetails = async (formData) => {
        try {
            await api.put(`/payroll/employees/${employeeId}`, formData);
            setShowEditModal(false);
            fetchData(); // Refresh data to show changes
        } catch(err) {
            alert('Failed to update employee details.');
        }
    };

    const handleSaveTask = async (taskData) => {
        try {
            const payload = {
                ...taskData,
                assigned_to_user_id: employee.user_id,
                business_unit_id: employee.business_unit_id
            };
            await api.post('/tasks', payload);
            setShowTaskModal(false);
            alert(`Task "${taskData.title}" assigned to ${employee.first_name}.`);
        } catch (err) {
            alert("Failed to assign task.");
        }
    };
    
    if (loading) return <p>Loading employee details...</p>;
    if (!employee) return <p>Employee not found.</p>;

    const totalPaid = ledger.filter(l => l.type === 'Payroll').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalAdvanced = ledger.filter(l => l.type === 'Loan Issued').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    
    const isAdmin = selectedBusiness?.role_name === 'Admin';

    return (
        <div>
            <Link to="/employees" className="back-link">← Back to Employee List</Link>
            <div className="customer-details-header">
                <h1>{employee.first_name} {employee.last_name}</h1>
                <div className="customer-contact"><p>{employee.business_unit_name}</p></div>
            </div>

            <div className="widget-grid">
                <div className="widget income">
                    <h3>Total Paid (Net)</h3>
                    <p className="widget-value">R {totalPaid.toFixed(2)}</p>
                </div>
                <div className="widget expense">
                    <h3>Total Advanced</h3>
                    <p className="widget-value">R {totalAdvanced.toFixed(2)}</p>
                </div>

                <div className="widget action-widget">
                    <h3>Actions</h3>
                    <div className="widget-actions">
                        <button onClick={() => setShowTaskModal(true)} className="btn-action">Assign Task</button>
                        {isAdmin && <button onClick={() => setShowEditModal(true)} className="btn-action">Edit Details</button>}
                    </div>
                </div>
            </div>

            <Modal show={showTaskModal} onClose={() => setShowTaskModal(false)} title={`Assign New Task to ${employee.first_name}`}>
                <AssignTaskForm onSave={handleSaveTask} onClose={() => setShowTaskModal(false)} />
            </Modal>

            <Modal show={showEditModal} onClose={() => setShowEditModal(false)} title={`Edit Details for ${employee.first_name}`}>
                {/* Now correctly using the imported, reusable EmployeeForm component */}
                <EmployeeForm onSave={handleSaveEmployeeDetails} onClose={() => setShowEditModal(false)} employee={employee} />
            </Modal>

            <h2 style={{marginTop: '2rem'}}>Financial Ledger</h2>
            <table className="inventory-table">
                 <thead><tr><th>Date</th><th>Type</th><th>Notes</th><th>Amount</th></tr></thead>
                <tbody>
                    {ledger.map((item, index) => {
                        const isAdvance = item.type === 'Loan Issued';
                        return (
                            <tr key={index}>
                                <td>{new Date(item.date).toLocaleDateString()}</td>
                                <td><span className={`status-badge ${isAdvance ? 'on-account' : 'paid'}`}>{item.type}</span></td>
                                <td>{item.notes}</td>
                                <td style={{ color: isAdvance ? '#dc3545' : '#28a745', fontWeight: '500' }}>R {parseFloat(item.amount).toFixed(2)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeeDetailsPage;