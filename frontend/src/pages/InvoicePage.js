// frontend/src/pages/InvoicePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './InvoicePage.css'; // Ensure your CSS is imported

const InvoicePage = () => {
    const { saleId } = useParams();
    const [invoice, setInvoice] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchInvoice = async () => {
            try {
                // IMPORTANT: This API endpoint (/invoices/:saleId)
                // MUST be updated on the backend to provide:
                // - sale_details (id, sale_date, total_amount, total_vat_amount)
                // - business_unit_details (name, address, vat_no)
                // - customer_details (name, phone, address, vat_no - if available)
                // - line_items (product_sku, product_name, quantity_sold, price_at_sale)
                const response = await api.get(`/invoices/${saleId}`);
                setInvoice(response.data);
            } catch (err) {
                console.error("Failed to load invoice:", err);
                setError('Failed to load invoice data. Please ensure the backend endpoint provides all necessary details (sale, business unit, customer, line items, and VAT breakdown).');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [saleId]);

    // Automatically trigger the print dialog once the data has loaded
    // Consider adding a small delay if content takes time to render
    useEffect(() => {
        if (invoice && !loading && !error) {
            // Give browser a moment to render before printing
            const printTimeout = setTimeout(() => {
                window.print();
            }, 500); // 500ms delay
            return () => clearTimeout(printTimeout);
        }
    }, [invoice, loading, error]);

    if (loading) return <p className="invoice-loading">Loading Invoice...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!invoice) return <p className="invoice-not-found">No invoice data found.</p>;

    // Destructure data from the fetched invoice object
    // Assuming the backend response structure for the required data:
    const { 
        sale_details, 
        line_items, 
        business_unit_details, 
        customer_details 
    } = invoice;

    // Calculate subtotal exclusive of VAT if not directly provided by backend
    // It's best to have backend provide this, but for robustness:
    const subtotalExclVAT = parseFloat(sale_details.total_amount) - parseFloat(sale_details.total_vat_amount);

    return (
        <div className="invoice-container">
            <header className="invoice-header">
                <div className="invoice-title-block">
                    <h1>Invoice / Tax Invoice</h1>
                    <p className="invoice-meta-item"><strong>Invoice #:</strong> {sale_details.id}</p>
                    <p className="invoice-meta-item"><strong>Date:</strong> {new Date(sale_details.sale_date).toLocaleDateString()}</p>
                    <p className="invoice-meta-item"><strong>Cashier:</strong> {sale_details.first_name} {sale_details.last_name}</p>
                    {/* Add other meta details here if needed from sale_details */}
                </div>
                
                <div className="company-details">
                    {/* Placeholder for a logo, similar to your sample quote */}
                    {/* <img src="/path/to/your/logo.png" alt="Company Logo" className="company-logo" /> */}
                    <strong>{business_unit_details?.name || 'Your Company Name'}</strong><br />
                    {(business_unit_details?.address || '123 Business Street\nCity, Postal Code').split('\n').map((line, i) => (
                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                    ))}
                    {business_unit_details?.vat_no && `VAT Reg: ${business_unit_details.vat_no}`}
                </div>
            </header>
            
            <section className="customer-details-section">
                <h3>Bill To:</h3>
                <p>
                    <strong>{customer_details?.name || sale_details.customer_name || 'Cash Sale'}</strong><br />
                    {customer_details?.address && customer_details.address.split('\n').map((line, i) => (
                        <React.Fragment key={i}>{line}<br /></React.Fragment>
                    ))}
                    {customer_details?.phone && `Phone: ${customer_details.phone}`}<br />
                    {customer_details?.vat_no && `Customer VAT No: ${customer_details.vat_no}`}
                    {(!customer_details?.name && sale_details.customer_phone) && `Phone: ${sale_details.customer_phone}`}
                </p>
            </section>

            <table className="invoice-items-table">
                <thead>
                    <tr>
                        <th className="sku-col">SKU</th>
                        <th className="description-col">Description</th>
                        <th className="qty-col">Qty</th>
                        <th className="unit-price-col">Unit Price (Excl. VAT)</th>
                        <th className="total-col">Total (Excl. VAT)</th>
                    </tr>
                </thead>
                <tbody>
                    {line_items.map(item => (
                        <tr key={item.id}>
                            <td>{item.product_sku || 'N/A'}</td>
                            <td>{item.product_name || 'Unknown Product'}</td>
                            <td className="qty-col">{parseFloat(item.quantity_sold).toFixed(2)}</td>
                            <td className="unit-price-col">R {parseFloat(item.price_at_sale).toFixed(2)}</td>
                            <td className="total-col">R {(parseFloat(item.quantity_sold) * parseFloat(item.price_at_sale)).toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <footer className="invoice-footer">
                <div className="invoice-summary">
                    <div className="summary-line">
                        <span>Total Exclusive:</span>
                        <span>R {subtotalExclVAT.toFixed(2)}</span>
                    </div>
                    <div className="summary-line">
                        <span>Total VAT ({((parseFloat(sale_details.total_vat_amount) / subtotalExclVAT) * 100).toFixed(0) || 15}%):</span> {/* Dynamic VAT rate display */}
                        <span>R {parseFloat(sale_details.total_vat_amount).toFixed(2)}</span>
                    </div>
                    <hr className="summary-divider" />
                    <div className="summary-line final-total-line">
                        <span>Total Due:</span>
                        <span>R {parseFloat(sale_details.total_amount).toFixed(2)}</span>
                    </div>
                </div>
                <div className="thank-you-note">
                    <p>Thank you for your business!</p>
                    <p>All goods will stay the property of Boom Street Autopaints until paid for in full. All goods are payable C.O.D. unless otherwise arranged for.</p>
                    {/* Add more legal/notes text here as per your sample quote */}
                </div>
            </footer>
        </div>
    );
};

export default InvoicePage;