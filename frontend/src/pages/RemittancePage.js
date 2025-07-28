// frontend/src/pages/RemittancePage.js

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Reuse the thermal receipt styles

const RemittancePage = () => {
    const { purchaseId } = useParams();
    const [remittance, setRemittance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchRemittance = async () => {
            if (!purchaseId) {
                setError("Purchase ID is missing.");
                setLoading(false);
                return;
            }
            try {
                // This is the required backend endpoint
                const response = await api.get(`/remittances/${purchaseId}`);
                setRemittance(response.data);
                setTimeout(() => window.print(), 500); // Auto-print
            } catch (err) {
                console.error("Failed to fetch remittance", err);
                setError("Could not load remittance data.");
            } finally {
                setLoading(false);
            }
        };
        fetchRemittance();
    }, [purchaseId]);

    if (loading) return <p>Loading Remittance...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!remittance) return <p>Remittance data not found.</p>;

    // Destructure data from the API response
    const { purchase_details, item, supplier_details, business_unit_details } = remittance;
    
    // Calculate price per kg for display, handle division by zero
    const pricePerKg = (item.weight_kg && item.weight_kg !== 0) 
        ? (purchase_details.payout_amount / item.weight_kg) 
        : 0;

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>{business_unit_details.name}</h1>
                <p>{business_unit_details.address}</p>
                <p>Tel: {business_unit_details.phone}</p>
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>PAYMENT REMITTANCE / PROOF OF PURCHASE</p>
                <p>Purchase ID #{purchase_details.id}</p>
                <p>Date: {new Date(purchase_details.purchase_date).toLocaleDateString()}</p>
            </section>
            
            {supplier_details ? (
                 <>
                    <hr className="receipt-hr" />
                    <section className="receipt-meta">
                         <p>Supplier: {supplier_details.name}</p>
                    </section>
                </>
            ) : (
                <>
                    <hr className="receipt-hr" />
                    <section className="receipt-meta">
                         <p>Supplier: Walk-in</p>
                    </section>
                </>
            )}

            <hr className="receipt-hr" />
            
            <section className="item-list-section">
                <div className="item-entry">
                    <p className="item-description">{item.product_name}</p>
                    <div className="item-details-line">
                        <span>{parseFloat(item.weight_kg).toFixed(2)}kg @ R{pricePerKg.toFixed(2)}/kg</span>
                        <span>R{parseFloat(purchase_details.payout_amount).toFixed(2)}</span>
                    </div>
                </div>
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="final-total-line">
                    <span>TOTAL PAYOUT:</span>
                    <span>R{parseFloat(purchase_details.payout_amount).toFixed(2)}</span>
                </div>
            </section>

             <hr className="receipt-hr" />
             
            <footer className="receipt-footer">
                <p>Goods received and paid for.</p>
            </footer>
        </div>
    );
};

export default RemittancePage;