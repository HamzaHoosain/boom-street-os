import React, {useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import '../components/inventory/Inventory.css'; // Reuse table style
import './CustomerDetailsPage.css'; // Reuse header and widget styles

const EmployeeDetailsPage = () => {
    const { id: employeeId } = useParams(); // Get employee ID from the URL
    const [employee, setEmployee] = useState(null); // To store employee's main details
    const [ledger, setLedger] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch both the employee's main details and their financial ledger in parallel
                const [employeeRes, ledgerRes] = await Promise.all([
                    api.get(`/payroll/employees/${employeeId}`), // We need to build this simple endpoint
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

        if (employeeId) {
            fetchData();
        }
    }, [employeeId]);

    if (loading) return <p>Loading employee details...</p>;
    if (!employee) return <p>Employee not found.</p>;

    // Calculate summary figures from the ledger
    const totalPaid = ledger.filter(l => l.type === 'Payroll').reduce((sum, item) => sum + parseFloat(item.amount), 0);
    const totalAdvanced = ledger.filter(l => l.type === 'Loan Issued').reduce((sum, item) => sum + parseFloat(item.amount), 0);

    return (
        <div>
            <Link to="/employees" className="back-link">← Back to Employee List</Link>
            <div className="customer-details-header">
                <h1>{employee.first_name} {employee.last_name}</h1>
                <div className="customer-contact">
                    <p>{employee.business_unit_name}</p>
                </div>
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
            </div>

            <h2 style={{marginTop: '2rem'}}>Financial Ledger</h2>
            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Type</th>
                        <th>Notes</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {ledger.map((item, index) => {
                        const isAdvance = item.type === 'Loan Issued';
                        return (
                            <tr key={index}>
                                <td>{new Date(item.date).toLocaleDateString()}</td>
                                <td>
                                    <span className={`status-badge ${isAdvance ? 'on-account' : 'paid'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td>{item.notes}</td>
                                <td style={{ color: isAdvance ? '#dc3545' : '#28a745', fontWeight: '500' }}>
                                    R {parseFloat(item.amount).toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default EmployeeDetailsPage;