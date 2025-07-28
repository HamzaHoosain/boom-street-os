// frontend/src/pages/CustomersPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomersPage.css'; // Make sure this CSS file exists and is styled

// --- Child Component: The Form for Adding/Editing a Customer ---
const CustomerForm = ({ onSave, customer, onClose, singularLabel }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone_number: customer?.phone_number || '',
        email: customer?.email || ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group"><label>{singularLabel} Name</label><input name="name" value={formData.name} onChange={handleChange} className="form-control" required autoFocus/></div>
            <div className="form-group"><label>Phone Number</label><input name="phone_number" value={formData.phone_number} onChange={handleChange} className="form-control" /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" /></div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save {singularLabel}</button>
        </form>
    );
};

// --- Main Page Component ---
const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const navigate = useNavigate();
    const { selectedBusiness } = useContext(AuthContext); // Get the active business context

    // --- Dynamic labels based on business type ---
    const isScrapyard = selectedBusiness?.type === 'Bulk Inventory';
    const pageTitle = isScrapyard ? 'Bulk Buyer Accounts' : 'Customer Accounts';
    const singularLabel = isScrapyard ? 'Buyer' : 'Customer';


    const fetchCustomers = async () => {
        // Only fetch if a business is selected
        if (!selectedBusiness?.business_unit_id) {
            setCustomers([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            // Call the tenant-aware endpoint
            const response = await api.get(`/customers?businessUnitId=${selectedBusiness.business_unit_id}`);
            setCustomers(response.data);
        } catch (error) {
            console.error("Failed to fetch customers/buyers", error);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    // Re-fetch data whenever the selected business unit changes
    useEffect(() => {
        fetchCustomers();
    }, [selectedBusiness]);

    const handleSaveCustomer = async (customerData) => {
        try {
            const payload = {
                ...customerData,
                business_unit_id: selectedBusiness.business_unit_id // Always attach the active business ID
            };
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, payload);
            } else {
                await api.post('/customers', payload);
            }
            fetchCustomers();
            closeModal();
        } catch (error) {
            console.error("Failed to save customer/buyer", error);
            alert(`Failed to save ${singularLabel}.`);
        }
    };
    
    const handleCustomerClick = (customerId) => {
        navigate(`/customers/${customerId}`); // Drill down to details page
    };

    const openAddModal = () => { setEditingCustomer(null); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingCustomer(null); };

    // Display a message if no business unit is selected
    if (!selectedBusiness?.business_unit_id) {
        return (
            <div>
                <h1>Customers / Bulk Buyers</h1>
                <p>Please select a business unit from the header to manage accounts.</p>
            </div>
        );
    }
    
    if (loading) return <p>Loading {singularLabel.toLowerCase()}s for {selectedBusiness.business_unit_name}...</p>;

    return (
        <div>
            <h1>{pageTitle}</h1>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p>Select a {singularLabel.toLowerCase()} to view their detailed history and manage their account.</p>
                <button onClick={openAddModal} className="btn-login" style={{maxWidth: '200px'}}>Add New {singularLabel}</button>
            </div>
            
            <Modal show={showModal} onClose={closeModal} title={editingCustomer ? `Edit ${singularLabel}` : `Add New ${singularLabel}`}>
                <CustomerForm onSave={handleSaveCustomer} customer={editingCustomer} onClose={closeModal} singularLabel={singularLabel} />
            </Modal>

            <div className="customer-list">
                {customers.length === 0 ? (
                    <p>No {singularLabel.toLowerCase()}s found for this business unit.</p>
                ) : (
                    customers.map(customer => (
                        <div key={customer.id} className="customer-card" onClick={() => handleCustomerClick(customer.id)}>
                            <div className="customer-info">
                                <h3>{customer.name}</h3>
                                <span>{customer.phone_number || 'No phone number'}</span>
                            </div>
                            <div className={`customer-balance ${parseFloat(customer.account_balance) > 0 ? 'owing' : ''}`}>
                                <span>Balance</span>
                                <strong>R {parseFloat(customer.account_balance).toFixed(2)}</strong>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default CustomersPage;