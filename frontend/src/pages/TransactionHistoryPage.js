// frontend/src/pages/TransactionHistoryPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import TransactionDetailsModal from '../components/transactions/TransactionDetailsModal';
import './TransactionHistoryPage.css';

const TransactionHistoryPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ totalIncome: 0, totalExpense: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState(null);
    
    const [filters, setFilters] = useState({
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        type: ''
    });
    
    // This state is for the *active* filters that have been submitted
    const [activeFilters, setActiveFilters] = useState(filters);
    
    useEffect(() => {
        const fetchTransactions = async () => {
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
            if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
            if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
            if (activeFilters.type) params.append('type', activeFilters.type);

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
        };

        fetchTransactions();
    // Re-run this effect ONLY when the business or the *active* filters change.
    }, [selectedBusiness, activeFilters]);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };
    
    // The "Apply Filters" button now updates the `activeFilters`, which triggers the useEffect
    const handleApplyFilters = () => {
        setActiveFilters(filters);
    };
    const handleRowClick = (transaction) => {
        if (!transaction.source_reference) return;
        setSelectedTransaction(transaction);
        setShowDetailsModal(true);
    };
    const closeModal = () => { setSelectedTransaction(null); setShowDetailsModal(false); };

       const getTransactionDisplayInfo = (transaction) => {
        // Use optional chaining for safety. Provide a default empty string.
        const type = transaction.type || '';
        const description = transaction.description?.toLowerCase() || '';

        // Now, perform checks using .includes() which is more robust
        // against variations like 'INCOME' vs 'INTERNAL_INCOME'
        
        // Handle special cases first
        if (type.includes('INCOME') && description.includes('on_account')) {
            return { label: 'On Account', className: 'receivable' };
        }
        if (type === 'ACCOUNT_PAYMENT') {
            return { label: 'Account Payment', className: 'neutral' };
        }

        // Handle general cases
        if (type.includes('INCOME')) {
            return { label: 'Income', className: 'income' };
        }
        if (type.includes('EXPENSE')) {
            return { label: 'Expense', className: 'expense' };
        }
        
        // Fallback for anything else (REVERSAL, TRANSFER, etc.)
        return { label: type.replace('_', ' '), className: 'generic' };
    };

    if (!selectedBusiness) {
        return <div><h1>Transaction History</h1><p>Please select a business to continue.</p></div>;
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
                            {transactions.map(t => {
                                // For each transaction, get its specific display info
                                const displayInfo = getTransactionDisplayInfo(t);

                                return (
                                    <tr key={t.id} onClick={() => handleRowClick(t)} className={t.source_reference ? "clickable-row" : ""}>
                                        <td>{new Date(t.transaction_date).toLocaleString()}</td>
                                        <td>{t.description}</td>
                                        <td>
                                            {/* Use the new class and label */}
                                             <span className={`status-badge type-${displayInfo.className}`}>{displayInfo.label}</span>
                                        </td>
                                        <td>{t.party_name || 'N/A'}</td>

                                        {/* --- THIS IS THE CORRECTED LINE --- */}
                                         <td className={`${displayInfo.className}-amount`}>
                                            R {parseFloat(t.amount).toFixed(2)}
                                        
                                        
                                        
                                        </td>
                                    </tr>
                                );
                            })}
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