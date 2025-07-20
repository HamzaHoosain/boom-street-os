import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomerDetailsPage.css'; // We will create this CSS file next

// --- Child Component: The Form for Recording a Payment ---
const RecordPaymentForm = ({ customer, onSave, onClose }) => {
    const [amount, setAmount] = useState('');
    const [safeId, setSafeId] = useState('');
    const [notes, setNotes] = useState('');
    const [safes, setSafes] = useState([]);
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        api.get('/cash/safes').then(res => setSafes(res.data));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const paymentData = {
            amount: parseFloat(amount),
            safe_id: parseInt(safeId),
            notes,
            business_unit_id: selectedBusiness?.business_unit_id || 6 // Default to General/Overhead
        };
        await onSave(paymentData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Payment Received Into</label>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Till/Account --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Amount Paid (R)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Notes (e.g., "Payment for invoice 123")</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Record Payment</button>
        </form>
    );
};

// --- Main Page Component ---
const CustomerDetailsPage = () => {
    const { id: customerId } = useParams(); // Get customer ID from the URL
    const [customer, setCustomer] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [customerRes, historyRes] = await Promise.all([
                api.get(`/customers/${customerId}`),
                api.get(`/customers/${customerId}/history`)
            ]);
            setCustomer(customerRes.data);
            setHistory(historyRes.data);
        } catch (error) {
            console.error("Failed to fetch customer details", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [customerId]);

    const handleSavePayment = async (paymentData) => {
        try {
            await api.post(`/customers/${customerId}/payment`, paymentData);
            setShowModal(false);
            fetchData(); // Refresh all data on the page to show the new balance
        } catch (error) {
            alert("Failed to record payment.");
            throw error;
        }
    };

    if (loading) return <p>Loading customer details...</p>;
    if (!customer) return <p>Customer not found.</p>;

    const balance = parseFloat(customer.account_balance);

    return (
        <div>
            <Link to="/customers" className="back-link">← Back to Customer List</Link>
            <div className="customer-details-header">
                <h1>{customer.name}</h1>
                <div className="customer-contact">
                    <p>{customer.phone_number}</p>
                    <p>{customer.email}</p>
                </div>
            </div>

            <div className="widget-grid">
                <div className={`widget ${balance > 0 ? 'expense' : 'income'}`}>
                    <h3>Current Balance</h3>
                    <p className="widget-value">R {balance.toFixed(2)}</p>
                </div>
                <div className="widget">
                    <h3>Total Purchases</h3>
                    <p className="widget-value">{history.length}</p>
                </div>
                <div className="widget action-widget">
                    <h3>Manage Account</h3>
                    <button onClick={() => setShowModal(true)} className="btn-login">Record a Payment</button>
                </div>
            </div>

            <Modal show={showModal} onClose={() => setShowModal(false)} title={`Record Payment for ${customer.name}`}>
                <RecordPaymentForm customer={customer} onSave={handleSavePayment} onClose={() => setShowModal(false)} />
            </Modal>

            <h2 style={{marginTop: '2rem'}}>Purchase History</h2>
            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map(sale => (
                        <tr key={sale.id}>
                            <td><Link to={`/invoice/${sale.id}`} target="_blank">{sale.id}</Link></td>
                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                            <td>R {parseFloat(sale.total_amount).toFixed(2)}</td>
                            <td><span className={`status-badge ${sale.payment_status.replace(/\s+/g, '-').toLowerCase()}`}>{sale.payment_status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerDetailsPage;