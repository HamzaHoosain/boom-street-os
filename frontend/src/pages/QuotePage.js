// frontend/src/pages/QuotePage.js

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // CRITICAL: Reuse the 58mm thermal receipt styles

const QuotePage = () => {
    const { quoteId } = useParams();
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                // Fetch from the quotes endpoint you created
                const response = await api.get(`/quotes/${quoteId}`);
                setQuote(response.data);
            } catch (err) {
                console.error("Failed to load quote:", err);
                setError('Failed to load quote data.');
            } finally {
                setLoading(false);
            }
        };
        fetchQuote();
    }, [quoteId]);

    // Automatically trigger the print dialog
    useEffect(() => {
        if (quote && !loading && !error) {
            const printTimeout = setTimeout(() => window.print(), 500);
            return () => clearTimeout(printTimeout);
        }
    }, [quote, loading, error]);

    if (loading) return <p className="invoice-loading">Loading Quotation...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!quote) return <p className="invoice-not-found">Quotation not found.</p>;

    const { 
        quote_details, 
        line_items, 
        business_unit_details, 
        customer_details 
    } = quote;

    return (
        <div className="receipt-container">
            <header className="receipt-header">
                <h1>{business_unit_details?.name || 'Your Business'}</h1>
                {(business_unit_details?.address || '').split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                ))}
                {business_unit_details?.vat_no && <p>VAT No: {business_unit_details.vat_no}</p>}
            </header>

            <hr className="receipt-hr" />
            
            <section className="receipt-meta">
                <p>QUOTATION</p>
                <p>Quote #{quote_details.id}</p>
                <p>Date: {new Date(quote_details.quote_date).toLocaleDateString()}</p>
            </section>
            
            {customer_details?.name && (
                 <>
                    <hr className="receipt-hr" />
                    <section className="receipt-meta">
                         <p>For: {customer_details.name}</p>
                    </section>
                </>
            )}

            <hr className="receipt-hr" />
            
            <section className="item-list-section">
                {line_items.map(item => (
                    <div className="item-entry" key={item.id}>
                        <p className="item-description">{item.product_name}</p>
                        <div className="item-details-line">
                            <span>{parseFloat(item.quantity)} x R{parseFloat(item.price_at_quote).toFixed(2)}</span>
                            <span>R{(parseFloat(item.quantity) * parseFloat(item.price_at_quote)).toFixed(2)}</span>
                        </div>
                    </div>
                ))}
            </section>

            <hr className="receipt-hr" />

            <section className="totals-section">
                <div className="summary-line">
                    <span>Sub-Total:</span>
                    <span>R{parseFloat(quote_details.subtotal).toFixed(2)}</span>
                </div>
                <div className="summary-line">
                    <span>VAT @ 15%:</span>
                    <span>R{parseFloat(quote_details.total_vat).toFixed(2)}</span>
                </div>
                <div className="final-total-line">
                    <span>TOTAL:</span>
                    <span>R{parseFloat(quote_details.total_amount).toFixed(2)}</span>
                </div>
            </section>
            
            <hr className="receipt-hr" />

            <footer className="receipt-footer">
                <p>Quotation valid for 14 days.</p>
                <p>Thank you for your interest!</p>
            </footer>
        </div>
    );
};

export default QuotePage;