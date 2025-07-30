// frontend/src/pages/TransactionHistoryPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './TransactionHistoryPage.css'; // New CSS file for this page

// --- NEW: Child component for the Details Modal ---
const TransactionDetailsModal = ({ transaction, details, onClose }) => {
    // A simple, readable display for the rich data from the drill-down API
    return (
        <div>
            <h3>Details for Transaction #{transaction.id}</h3>
            <p><strong>Type:</strong> {details.type}</p>
            <p><strong>Description:</strong> {transaction.description}</p>
            <hr />
            {details.type === 'Sale' && (
                <div>
                    <h4>Sale Details</h4>
                    <p><strong>Customer:</strong> {details.customer_name || 'Cash Sale'}</p>
                    <p><strong>Total Amount:</strong> R{parseFloat(details.total_amount).toFixed(2)}</p>
                    <p><strong>Payment Method:</strong> {details.payment_method}</p>
                    <h5>Items:</h5>
                    <ul>
                        {details.items.map((item, index) => (
                            <li key={index}>{item.qty} x {item.name} @ R{parseFloat(item.price).toFixed(2)}</li>
                        ))}
                    </ul>
                </div>
            )}
             {details.type === 'Scrap Purchase' && (
                <div>
                    <h4>Scrap Purchase Details</h4>
                    <p><strong>Supplier:</strong> {details.supplier_name || 'Walk-in'}</p>
                    <p><strong>Material:</strong> {details.product_name}</p>
                     <p><strong>Weight:</strong> {details.weight_kg} kg</p>
                    <p><strong>Total Payout:</strong> R{parseFloat(details.payout_amount).toFixed(2)}</p>
                </div>
            )}
             {details.type === 'Stock Take' && (
                <div>
                    <h4>Stock Take Details</h4>
                    <p><strong>Processed by:</strong> {details.user_name}</p>
                     <h5>Adjustments:</h5>
                    <ul>
                        {details.items.map((item, index) => (
                            <li key={index}>
                                {item.product}: {item.variance} units (Value: R{parseFloat(item.value).toFixed(2)})
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// --- Main Page Component ---
const TransactionHistoryPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for filtering
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: ''
    });
    
    // State for the drill-down modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    const [transactionDetails, setTransactionDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);


    const fetchTransactions = useCallback(async () => {
        if (!selectedBusiness) return;
        setLoading(true);
        setError('');
        
        // Build query string from filters
        const params = new URLSearchParams({
            businessUnitId: selectedBusiness.business_unit_id,
        });
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.type) params.append('type', filters.type);

        try {
            const response = await api.get(`/transactions?${params.toString()}`);
            setTransactions(response.data.transactions);
            setSummary(response.data.summary);
        } catch (err) {
            setError('Failed to load transactions.');
        } finally {
            setLoading(false);
        }
    }, [selectedBusiness, filters]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    
    // This function is called when the filter button is clicked
    const handleApplyFilters = () => {
        fetchTransactions();
    };

    // Handler to open the drill-down modal
    const handleRowClick = async (transaction) => {
        setSelectedTransaction(transaction);
        setDetailsLoading(true);
        setShowDetailsModal(true);
        try {
            const response = await api.get(`/transactions/details/${transaction.id}`);
            setTransactionDetails(response.data.details);
        } catch(err) {
            console.error("Failed to fetch details", err);
        } finally {
            setDetailsLoading(false);
        }
    };
    
    const closeModal = () => {
        setShowDetailsModal(false);
        setSelectedTransaction(null);
        setTransactionDetails(null);
    }
    
    const netTotal = summary.totalIncome - summary.totalExpense;

    return (
        <div>
            <h1>Transaction History & Reports</h1>

            <div className="report-filters">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-control" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-control" />
                <select name="type" value={filters.type} onChange={handleFilterChange} className="form-control">
                    <option value="">All Types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                    <option value="STOCK_GAIN">Stock Gain</option>
                    {/* Add other transaction types as they are created */}
                </select>
                <button onClick={handleApplyFilters} className="btn-login">Apply Filters</button>
            </div>
            
             <div className="report-summary-bar">
                <div className="summary-widget income">
                    <span>Total Income</span><strong>R {parseFloat(summary.totalIncome).toFixed(2)}</strong>
                </div>
                <div className="summary-widget expense">
                    <span>Total Expense</span><strong>R {parseFloat(summary.totalExpense).toFixed(2)}</strong>
                </div>
                <div className={`summary-widget ${netTotal >= 0 ? 'income' : 'expense'}`}>
                    <span>Net Total</span><strong>R {netTotal.toFixed(2)}</strong>
                </div>
            </div>

            {loading ? <p>Loading transactions...</p> : (
                <div className="table-wrapper">
                     <table className="inventory-table transaction-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Description</th>
                                <th>Type</th>
                                <th>Customer/Supplier</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(t => (
                                <tr key={t.id} onClick={() => handleRowClick(t)} className="clickable-row">
                                    <td>{new Date(t.transaction_date).toLocaleString()}</td>
                                    <td>{t.description}</td>
                                    <td><span className={`status-badge type-${t.type.toLowerCase()}`}>{t.type.replace('_', ' ')}</span></td>
                                    <td>{t.customer_name || t.supplier_name || 'N/A'}</td>
                                    <td className={t.type === 'INCOME' || t.type === 'STOCK_GAIN' ? 'income-amount' : 'expense-amount'}>
                                        R {parseFloat(t.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showDetailsModal && selectedTransaction && (
                <Modal show={showDetailsModal} onClose={closeModal} title="Transaction Drill-Down">
                    {detailsLoading ? <p>Loading details...</p> : 
                        <TransactionDetailsModal 
                            transaction={selectedTransaction} 
                            details={transactionDetails}
                            onClose={closeModal}
                        />
                    }
                </Modal>
            )}

        </div>
    );
};

export default TransactionHistoryPage;