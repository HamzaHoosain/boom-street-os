// frontend/src/components/transactions/TransactionDetailsModal.js

import React, { useState, useEffect } from 'react'; // CORRECTED IMPORT
import api from '../../services/api';
import './TransactionDetailsModal.css';

const TransactionDetailsModal = ({ transaction, onClose }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const getAmountClass = (transaction) => {
        const type = transaction.type.toLowerCase();
        const description = transaction.description?.toLowerCase() || '';

        // If the transaction is income AND the description says "on_account", use the special 'receivable' class.
        if (type === 'income' && description.includes('on_account')) {
            return 'receivable';
        }
        // For any other income, use the 'income' class.
        if (type.includes('income')) {
            return 'income';
        }
        // Otherwise, it's an 'expense'.
        return 'expense';
    };

    useEffect(() => {
        if (transaction && transaction.id) {
            const fetchDetails = async () => {
                setLoading(true);
                setError('');
                try {
                    const response = await api.get(`/transactions/details/${transaction.id}`);
                    setDetails(response.data.details);
                } catch (err) {
                    console.error("Failed to fetch transaction details", err);
                    setError("Could not load the operational details for this transaction.");
                } finally {
                    setLoading(false);
                }
            };
            fetchDetails();
        }
    }, [transaction]);

     const renderContent = () => {
        if (loading) return <p>Loading details...</p>;
        if (error) return <p className="alert-error">{error}</p>;
        if (!details || details.type === 'Generic') return <p>No specific operational details are linked to this financial transaction.</p>;

        switch (details.type) {
            case 'Sale':
                // --- CRITICAL FIX FOR NaN: We now get the full sale item record ---
                return (
                    <div className="details-section">
                        <h4>Sale #{details.sale_details.id}</h4>
                        <p><strong>Customer:</strong> {details.sale_details.customer_name || 'Cash Sale'}</p>
                        <h5>Items Sold:</h5>
                        <ul className="details-list">
                            {details.items.map(item => (
                                <li key={item.id}>
                                    {item.quantity_sold} x {item.product_name} @ R{parseFloat(item.price_at_sale || 0).toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                );
            
            case 'Scrap Purchase':
                return (
                    <div className="details-section">
                        <h4>Scrap Purchase Details</h4>
                        <p><strong>Supplier:</strong> {details.supplier_name || 'Walk-in'}</p>
                        <h5>Materials Purchased:</h5>
                        <ul className="details-list">
                            {details.items.map((item, index) => (
                                <li key={index}>
                                    {item.product_name}: {item.weight_kg} kg for R{parseFloat(item.payout_amount || 0).toFixed(2)}
                                </li>
                            ))}
                        </ul>
                    </div>
                );


            case 'Stock Take':
                 return (
                    <div className="details-section">
                        <h4>Stock Take Details</h4>
                        <p><strong>Processed by:</strong> {details.user_name}</p>
                         <h5>Adjustments:</h5>
                        <ul className="details-list">
                            {details.items && details.items.map((item, index) => (
                                <li key={index}>
                                    {item.product}: {item.variance} units (Value: R{parseFloat(item.value).toFixed(2)})
                                </li>
                            ))}
                        </ul>
                    </div>
                );

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
                
                {/* --- REPLACE THIS DIV'S CLASSNAME --- */}
                {/* OLD: <div className={`details-amount ${transaction.type.includes('INCOME') ? 'income' : 'expense'}`}> */}
                {/* NEW, smarter version: */}
                <div className={`details-amount ${getAmountClass(transaction)}`}>

                    R {parseFloat(transaction.amount).toFixed(2)}
                </div>
                {/* --- END OF REPLACEMENT --- */}

            </div>
            <hr />
            <div className="details-body">
                {renderContent()}
            </div>
        </div>
    );
};

export default TransactionDetailsModal;