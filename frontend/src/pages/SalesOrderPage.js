// frontend/src/pages/SalesOrderPage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Reuse the A4 invoice styles

const SalesOrderPage = () => {
    const { soId } = useParams();
    const [soData, setSoData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSO = async () => {
            try {
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

    // --- THIS IS THE CRITICAL FIX ---
    // We now check not just for loading, but if soData or its critical properties exist yet.
    // This prevents the render crash.
    if (loading) return <p className="invoice-loading">Loading Sales Order...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!soData || !soData.so_details) return <p className="invoice-not-found">Sales Order data is incomplete or not found.</p>;

    const { so_details, line_items, business_unit_details, customer_details } = soData;
    const VAT_RATE = 0.15;

    return (
        <div className="invoice-container">
            <header className="invoice-header">
                <div className="invoice-title-block">
                    <h1>Sales Order</h1>
                    <p className="invoice-meta-item"><strong>Order #:</strong> {so_details.id}</p>
                    <p className="invoice-meta-item"><strong>Date:</strong> {new Date(so_details.order_date).toLocaleDateString()}</p>
                </div>
                <div className="company-details">
                     <strong>{business_unit_details?.name}</strong><br />
                </div>
            </header>
            
            <section className="customer-details-section">
                <h3>Customer:</h3>
                <p><strong>{customer_details?.name || 'N/A'}</strong></p>
            </section>

            <table className="invoice-items-table">
                <thead>
                    <tr>
                        <th className="description-col">Description</th>
                        <th className="qty-col">Qty Ordered</th>
                        <th className="unit-price-col">Unit Price (Incl. VAT)</th>
                        <th className="total-col">Total (Incl. VAT)</th>
                    </tr>
                </thead>
                <tbody>
                    {line_items.map(item => (
                        <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td className="qty-col">{parseFloat(item.quantity).toFixed(2)}</td>
                            <td className="unit-price-col">R {parseFloat(item.price_at_order).toFixed(2)}</td>
                            <td className="total-col">R {(parseFloat(item.quantity) * parseFloat(item.price_at_order)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

             <footer className="invoice-footer">
                <div className="invoice-summary">
                    <div className="summary-line">
                        <span>Subtotal (Excl. VAT):</span>
                        <span>R {parseFloat(so_details.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="summary-line">
                        <span>VAT ({VAT_RATE * 100}%):</span>
                        <span>R {parseFloat(so_details.total_vat).toFixed(2)}</span>
                    </div>
                    <hr className="summary-divider" />
                    <div className="summary-line final-total-line">
                        <span>Total:</span>
                        <span>R {parseFloat(so_details.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default SalesOrderPage;