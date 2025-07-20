// frontend/src/pages/TransactionHistoryPage.js - FINAL ENHANCED VERSION
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../components/inventory/Inventory.css'; // Reuse table style

const TransactionHistoryPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        if (!selectedBusiness) return;
        setLoading(true);
        const businessId = selectedBusiness.business_unit_id || 'overview';
        api.get(`/transactions/${businessId}`)
            .then(res => setTransactions(res.data))
            .catch(err => console.error("Failed to fetch transactions", err))
            .finally(() => setLoading(false));
    }, [selectedBusiness]);

    const isOverview = !selectedBusiness.business_unit_id;

    // --- NEW HELPER FUNCTION to determine the display type ---
    const getDisplayInfo = (t) => {
        let displayType = t.type;
        let color = t.type.includes('INCOME') ? 'green' : 'red';
        let tooltip = '';

        if (t.type === 'INCOME' && t.payment_status === 'On Account') {
            displayType = 'EXPECTED INCOME';
            color = '#f0ad4e'; // A warning/orange color
            tooltip = 'This is an Accounts Receivable entry. Cash has not been received yet.';
        }
        if (t.type.includes('INTERNAL')) {
            displayType = 'INTERNAL MOVEMENT';
            color = '#5bc0de'; // An info/blue color
            tooltip = 'This is a non-revenue transfer between business units.';
        }
        if (t.type === 'TRANSFER') {
            displayType = 'CASH TRANSFER';
            color = '#5bc0de';
            tooltip = 'Movement of cash between safes/tills.';
        }

        return { displayType, color, tooltip };
    };

    if (loading) return <p>Loading transaction history...</p>;

    return (
        <div>
            <h1>Transaction History for {selectedBusiness.business_unit_name}</h1>
            <table className="inventory-table">
                <thead>
                    <tr>
                        {isOverview && <th>Business Unit</th>}
                        <th>Date</th>
                        <th>Type</th>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {transactions.map(t => {
                        const { displayType, color, tooltip } = getDisplayInfo(t);
                        return (
                            <tr key={t.id} title={tooltip}>
                                {isOverview && <td>{t.business_unit_name}</td>}
                                <td>{new Date(t.transaction_date).toLocaleString()}</td>
                                <td>
                                    <span 
                                        className="status-badge" 
                                        style={{ backgroundColor: color }}
                                    >
                                        {displayType}
                                    </span>
                                </td>
                                <td>{t.description}</td>
                                <td style={{ color: color }}>
                                    R {parseFloat(t.amount).toFixed(2)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
export default TransactionHistoryPage;