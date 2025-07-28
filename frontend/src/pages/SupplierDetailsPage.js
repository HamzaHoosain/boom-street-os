// frontend/src/pages/SupplierDetailsPage.js

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
// Import modal and other components as needed for future "Log Payment" functionality
import './CustomerDetailsPage.css'; // Reuse styles

const SupplierDetailsPage = () => {
    const { supplierId } = useParams();
    const [supplier, setSupplier] = useState(null);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Assumes a backend route GET /api/suppliers/:id which returns { supplier, history }
            const response = await api.get(`/suppliers/${supplierId}`);
            setSupplier(response.data.supplier);
            setHistory(response.data.history);
        } catch (error) {
            console.error("Failed to fetch supplier details", error);
        } finally {
            setLoading(false);
        }
    }, [supplierId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) return <p>Loading supplier details...</p>;
    if (!supplier) return <p>Supplier not found.</p>;

    const balance = parseFloat(supplier.account_balance);

    return (
        <div>
            <Link to="/suppliers" className="back-link">← Back to Supplier List</Link>
            <div className="customer-details-header">
                <h1>{supplier.name}</h1>
                <div className="customer-contact">
                    <p>{supplier.phone_number}</p>
                    <p>{supplier.email}</p>
                </div>
            </div>

            <div className="widget-grid">
                <div className={`widget ${balance > 0 ? 'payable' : 'neutral'}`}>
                    <h3>Amount Payable (You Owe)</h3>
                    <p className="widget-value">R {balance.toFixed(2)}</p>
                </div>
                 <div className="widget action-widget">
                    <h3>Manage Account</h3>
                     {/* Placeholder for future "Log Payment" functionality */}
                    <button className="btn-login" disabled>Log a Payment</button>
                </div>
            </div>

            <h2 style={{marginTop: '2rem'}}>Purchase History</h2>
            <div className="table-wrapper">
                 <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Purchase ID</th>
                            <th>Date</th>
                            <th>Total Payout</th>
                            <th>View</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map(purchase => (
                            <tr key={purchase.id}>
                                <td>#{purchase.id}</td>
                                <td>{new Date(purchase.purchase_date).toLocaleDateString()}</td>
                                <td>R {parseFloat(purchase.payout_amount).toFixed(2)}</td>
                                <td>
                                    <Link to={`/remittance/${purchase.id}`} target="_blank" className="btn-edit">View Remittance</Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SupplierDetailsPage;