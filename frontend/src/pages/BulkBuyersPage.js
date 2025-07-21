// frontend/src/pages/BulkBuyersPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css'; // Reuse table style

const BuyerForm = ({ onSave, buyer, onClose }) => {
    const [name, setName] = useState(buyer?.name || '');
    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSave({ name });
    };
    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Buyer Name</label>
                <input name="name" value={name} onChange={(e) => setName(e.target.value)} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save Buyer</button>
        </form>
    );
};

const BulkBuyersPage = () => {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState(null);

    const fetchBuyers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/scrapyard/buyers');
            setBuyers(response.data);
        } catch (error) {
            console.error("Failed to fetch buyers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBuyers();
    }, []);

    const handleSaveBuyer = async (buyerData) => {
        try {
            if (editingBuyer) {
                // We need to create a PUT endpoint for this
                await api.put(`/scrapyard/buyers/${editingBuyer.id}`, buyerData);
            } else {
                // We need to create a POST endpoint for this
                await api.post('/scrapyard/buyers', buyerData);
            }
            fetchBuyers();
            closeModal();
        } catch (error) {
            alert('Failed to save buyer.');
        }
    };

    const openAddModal = () => { setEditingBuyer(null); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingBuyer(null); };

    if (loading) return <p>Loading bulk buyers...</p>;

    return (
        <div>
            <h1>Bulk Buyer Management</h1>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={openAddModal} className="btn-login" style={{maxWidth: '200px'}}>Add New Buyer</button>
            </div>
            
            <Modal show={showModal} onClose={closeModal} title={editingBuyer ? 'Edit Buyer' : 'Add New Buyer'}>
                <BuyerForm onSave={handleSaveBuyer} buyer={editingBuyer} onClose={closeModal} />
            </Modal>

            <table className="inventory-table">
                <thead><tr><th>Name</th><th>Actions</th></tr></thead>
                <tbody>
                    {buyers.map(buyer => (
                        <tr key={buyer.id}>
                            <td>{buyer.name}</td>
                            <td>{/* Edit/Delete buttons will go here */}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default BulkBuyersPage;