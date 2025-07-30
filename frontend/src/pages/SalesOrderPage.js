// frontend/src/pages/SalesOrderPage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Reuse the 58mm thermal receipt styles

const SalesOrderPage = () => {
    const { soId } = useParams(); // Matches the route parameter
    const [soData, setSoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSO = async () => {
            try {
                // You must build GET /api/sales-orders/:id on your backend
                const response = await api.get(`/sales-orders/${soId}`);
                setSoData(response.data);
            } catch (err) {
                console.error("Failed to load SO:", err);
                setError('Failed to load Sales Order data.');
            } finally {
                setLoading(false);
            }
        };
        fetchSO();
    }, [soId]);

    useEffect(() => {
        if (soData) setTimeout(() => window.print(), 500);
    }, [soData]);

    if (loading) return <p className="invoice-loading">Loading Sales Order...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!soData) return <p className="invoice-not-found">Sales Order not found.</p>;

    const { so_details, line_items, business_unit_details, customer_details } = soData;

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>Sales Order</h1>
                <p>{business_unit_details?.name || 'Your Business'}</p>
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>Order #{so_details.id}</p>
                <p>Date: {new Date(so_details.order_date).toLocaleDateString()}</p>
            </section>

            <hr className="receipt-hr" />
            
            {customer_details?.name && (
                <section className="receipt-meta">
                     <p>For Customer: {customer_details.name}</p>
                </section>
            )}
            
            <hr className="receipt-hr" />

            <section className="item-list-section">
                {line_items.map(item => (
                    <div className="item-entry" key={item.id}>
                        <p className="item-description">{item.product_name}</p>
                        <div className="item-details-line">
                            <span>{parseFloat(item.quantity)} x R{parseFloat(item.price_at_order).toFixed(2)}</span>
                            <span>R{(parseFloat(item.quantity) * parseFloat(item.price_at_order)).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="summary-line">
                    <span>Sub-Total:</span>
                    <span>R{parseFloat(so_details.subtotal).toFixed(2)}</span>
                </div>
                <div className="summary-line">
                    <span>VAT @ 15%:</span>
                    <span>R{parseFloat(so_details.total_vat).toFixed(2)}</span>
                </div>
                <div className="final-total-line">
                    <span>TOTAL:</span>
                    <span>R{parseFloat(so_details.total_amount).toFixed(2)}</span>
                </div>
            </section>
            
            <hr className="receipt-hr" />

            <footer className="receipt-footer">
                <p>Thank you for your order!</p>
            </footer>
        </div>
    );
};

export default SalesOrderPage;