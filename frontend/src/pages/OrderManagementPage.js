// frontend/src/pages/OrderManagementPage.js

import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './OrderManagementPage.css';

const OrderManagementPage = () => {
    const [activeTab, setActiveTab] = useState('quotes');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!selectedBusiness?.business_unit_id) {
                setDocuments([]);
                setLoading(false);
                return;
            }
            setLoading(true);
            try {
                // The URL now correctly replaces underscores with hyphens
                const endpoint = `${activeTab.replace('_', '-')}/by-business/${selectedBusiness.business_unit_id}`;
                const response = await api.get(`/${endpoint}`);
                setDocuments(response.data);
            } catch (error) {
                console.error(`Failed to fetch ${activeTab}`, error);
                setDocuments([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [activeTab, selectedBusiness]);

    const renderTable = () => {
        if (loading) return <p>Loading documents...</p>;
        if (documents.length === 0) return <p>No {activeTab.replace('_', ' ')} found for this business unit.</p>;

        const headers = {
            quotes: ['Quote #', 'Date', 'Customer', 'Total', 'Status', 'Print'],
            sales_orders: ['SO #', 'Date', 'Customer', 'Total', 'Status', 'Print'],
            purchase_orders: ['PO #', 'Date', 'Supplier', 'Total (Cost)', 'Status', 'Print'],
        };

        const renderRow = (doc) => {
            const common = {
                id: doc.id,
                date: new Date(doc.quote_date || doc.order_date).toLocaleDateString(),
                total: parseFloat(doc.total_amount).toFixed(2),
                status: doc.status
            };
            
            // --- THIS SWITCH STATEMENT CONTAINS THE FIX ---
            switch (activeTab) {
                case 'quotes':
                    return (
                        <tr key={doc.id}>
                            <td>{common.id}</td><td>{common.date}</td><td>{doc.customer_name || 'N/A'}</td><td>R {common.total}</td><td><span className="status-badge">{common.status}</span></td>
                            <td><Link to={`/quote/${doc.id}`} target="_blank" className="btn-print-link">Print</Link></td>
                        </tr>
                    );
                case 'sales_orders':
                     return (
                        <tr key={doc.id}>
                            <td>{common.id}</td><td>{common.date}</td><td>{doc.customer_name || 'N/A'}</td><td>R {common.total}</td><td><span className="status-badge">{common.status}</span></td>
                            <td><Link to={`/sales-order/${doc.id}`} target="_blank" className="btn-print-link">Print</Link></td>
                        </tr>
                    );
                case 'purchase_orders':
                     // CRITICAL FIX: This now correctly displays `doc.supplier_name`
                     return (
                        <tr key={doc.id}>
                            <td>{common.id}</td><td>{common.date}</td><td>{doc.supplier_name || 'N/A'}</td><td>R {common.total}</td><td><span className="status-badge">{common.status}</span></td>
                            <td><Link to={`/purchase-order/${doc.id}`} target="_blank" className="btn-print-link">Print</Link></td>
                        </tr>
                    );
                default: return null;
            }
        };

        return (
            <table className="order-table">
                <thead>
                    <tr>{headers[activeTab].map(h => <th key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                    {documents.map(renderRow)}
                </tbody>
            </table>
        );
    };

    if (!selectedBusiness?.business_unit_id) {
        return (
            <div>
                <h1>Order Management</h1>
                <p>Please select a business unit from the header to view orders.</p>
            </div>
        );
    }

    return (
        <div>
            <h1>Order Management</h1>
            <p>Viewing documents for <strong>{selectedBusiness.business_unit_name}</strong>.</p>
            <div className="order-tabs">
                <button onClick={() => setActiveTab('quotes')} className={activeTab === 'quotes' ? 'active' : ''}>Quotes</button>
                <button onClick={() => setActiveTab('sales_orders')} className={activeTab === 'sales_orders' ? 'active' : ''}>Sales Orders</button>
                <button onClick={() => setActiveTab('purchase_orders')} className={activeTab === 'purchase_orders' ? 'active' : ''}>Purchase Orders</button>
            </div>
            <div className="order-table-container">
                {renderTable()}
            </div>
        </div>
    );
};

export default OrderManagementPage;