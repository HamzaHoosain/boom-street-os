// frontend/src/pages/SuppliersPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomersPage.css'; // Reuse customer page styles, they are suitable

const SupplierForm = ({ onSave, supplier, onClose }) => {
    const [formData, setFormData] = useState({
        name: supplier?.name || '',
        contact_person: supplier?.contact_person || '',
        phone_number: supplier?.phone_number || '',
        email: supplier?.email || ''
    });

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group"><label>Supplier Name</label><input name="name" value={formData.name} onChange={handleChange} className="form-control" required autoFocus/></div>
            <div className="form-group"><label>Contact Person</label><input name="contact_person" value={formData.contact_person} onChange={handleChange} className="form-control" /></div>
            <div className="form-group"><label>Phone Number</label><input name="phone_number" value={formData.phone_number} onChange={handleChange} className="form-control" /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" /></div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save Supplier</button>
        </form>
    );
};

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const navigate = useNavigate();
    const { selectedBusiness } = useContext(AuthContext);

    const fetchSuppliers = async () => {
        if (!selectedBusiness?.business_unit_id) {
            setSuppliers([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            // CRITICAL FIX: This now calls the correct /suppliers endpoint
            const response = await api.get(`/suppliers?businessUnitId=${selectedBusiness.business_unit_id}`);
            setSuppliers(response.data);
        } catch (error) {
            console.error("Failed to fetch suppliers", error);
            setSuppliers([]);
        } finally {
            setLoading(false);
        }
    };
    const handleSupplierClick = (supplierId) => {
        navigate(`/suppliers/${supplierId}`);
    };

    useEffect(() => {
        fetchSuppliers();
    }, [selectedBusiness]);

    const handleSaveSupplier = async (supplierData) => {
        try {
            const payload = { ...supplierData, business_unit_id: selectedBusiness.business_unit_id };
            if (editingSupplier) {
                await api.put(`/suppliers/${editingSupplier.id}`, payload);
            } else {
                await api.post('/suppliers', payload);
            }
            fetchSuppliers();
            closeModal();
        } catch (error) {
            console.error("Failed to save supplier", error);
            alert('Failed to save supplier.');
        }
    };
    
    // In the future, this can navigate to a supplier details page
    // const handleSupplierClick = (supplierId) => navigate(`/suppliers/${supplierId}`);

    const openAddModal = () => { setEditingSupplier(null); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingSupplier(null); };

    if (!selectedBusiness) {
        return <div><h1>Product Suppliers</h1><p>Please select a business unit to view suppliers.</p></div>;
    }
    if (loading) return <p>Loading suppliers for {selectedBusiness.business_unit_name}...</p>;

    return (
        <div>
            <h1>Product Suppliers</h1>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p>Viewing suppliers for <strong>{selectedBusiness.business_unit_name}</strong>.</p>
                <button onClick={openAddModal} className="btn-login" style={{maxWidth: '200px'}}>Add New Supplier</button>
            </div>
            
            <Modal show={showModal} onClose={closeModal} title={editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}>
                <SupplierForm onSave={handleSaveSupplier} supplier={editingSupplier} onClose={closeModal} />
            
            </Modal>

            <div className="customer-list">
                {suppliers.length === 0 ? (
                    <p>No suppliers found for this business unit.</p>
                ) : (
                    suppliers.map(supplier => (
                        <div key={supplier.id} className="customer-card" onClick={() => handleSupplierClick(supplier.id)}>
                            <div className="customer-info">
                                <h3>{supplier.name}</h3>
                                <span>{supplier.contact_person || supplier.phone_number || 'No contact info'}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SuppliersPage;