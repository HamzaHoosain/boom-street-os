import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomerDetailsPage.css';

// --- NEW, ADVANCED PAYMENT FORM ---
const RecordPaymentForm = ({ customer, onSave, onClose }) => {
    const [totalAmount, setTotalAmount] = useState('');
    const [safeId, setSafeId] = useState('');
    const [notes, setNotes] = useState('');
    const [safes, setSafes] = useState([]);
    const [unpaidInvoices, setUnpaidInvoices] = useState([]);
    const [allocations, setAllocations] = useState({});
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        api.get('/cash/safes').then(res => setSafes(res.data));
        api.get(`/customers/${customer.id}/unpaid`).then(res => setUnpaidInvoices(res.data));
    }, [customer.id]);

    useEffect(() => {
        // --- Auto-allocation logic ---
        const amountToAllocate = parseFloat(totalAmount) || 0;
        let remainingAmount = amountToAllocate;
        const newAllocations = {};

        for (const invoice of unpaidInvoices) {
            if (remainingAmount <= 0) break;
            const outstanding = parseFloat(invoice.total_amount) - parseFloat(invoice.amount_paid);
            const amountToApply = Math.min(remainingAmount, outstanding);
            newAllocations[invoice.id] = amountToApply.toFixed(2);
            remainingAmount -= amountToApply;
        }
        setAllocations(newAllocations);
    }, [totalAmount, unpaidInvoices]);

    const handleAllocationChange = (invoiceId, value) => {
        setAllocations({ ...allocations, [invoiceId]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const finalAllocations = Object.entries(allocations)
            .map(([sale_id, amount_applied]) => ({
                sale_id: parseInt(sale_id),
                amount_applied: parseFloat(amount_applied) || 0
            }))
            .filter(alloc => alloc.amount_applied > 0);
        
        const paymentData = {
            total_amount: parseFloat(totalAmount),
            safe_id: parseInt(safeId),
            notes,
            business_unit_id: selectedBusiness?.business_unit_id || 6,
            allocations: finalAllocations
        };
        await onSave(paymentData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Total Amount Paid (R)</label>
                <input type="number" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="form-control" required autoFocus />
            </div>
            <div className="form-group">
                <label>Payment Received Into</label>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Till/Account --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" />
            </div>
            <hr />
            <h4>Invoice Allocation</h4>
            <div className="invoice-allocation-list">
                {unpaidInvoices.map(inv => {
                    const outstanding = parseFloat(inv.total_amount) - parseFloat(inv.amount_paid);
                    return (
                        <div key={inv.id} className="invoice-allocation-item">
                            <span>Inv #{inv.id} (Owed: R{outstanding.toFixed(2)})</span>
                            <input
                                type="number"
                                step="0.01"
                                value={allocations[inv.id] || ''}
                                onChange={(e) => handleAllocationChange(inv.id, e.target.value)}
                                className="form-control"
                            />
                        </div>
                    );
                })}
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Record Payment</button>
        </form>
    );
};


// --- Main Page Component ---
const CustomerDetailsPage = () => {
    const { id: customerId } = useParams();
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
            fetchData();
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
                    <button onClick={() => setShowModal(true)} className="btn-login" disabled={balance <= 0}>Record a Payment</button>
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
                        <th>Total Amount</th>
                        <th>Amount Paid</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {history.map(sale => (
                        <tr key={sale.id}>
                            <td><Link to={`/invoice/${sale.id}`} target="_blank">{sale.id}</Link></td>
                            <td>{new Date(sale.sale_date).toLocaleDateString()}</td>
                            <td>R {parseFloat(sale.total_amount).toFixed(2)}</td>
                            <td>R {parseFloat(sale.amount_paid).toFixed(2)}</td>
                            <td><span className={`status-badge ${sale.payment_status.replace(/\s+/g, '-').toLowerCase()}`}>{sale.payment_status}</span></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CustomerDetailsPage;