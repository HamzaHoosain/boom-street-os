// frontend/src/components/orders/ReceiptsViewerModal.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const ReceiptsViewerModal = ({ purchaseOrder }) => {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // You'll need a new backend endpoint for this: GET /api/purchase-orders/:id/receipts
        api.get(`/purchase-orders/${purchaseOrder.id}/receipts`).then(res => {
            setReceipts(res.data);
            setLoading(false);
        });
    }, [purchaseOrder]);
    
    if (loading) return <p>Loading receipt history...</p>;

    return (
        <div>
            {receipts.length === 0 ? <p>No stock has been recorded as received for this PO yet.</p> :
                <table className="mini-table">
                    <thead>
                        <tr>
                            <th>Date Received</th>
                            <th>Product</th>
                            <th>Qty Received</th>
                            <th>Received By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {receipts.map(r => (
                            <tr key={r.id}>
                                <td>{new Date(r.receipt_date).toLocaleString()}</td>
                                <td>{r.product_name}</td>
                                <td>{r.quantity_received}</td>
                                <td>{r.receiver_name}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            }
        </div>
    );
};

export default ReceiptsViewerModal;