// frontend/src/components/transactions/TransactionDetailsModal.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './TransactionDetailsModal.css'; // We will create this CSS file in the next step

const TransactionDetailsModal = ({ transaction, onClose }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

     useEffect(() => {
        // Fetch details if a transaction object is provided
        if (transaction && transaction.id) {
            const fetchDetails = async () => {
                setLoading(true);
                setError('');
                try {
                    // --- CRITICAL FIX ---
                    // Call the correct API endpoint using the transaction's OWN ID
                    const response = await api.get(`/transactions/details/${transaction.id}`);
                    
                    // The API returns an object { transaction, details }, so we just use the 'details' part
                    setDetails(response.data.details);

                } catch (err) {
                    console.error("Failed to fetch transaction details", err);
                    setError("Could not load the operational details for this transaction.");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        } else {
            // No transaction ID means nothing to fetch.
            setLoading(false);
        }
    }, [transaction]);

    // This function decides what to render based on the loaded data
    const renderContent = () => {
        if (loading) {
            return <p>Loading details...</p>;
        }
        if (error) {
            return <p className="alert-error">{error}</p>;
        }
        if (!details) {
            return <p>No specific operational details are linked to this financial transaction.</p>;
        }

        // --- Render different views based on the `type` returned from the API ---
        switch (details.type) {
            case 'sale':
                return (
                    <div className="details-section">
                        <h4>Sale #{details.sale_details.id}</h4>
                        <p><strong>Customer:</strong> {details.sale_details.customer_name || 'Cash Sale'}</p>
                        <p><strong>Payment Method:</strong> {details.sale_details.payment_method}</p>
                        <h5>Items Sold:</h5>
                        <ul className="details-list">
                            {details.line_items.map(item => (
                                <li key={item.id}>
                                    {item.quantity_sold} x {item.product_name}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            
            case 'scrap_purchase':
                return (
                    <div className="details-section">
                        <h4>Scrap Payout</h4>
                        <p><strong>Supplier:</strong> {details.supplier_name || 'Walk-in Supplier'}</p>
                        <h5>Materials Purchased:</h5>
                        <ul className="details-list">
                            {details.purchase_items.map(item => (
                                <li key={item.id}>
                                    {item.weight_kg}kg of {item.product_name}
                                </li>
                            ))}
                        </ul>
                    </div>
                );

            // You can add more `case` blocks here in the future for other types
            // e.g., case 'stock_take':

            default:
                return <p>No specific details view available for this transaction type.</p>;
        }
    };

    return (
        <div className="transaction-details-content">
            <div className="details-header">
                <div>
                    <strong>Date:</strong> {new Date(transaction.transaction_date).toLocaleString()} <br/>
                    <strong>Description:</strong> {transaction.description}
                </div>
                <div className={`details-amount ${transaction.type.includes('INCOME') ? 'income' : 'expense'}`}>
                    R {parseFloat(transaction.amount).toFixed(2)}
                </div>
            </div>
            <hr />
            <div className="details-body">
                {renderContent()}
            </div>
        </div>
    );
};

export default TransactionDetailsModal;