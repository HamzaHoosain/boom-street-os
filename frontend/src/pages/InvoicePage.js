// frontend/src/pages/InvoicePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css';

const InvoicePage = () => {
    const { saleId } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                const response = await api.get(`/invoices/${saleId}`);
                setInvoice(response.data);
            } catch (err) {
                setError('Failed to load invoice data.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [saleId]);

    // Automatically trigger the print dialog once the data has loaded
    useEffect(() => {
        if (invoice) {
            window.print();
        }
    }, [invoice]);

    if (loading) return <p>Loading Invoice...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!invoice) return <p>No invoice data found.</p>;

    const { sale_details, line_items } = invoice;

    return (
        <div className="invoice-container">
            <header className="invoice-header">
                <h1>Invoice / Tax Invoice</h1>
                <div className="company-details">
                    <strong>Boom Street Autopaints</strong><br />
                    123 Boom Street<br />
                    Cape Town, 8001<br />
                    VAT Reg: 123456789
                </div>
            </header>
            
            <section className="invoice-meta">
                <div><strong>Invoice #:</strong> {sale_details.id}</div>
                <div><strong>Date:</strong> {new Date(sale_details.sale_date).toLocaleDateString()}</div>
                <div><strong>Cashier:</strong> {sale_details.first_name} {sale_details.last_name}</div>
            </section>

            <section className="customer-details">
                <h3>Bill To:</h3>
                <p>
                    {sale_details.customer_name || 'Cash Sale'}<br />
                    {sale_details.customer_phone || ''}
                </p>
            </section>

            <table className="invoice-items">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit Price</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {line_items.map(item => (
                        <tr key={item.id}>
                            <td>{item.product_sku}</td>
                            <td>{item.product_name}</td>
                            <td>{item.quantity_sold}</td>
                            <td>R {parseFloat(item.price_at_sale).toFixed(2)}</td>
                            <td>R {(item.quantity_sold * item.price_at_sale).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <footer className="invoice-footer">
                <div className="invoice-total">
                    <strong>Total: R {parseFloat(sale_details.total_amount).toFixed(2)}</strong>
                </div>
                <div className="thank-you-note">
                    <p>Thank you for your business!</p>
                </div>
            </footer>
        </div>
    );
};

export default InvoicePage;