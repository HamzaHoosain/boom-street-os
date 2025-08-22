// frontend/src/pages/OrderManagementPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react'; // <-- IMPORT useCallback
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import ReceiveStockModal from '../components/orders/ReceiveStockModal';
import ReceiptsViewerModal from '../components/orders/ReceiptsViewerModal';
import './OrderManagementPage.css';

const OrderManagementPage = () => {
    const [activeTab, setActiveTab] = useState('quotes');
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const { selectedBusiness } = useContext(AuthContext);

    const [showReceiveModal, setShowReceiveModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);

    const [showReceiptsModal, setShowReceiptsModal] = useState(false);
    const openReceiptsModal = (po) => {
    setSelectedPO(po);
    setShowReceiptsModal(true);
};

    // --- THIS IS THE CORRECTED DATA FETCHING PATTERN ---
    const fetchDocuments = useCallback(async () => {
        if (!selectedBusiness?.business_unit_id) {
            setDocuments([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const endpoint = `${activeTab.replace('_', '-')}/by-business/${selectedBusiness.business_unit_id}`;
            const response = await api.get(`/${endpoint}`);
            setDocuments(response.data);
        } catch (error) {
            console.error(`Failed to fetch ${activeTab}`, error);
            setDocuments([]);
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedBusiness]); // Dependencies for useCallback

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]); // This now correctly lists fetchDocuments as a dependency
    // --- END OF CORRECTION ---

    const openReceiveModal = (purchaseOrder) => {
        setSelectedPO(purchaseOrder);
        setShowReceiveModal(true);
    };

    const closeModal = () => {
        setSelectedPO(null);
        setShowReceiveModal(false);
    };
    
    const handleStockReceived = async (purchaseOrderId, itemsReceivedPayload) => {
        try {
            await api.post(`/purchase-orders/${purchaseOrderId}/receive`, {
                itemsReceived: itemsReceivedPayload
            });
            // After successfully receiving, refresh the documents list
            fetchDocuments(); 
        } catch (err) {
            // Re-throw so the modal can handle showing an alert
            throw err;
        }
    };
    
    const renderTable = () => {
        if (loading) return <p>Loading documents...</p>;
        if (documents.length === 0) return <p>No {activeTab.replace('_', ' ')} found for this business unit.</p>;

        const headers = {
            quotes: ['Quote #', 'Date', 'Customer', 'Total', 'Status', 'Actions'],
            sales_orders: ['SO #', 'Date', 'Customer', 'Total', 'Status', 'Actions'],
            purchase_orders: ['PO #', 'Date', 'Supplier', 'Total (Cost)', 'Status', 'Actions'],
        };

        const renderRow = (doc) => {
        // This 'common' object IS used, so the warning will disappear.
        const common = {
            id: doc.id,
            date: new Date(doc.quote_date || doc.order_date).toLocaleDateString(),
            total: parseFloat(doc.total_amount).toFixed(2),
            status: doc.status
        };
        
        // This switch statement uses `Link` and `openReceiveModal`, so those warnings will disappear.
        switch (activeTab) {
            case 'quotes':
                return (
                    <tr key={`quote-${doc.id}`}>
                        <td>{common.id}</td>
                        <td>{common.date}</td>
                        <td>{doc.customer_name || 'N/A'}</td>
                        <td>R {common.total}</td>
                        <td><span className="status-badge">{common.status}</span></td>
                        <td className="actions-cell">
                            <Link to={`/quote/${doc.id}`} target="_blank" className="btn-action print">Print</Link>
                        </td>
                    </tr>
                );
            case 'sales_orders':
                 return (
                    <tr key={`so-${doc.id}`}>
                        <td>{common.id}</td>
                        <td>{common.date}</td>
                        <td>{doc.customer_name || 'N/A'}</td>
                        <td>R {common.total}</td>
                        <td><span className="status-badge">{common.status}</span></td>
                         <td className="actions-cell">
                            <Link to={`/sales-order/${doc.id}`} target="_blank" className="btn-action print">Print</Link>
                        </td>
                    </tr>
                );
            case 'purchase_orders':
                 return (
                    <tr key={`po-${doc.id}`}>
                        <td>{common.id}</td>
                        <td>{common.date}</td>
                        <td>{doc.supplier_name || 'N/A'}</td>
                        <td>R {common.total}</td>
                        <td><span className="status-badge">{common.status}</span></td>
                        <td className="actions-cell">
                            <Link to={`/purchase-order/${doc.id}`} target="_blank" className="btn-action print">Print</Link>
                            {doc.status === 'Received' &&
                                    <button onClick={() => openReceiptsModal(doc)} className="btn-action view">View Receipts</button>
                                }

                                <button onClick={() => openReceiveModal(doc)} className="btn-action receive" disabled={doc.status === 'Received'}>
                                    Receive Stock
                                </button>
                            </td>
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
            {showReceiptsModal && (
                <Modal show={showReceiptsModal} onClose={() => setShowReceiptsModal(false)} title={`Receipt History for PO #${selectedPO.id}`}>
                    <ReceiptsViewerModal purchaseOrder={selectedPO} />
                </Modal>
            )}

            {showReceiveModal && (
                <Modal show={showReceiveModal} onClose={closeModal} title={`Receive Stock for PO #${selectedPO.id}`}>
                    <ReceiveStockModal 
                        purchaseOrder={selectedPO}
                        onClose={closeModal}
                        onStockReceived={handleStockReceived}
                    />
                </Modal>
            )}
        </div>
    );
};

export default OrderManagementPage;