// frontend/src/pages/TransactionHistoryPage.js
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
        const businessId = selectedBusiness.business_unit_id || 'overview';
        api.get(`/transactions/${businessId}`)
            .then(res => setTransactions(res.data))
            .catch(err => console.error("Failed to fetch transactions", err))
            .finally(() => setLoading(false));
    }, [selectedBusiness]);

    const isOverview = !selectedBusiness.business_unit_id;

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
                    {transactions.map(t => (
                        <tr key={t.id}>
                            {isOverview && <td>{t.business_unit_name}</td>}
                            <td>{new Date(t.transaction_date).toLocaleString()}</td>
                            <td>{t.type}</td>
                            <td>{t.description}</td>
                            <td style={{ color: t.type.includes('INCOME') ? 'green' : 'red' }}>
                                R {parseFloat(t.amount).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};
export default TransactionHistoryPage;