// frontend/src/pages/InvoicePage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Ensure your receipt CSS is imported

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
                console.error("Failed to load invoice:", err);
                setError('Failed to load invoice data.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [saleId]);

    // Automatically trigger the print dialog once the data has loaded
    useEffect(() => {
        if (invoice && !loading && !error) {
            const printTimeout = setTimeout(() => {
                window.print();
            }, 500); // 500ms delay to allow render
            return () => clearTimeout(printTimeout);
        }
    }, [invoice, loading, error]);

    if (loading) return <p className="invoice-loading">Loading Receipt...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!invoice) return <p className="invoice-not-found">No invoice data found.</p>;

    const { 
        sale_details, 
        line_items, 
        business_unit_details, 
        customer_details,
        unpaid_invoices 
    } = invoice;

    const subtotalExclVAT = parseFloat(sale_details.total_amount) - parseFloat(sale_details.total_vat_amount);
    const paymentMethod = sale_details.payment_method?.toLowerCase() || '';

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>{business_unit_details?.name || 'Your Business'}</h1>
                {(business_unit_details?.address || '123 Business St\nCity').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                ))}
                {business_unit_details?.vat_no && <p>VAT No: {business_unit_details.vat_no}</p>}
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>TAX INVOICE</p>
                <p>Sale #{sale_details.id}</p>
                <p>Date: {new Date(sale_details.sale_date).toLocaleDateString()}</p>
                <p>Cashier: {sale_details.first_name || 'N/A'}</p>
            </section>
            
            {customer_details && ( // Keep this to show the customer's name on ALL their sales
                 <>
                    <hr className="receipt-hr" />
                    <section className="receipt-meta">
                         <p>Customer: {customer_details.name}</p>
                         {customer_details?.vat_no && <p>VAT No: {customer_details.vat_no}</p>}
                    </section>
                </>
            )}

            <hr className="receipt-hr" />
            
            <section className="item-list-section">
                {line_items.map(item => (
                    <div className="item-entry" key={item.id}>
                        <p className="item-description">{item.product_name}</p>
                        <div className="item-details-line">
                            <span>{parseFloat(item.quantity_sold)} x R{parseFloat(item.price_at_sale).toFixed(2)}</span>
                            <span>R{(parseFloat(item.quantity_sold) * parseFloat(item.price_at_sale)).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="summary-line">
                    <span>Total Excl:</span>
                    <span>R{subtotalExclVAT.toFixed(2)}</span>
                </div>
                <div className="summary-line">
                    <span>VAT @ 15%:</span>
                    <span>R{parseFloat(sale_details.total_vat_amount).toFixed(2)}</span>
                </div>
                <div className="final-total-line">
                    <span>TOTAL:</span>
                    <span>R{parseFloat(sale_details.total_amount).toFixed(2)}</span>
                </div>
            </section>
            
            <hr className="receipt-hr" />

            <section className="payment-details-section">
                <div className="summary-line">
                    <span>Paid Via:</span>
                    <span>{sale_details.payment_method?.toUpperCase().replace('_', ' ') || 'N/A'}</span>
                </div>
            </section>

            {/* --- THIS IS THE CORRECTED LOGIC --- */}
            {/* Account Summary Block: Only appears if a customer was assigned AND they paid 'On Account' */}
            {customer_details && paymentMethod.includes('on_account') && (
                 <>
                    <hr className="receipt-hr" />
                    <section className="account-summary-section">
                        <p className="summary-heading">ACCOUNT SUMMARY</p>
                        <div className="summary-line">
                            <span>Previous Balance:</span>
                            <span>R{parseFloat(customer_details.previous_balance).toFixed(2)}</span>
                        </div>
                        <div className="summary-line">
                            <span>This Purchase:</span>
                            <span>R{parseFloat(sale_details.total_amount).toFixed(2)}</span>
                        </div>
                        <div className="summary-line balance-line">
                            <span>New Balance Due:</span>
                            <span>R{parseFloat(customer_details.account_balance).toFixed(2)}</span>
                        </div>
                    </section>
                </>
            )}

            {/* Outstanding Invoices Block: Only appears for 'On Account' sales where there are other unpaid invoices */}
            {paymentMethod.includes('on_account') && unpaid_invoices && unpaid_invoices.length > 0 && (
                <>
                    <hr className="receipt-hr" />
                    <section className="unpaid-invoices-section">
                        <p className="summary-heading">OTHER OUTSTANDING INVOICES</p>
                        <p className="unpaid-list">
                            {unpaid_invoices.map(inv => `#${inv.id}`).join(', ')}
                        </p>
                    </section>
                </>
            )}
            
            <hr className="receipt-hr" />

            <footer className="receipt-footer">
                <p>Thank you for your business!</p>
                <p>All goods remain property of the seller until paid in full.</p>
            </footer>
        </div>
    );
};

export default InvoicePage;