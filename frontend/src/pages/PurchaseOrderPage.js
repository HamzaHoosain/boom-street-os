// frontend/src/pages/PurchaseOrderPage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Reuse the 58mm thermal receipt styles

const PurchaseOrderPage = () => {
    const { poId } = useParams(); // Matches the route parameter
    const [poData, setPoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPO = async () => {
            try {
                // You must build GET /api/purchase-orders/:id on your backend
                const response = await api.get(`/purchase-orders/${poId}`);
                setPoData(response.data);
            } catch (err) {
                console.error("Failed to load PO:", err);
                setError('Failed to load Purchase Order data.');
            } finally {
                setLoading(false);
            }
        };
        fetchPO();
    }, [poId]);

    useEffect(() => {
        if (poData) setTimeout(() => window.print(), 500);
    }, [poData]);

    if (loading) return <p className="invoice-loading">Loading Purchase Order...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!poData) return <p className="invoice-not-found">Purchase Order not found.</p>;

    const { po_details, line_items, business_unit_details, supplier_details } = poData;

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>PURCHASE ORDER</h1>
                <p>{business_unit_details?.name || 'Your Business'}</p>
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>PO #{po_details.id}</p>
                <p>Date: {new Date(po_details.order_date).toLocaleDateString()}</p>
            </section>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                 <p>To Supplier: {supplier_details.name}</p>
            </section>
            
            <hr className="receipt-hr" />

            <section className="item-list-section">
                {line_items.map(item => (
                    <div className="item-entry" key={item.id}>
                        <p className="item-description">{item.product_name}</p>
                        <div className="item-details-line">
                            <span>{parseFloat(item.quantity)} x R{parseFloat(item.cost_at_order).toFixed(2)}</span>
                            <span>R{(parseFloat(item.quantity) * parseFloat(item.cost_at_order)).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="final-total-line">
                    <span>TOTAL (COST):</span>
                    <span>R{parseFloat(po_details.total_amount).toFixed(2)}</span>
                </div>
            </section>
            
            <hr className="receipt-hr" />

            <footer className="receipt-footer">
                <p>Please deliver goods to:</p>
                <p>{(business_unit_details?.address || '').split('\n').join(', ')}</p>
            </footer>
        </div>
    );
};

export default PurchaseOrderPage;