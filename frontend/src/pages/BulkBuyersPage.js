// frontend/src/pages/BulkBuyersPage.js

import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomersPage.css'; // Reuse the well-styled customer page CSS

// --- Child Component: Form for a NEW BULK SALE ---
const BulkSaleForm = ({ buyers, onSave, onClose }) => {
    const [materials, setMaterials] = useState([]);
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState({
        buyerId: '',
        materialId: '',
        safeId: '',
        invoiceNumber: '',
        weight: '',
        revenue: ''
    });
    const SCRAPYARD_BUSINESS_ID = 2;

    useEffect(() => {
        const fetchFormData = async () => {
            setLoading(true);
            try {
                const [materialsRes, safesRes] = await Promise.all([
                    api.get(`/products/${SCRAPYARD_BUSINESS_ID}`),
                    api.get('/cash/safes')
                ]);
                setMaterials(materialsRes.data);
                setSafes(safesRes.data);
            } catch (err) {
                console.error("Failed to load form data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchFormData();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    if (loading) return <p>Loading form...</p>;

    return (
        <form onSubmit={handleSubmit} className="bulk-sale-form">
            <div className="form-group">
                <label>Buyer</label>
                <select name="buyerId" value={formData.buyerId} onChange={handleChange} className="form-control" required autoFocus>
                    <option value="">-- Select Buyer --</option>
                    {buyers.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                </select>
            </div>
            <div className="form-group">
                <label>Material Sold</label>
                <select name="materialId" value={formData.materialId} onChange={handleChange} className="form-control" required>
                    <option value="">-- Select Material --</option>
                    {materials.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                </select>
            </div>
            <div className="form-group">
                <label>Deposit To Account</label>
                <select name="safeId" value={formData.safeId} onChange={handleChange} className="form-control" required>
                    <option value="">-- Select Bank Account --</option>
                    {safes.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
            </div>
            <div className="form-group">
                <label>Invoice / Reference #</label>
                <input type="text" name="invoiceNumber" value={formData.invoiceNumber} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group-row">
                <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" step="0.01" name="weight" value={formData.weight} onChange={handleChange} className="form-control" required />
                </div>
                <div className="form-group">
                    <label>Total Revenue (R)</label>
                    <input type="number" step="0.01" name="revenue" value={formData.revenue} onChange={handleChange} className="form-control" required />
                </div>
            </div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Process Bulk Sale</button>
        </form>
    );
};


// --- Child Component: Form for managing buyer details ---
const BuyerForm = ({ onSave, buyer, onClose }) => {
    const [formData, setFormData] = useState({
        name: buyer?.name || '',
        phone_number: buyer?.phone_number || '',
        email: buyer?.email || ''
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Buyer Name</label><input name="name" value={formData.name} onChange={handleChange} className="form-control" required autoFocus/></div>
            <div className="form-group"><label>Phone Number</label><input name="phone_number" value={formData.phone_number} onChange={handleChange} className="form-control" /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" /></div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save Buyer</button>
        </form>
    );
};

// --- Main Page Component ---
const BulkBuyersPage = () => {
    const [buyers, setBuyers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSaleModal, setShowSaleModal] = useState(false);
    const [showBuyerModal, setShowBuyerModal] = useState(false);
    const [editingBuyer, setEditingBuyer] = useState(null);
    const navigate = useNavigate();
    const { selectedBusiness } = useContext(AuthContext);

    const SCRAPYARD_BUSINESS_ID = 2;

    const fetchBuyers = useCallback(async () => {
        if (selectedBusiness?.business_unit_id !== SCRAPYARD_BUSINESS_ID) {
            setBuyers([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const response = await api.get(`/customers?businessUnitId=${SCRAPYARD_BUSINESS_ID}`);
            setBuyers(response.data);
        } catch (error) {
            console.error("Failed to fetch bulk buyers", error);
            setBuyers([]);
        } finally {
            setLoading(false);
        }
    }, [selectedBusiness]);

    useEffect(() => {
        fetchBuyers();
    }, [fetchBuyers]);

    const handleSaveSale = async (saleFormData) => {
        try {
            const payload = {
                business_unit_id: SCRAPYARD_BUSINESS_ID,
                product_id: parseInt(saleFormData.materialId),
                weight_kg: parseFloat(saleFormData.weight),
                revenue_amount: parseFloat(saleFormData.revenue),
                buyer_id: parseInt(saleFormData.buyerId),
                safe_id: parseInt(saleFormData.safeId),
                invoice_number: saleFormData.invoiceNumber
            };
            await api.post('/scrapyard/sell', payload);
            setShowSaleModal(false);
            fetchBuyers(); // Refresh the list to show the new balance
        } catch (error) {
            console.error("Failed to save bulk sale", error);
            alert('Failed to process bulk sale.');
        }
    };
    
    const handleSaveBuyer = async (buyerData) => {
        try {
            const payload = { ...buyerData, business_unit_id: SCRAPYARD_BUSINESS_ID };
            if (editingBuyer) {
                await api.put(`/customers/${editingBuyer.id}`, payload);
            } else {
                await api.post('/customers', payload);
            }
            fetchBuyers(); 
            closeBuyerModal();
        } catch (error) {
            console.error("Failed to save buyer:", error)
            alert('Failed to save buyer.');
        }
    };
    
    const handleBuyerClick = (buyerId) => navigate(`/customers/${buyerId}`);
    
    const openAddBuyerModal = () => { setEditingBuyer(null); setShowBuyerModal(true); };
    const closeBuyerModal = () => { setEditingBuyer(null); setShowBuyerModal(false); };

    if (selectedBusiness?.business_unit_id !== SCRAPYARD_BUSINESS_ID) {
        return (
            <div>
                <h1>Bulk Buyer Accounts</h1>
                <p>This feature is only available for the Scrapyard business unit.</p>
            </div>
        );
    }
    
    if (loading) return <p>Loading bulk buyers...</p>;

    return (
        <div>
            <h1>Bulk Buyer Accounts</h1>
            <div className="page-header-actions">
                <p>Manage accounts and record bulk sales to buyers.</p>
                <div>
                    <button onClick={openAddBuyerModal} className="btn-secondary" style={{marginRight: '10px'}}>Manage Buyers</button>
                    <button onClick={() => setShowSaleModal(true)} className="btn-login">Record New Bulk Sale</button>
                </div>
            </div>
            
            <Modal show={showSaleModal} onClose={() => setShowSaleModal(false)} title="Record New Bulk Sale">
                <BulkSaleForm buyers={buyers} onSave={handleSaveSale} onClose={() => setShowSaleModal(false)} />
            </Modal>

            <Modal show={showBuyerModal} onClose={closeBuyerModal} title={editingBuyer ? 'Edit Buyer' : 'Add New Buyer'}>
                <BuyerForm onSave={handleSaveBuyer} buyer={editingBuyer} onClose={closeBuyerModal} />
            </Modal>
            
            <div className="customer-list">
                {buyers.length === 0 && !loading ? (
                    <p>No buyers found. Click "Add New Buyer" via the "Manage Buyers" button to get started.</p>
                ) : (
                    buyers.map(buyer => (
                        <div key={buyer.id} className="customer-card" onClick={() => handleBuyerClick(buyer.id)}>
                            <div className="customer-info">
                                <h3>{buyer.name}</h3>
                                <span>{buyer.phone_number || 'No phone number'}</span>
                            </div>
                            <div className={`customer-balance ${parseFloat(buyer.account_balance) > 0 ? 'owing' : ''}`}>
                                <span>Balance Owed</span>
                                <strong>R {parseFloat(buyer.account_balance).toFixed(2)}</strong>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default BulkBuyersPage;