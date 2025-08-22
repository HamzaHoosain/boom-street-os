// frontend/src/pages/A4InvoicePage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './A4InvoicePage.css'; // A new, dedicated stylesheet for the A4 layout

const A4InvoicePage = () => {
    const { saleId } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // It uses the EXACT SAME API endpoint as your thermal receipt.
        const fetchInvoice = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/invoices/${saleId}`);
                setInvoice(response.data);
            } catch (err) {
                console.error("Failed to load A4 invoice data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [saleId]);

    // Auto-print logic
    useEffect(() => {
        if (invoice) setTimeout(() => window.print(), 500);
    }, [invoice]);

    if (loading || !invoice) return <p className="invoice-loading">Loading Invoice...</p>;

    const { 
        sale_details, 
        line_items, 
        business_unit_details, 
        customer_details 
    } = invoice;
    
    const subtotalExclVAT = parseFloat(sale_details.total_amount) - parseFloat(sale_details.total_vat_amount);

    return (
        // --- THIS IS THE PROFESSIONAL A4 LAYOUT JSX ---
        <div className="invoice-container">
            <header className="invoice-header">
                <div className="invoice-title-block">
                    <h1>Tax Invoice</h1>
                    <p className="invoice-meta-item"><strong>Invoice #:</strong> {sale_details.id}</p>
                    <p className="invoice-meta-item"><strong>Date:</strong> {new Date(sale_details.sale_date).toLocaleDateString()}</p>
                </div>
                <div className="company-details">
                    <strong>{business_unit_details?.name}</strong><br />
                    {/* Placeholder for when you add address to business_units */}
                    {/* <span>Address Line 1</span><br />
                    <span>VAT Reg: 123456789</span> */}
                </div>
            </header>
            
            <section className="customer-details-section">
                <h3>Bill To:</h3>
                <p>
                    <strong>{customer_details?.name || 'Cash Sale'}</strong><br />
                    {/* Add more customer details here when available */}
                </p>
            </section>

            <table className="invoice-items-table">
                <thead>
                    <tr>
                        <th className="description-col">Description</th>
                        <th className="qty-col">Qty</th>
                        <th className="unit-price-col">Unit Price (Incl. VAT)</th>
                        <th className="total-col">Total (Incl. VAT)</th>
                    </tr>
                </thead>
                <tbody>
                    {line_items.map(item => (
                        <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td className="qty-col">{parseFloat(item.quantity_sold).toFixed(2)}</td>
                            <td className="unit-price-col">R {parseFloat(item.price_at_sale).toFixed(2)}</td>
                            <td className="total-col">R {(parseFloat(item.quantity_sold) * parseFloat(item.price_at_sale)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <footer className="invoice-footer">
                <div className="thank-you-note">
                    <p>Thank you for your business!</p>
                </div>
                <div className="invoice-summary">
                    <div className="summary-line">
                        <span>Subtotal (Excl. VAT):</span>
                        <span>R {subtotalExclVAT.toFixed(2)}</span>
                    </div>
                    <div className="summary-line">
                        <span>Total VAT (15%):</span>
                        <span>R {parseFloat(sale_details.total_vat_amount).toFixed(2)}</span>
                    </div>
                    <hr className="summary-divider" />
                    <div className="summary-line final-total-line">
                        <span>Total Due:</span>
                        <span>R {parseFloat(sale_details.total_amount).toFixed(2)}</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default A4InvoicePage;