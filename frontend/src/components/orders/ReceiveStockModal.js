// frontend/src/components/orders/ReceiveStockModal.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './ReceiveStockModal.css'; // We'll create this CSS file

const ReceiveStockModal = ({ purchaseOrder, onClose, onStockReceived }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!purchaseOrder) return;
        const fetchItems = async () => {
            setLoading(true);
            try {
                // This calls the new GET /:poId/items route
                const res = await api.get(`/purchase-orders/${purchaseOrder.id}/items`);
                // Pre-populate "quantity_received" with the full ordered amount
                const itemsWithReceivingQty = res.data.map(item => ({
                    ...item,
                    quantity_received: parseFloat(item.quantity)
                }));
                setItems(itemsWithReceivingQty);
            } catch (error) {
                console.error("Failed to fetch PO items", error);
            } finally {
                setLoading(false);
            }
        };
        fetchItems();
    }, [purchaseOrder]);

    const handleQuantityChange = (productId, value) => {
        const newQty = parseFloat(value);
        setItems(prev => prev.map(item =>
            item.product_id === productId ? { ...item, quantity_received: isNaN(newQty) ? '' : newQty } : item
        ));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const itemsReceivedPayload = items
            .filter(item => parseFloat(item.quantity_received) > 0)
            .map(item => ({
                product_id: item.product_id,
                quantity_received: parseFloat(item.quantity_received)
            }));

        try {
            await onStockReceived(purchaseOrder.id, itemsReceivedPayload);
            onClose(); // This will be called on success
        } catch(err) {
            alert("Failed to receive stock. See console for details.");
            console.error(err);
            setSubmitting(false); // Re-enable button on error
        }
    };

    if (loading) return <p>Loading Purchase Order Items...</p>;

    return (
        <div>
            <h4>Receiving Stock for PO #{purchaseOrder.id}</h4>
            <p>Enter the actual quantity received for each item. Leave as 0 if not received.</p>
            <div className="receive-stock-list">
                {items.map(item => (
                    <div key={item.product_id} className="receive-stock-item">
                        <label>{item.product_name} (Ordered: {parseFloat(item.quantity)})</label>
                        <input
                            type="number"
                            value={item.quantity_received}
                            onChange={(e) => handleQuantityChange(item.product_id, e.target.value)}
                            className="form-control"
                            step="0.01"
                            min="0"
                        />
                    </div>
                ))}
            </div>
            <button onClick={handleSubmit} className="btn-login" style={{marginTop: '1.5rem'}} disabled={submitting}>
                {submitting ? "Processing..." : "Confirm Stock Received"}
            </button>
        </div>
    );
};

export default ReceiveStockModal;