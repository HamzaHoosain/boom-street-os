// frontend/src/pages/TransactionHistoryPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import TransactionDetailsModal from '../components/transactions/TransactionDetailsModal';
import './TransactionHistoryPage.css';

const TransactionHistoryPage = () => {
    // --- THIS IS THE CORRECTED LINE ---
    const { selectedBusiness } = useContext(AuthContext);

    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // State for filtering
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: ''
    });
    
    // State for the drill-down modal
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);

    const fetchTransactions = useCallback(async () => {
        if (!selectedBusiness?.business_unit_id) {
            setTransactions([]);
            setSummary({ totalIncome: 0, totalExpense: 0 });
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError('');
        
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
            setError('Failed to load transactions. Check API and network connection.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedBusiness, filters]);

    useEffect(() => {
        if (selectedBusiness) {
            fetchTransactions();
        }
    }, [fetchTransactions, selectedBusiness]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    
    const handleApplyFilters = () => {
        fetchTransactions();
    };

    const handleRowClick = (transaction) => {
        // Only open the modal for transactions that are designed for drill-down.
        if (transaction.source_reference) {
            setSelectedTransaction(transaction);
            setShowDetailsModal(true);
        } else {
            console.log("No drill-down available for this transaction type.");
        }
    };
    
    const closeModal = () => {
        setShowDetailsModal(false);
        setSelectedTransaction(null);
    }
    
    if (!selectedBusiness) {
        return (
            <div>
                <h1>Transaction History</h1>
                <p>Please select a business to continue.</p>
            </div>
        );
    }

    const netTotal = parseFloat(summary.totalIncome || 0) - parseFloat(summary.totalExpense || 0);

    return (
        <div>
            <h1>Transaction History & Reports</h1>
            <p>Viewing history for <strong>{selectedBusiness.business_unit_name}</strong></p>

            <div className="report-filters">
                <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} className="form-control" />
                <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} className="form-control" />
                <select name="type" value={filters.type} onChange={handleFilterChange} className="form-control">
                    <option value="">All Types</option>
                    <option value="INCOME">Income</option>
                    <option value="EXPENSE">Expense</option>
                </select>
                <button onClick={handleApplyFilters} className="btn-login">Filter</button>
            </div>
            
            <div className="report-summary-bar">
                <div className="summary-widget income">
                    <span>Total Income</span><strong>R {parseFloat(summary.totalIncome || 0).toFixed(2)}</strong>
                </div>
                <div className="summary-widget expense">
                    <span>Total Expense</span><strong>R {parseFloat(summary.totalExpense || 0).toFixed(2)}</strong>
                </div>
                <div className={`summary-widget ${netTotal >= 0 ? 'income' : 'expense'}`}>
                    <span>Net Total</span><strong>R {netTotal.toFixed(2)}</strong>
                </div>
            </div>

            {error && <p className="alert-error">{error}</p>}
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
                                <tr key={t.id} onClick={() => handleRowClick(t)} className={t.source_reference ? "clickable-row" : ""}>
                                    <td>{new Date(t.transaction_date).toLocaleString()}</td>
                                    <td>{t.description}</td>
                                    <td><span className={`status-badge type-${t.type.toLowerCase()}`}>{t.type.replace('_', ' ')}</span></td>
                                    <td>{t.customer_name || t.supplier_name || 'N/A'}</td>
                                    <td className={t.type.includes('INCOME') ? 'income-amount' : 'expense-amount'}>
                                        R {parseFloat(t.amount).toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showDetailsModal && selectedTransaction && (
                <Modal show={showDetailsModal} onClose={closeModal} title={`Details for Txn #${selectedTransaction.id}`}>
                    <TransactionDetailsModal 
                        transaction={selectedTransaction} 
                        onClose={closeModal}
                    />
                </Modal>
            )}
        </div>
    );
};

export default TransactionHistoryPage;