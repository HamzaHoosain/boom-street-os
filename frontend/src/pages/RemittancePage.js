// frontend/src/pages/RemittancePage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Reuse the thermal receipt styles

const RemittancePage = () => {
    const { purchaseId } = useParams();
    const [remittanceData, setRemittanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!purchaseId) return;
        const fetchRemittance = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/purchases/${purchaseId}`);
                setRemittanceData(response.data);
            } catch (err) {
                setError('Failed to load remittance data.');
            } finally {
                setLoading(false);
            }
        };
        fetchRemittance();
    }, [purchaseId]);

    useEffect(() => {
        if (remittanceData) setTimeout(() => window.print(), 500);
    }, [remittanceData]);

    if (loading) return <p>Loading Remittance...</p>;
    if (error) return <p>{error}</p>;
    if (!remittanceData || !remittanceData.purchase_details) return <p>Remittance data not found.</p>;

    const { purchase_details, line_items, business_unit_details, supplier_details } = remittanceData;

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>REMITTANCE ADVICE</h1>
                <p>{business_unit_details?.name}</p>
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>Purchase #{purchase_details.id}</p>
                <p>Date: {new Date(purchase_details.purchase_date).toLocaleDateString()}</p>
            </section>

            <hr className="receipt-hr" />
            
            {supplier_details?.name && (
                <section className="receipt-meta">
                     <p>From Supplier: {supplier_details.name}</p>
                </section>
            )}
            
            <hr className="receipt-hr" />

            <section className="item-list-section">
                {line_items.map((item, index) => (
                    <div className="item-entry" key={index}>
                        <p className="item-description">{item.product_name}</p>
                        <div className="item-details-line">
                            <span>{parseFloat(item.weight_kg).toFixed(2)}kg</span>
                            <span>R{parseFloat(item.payout_amount).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="final-total-line">
                    <span>TOTAL PAYOUT:</span>
                    <span>R{parseFloat(purchase_details.payout_amount).toFixed(2)}</span>
                </div>
            </section>
        </div>
    );
};

export default RemittancePage;