import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate to make rows clickable
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './CustomersPage.css'; // We'll create a dedicated CSS file for this new look

// --- Child Component: The Form for Adding/Editing a Customer ---
// This component remains largely the same
const CustomerForm = ({ onSave, customer, onClose }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        phone_number: customer?.phone_number || '',
        email: customer?.email || ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await onSave(formData);
        } catch (err) {
            setError("Failed to save customer. Please check details.");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group"><label>Name</label><input name="name" value={formData.name} onChange={handleChange} className="form-control" required /></div>
            <div className="form-group"><label>Phone Number</label><input name="phone_number" value={formData.phone_number} onChange={handleChange} className="form-control" /></div>
            <div className="form-group"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" /></div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save Customer</button>
        </form>
    );
};

// --- Main Page Component: The Customer List and Management Logic ---
const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const navigate = useNavigate(); // Hook for navigation

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/customers');
            setCustomers(response.data);
        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleSaveCustomer = async (customerData) => {
        try {
            if (editingCustomer) {
                await api.put(`/customers/${editingCustomer.id}`, customerData);
            } else {
                await api.post('/customers', customerData);
            }
            fetchCustomers();
            closeModal();
        } catch (error) {
            console.error("Failed to save customer", error);
            throw error; // Re-throw to be caught by the form
        }
    };
    
    // This function will take the user to the new details page
    const handleCustomerClick = (customerId) => {
        navigate(`/customers/${customerId}`);
    };

    const openAddModal = () => { setEditingCustomer(null); setShowModal(true); };
    const closeModal = () => { setShowModal(false); setEditingCustomer(null); };

    if (loading) return <p>Loading customers...</p>;

    return (
        <div>
            <h1>Customer Accounts</h1>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p>Select a customer to view their detailed purchase history and manage their account.</p>
                <button onClick={openAddModal} className="btn-login" style={{maxWidth: '200px'}}>Add New Customer</button>
            </div>
            
            <Modal show={showModal} onClose={closeModal} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}>
                <CustomerForm onSave={handleSaveCustomer} customer={editingCustomer} onClose={closeModal} />
            </Modal>

            <div className="customer-list">
                {customers.map(customer => (
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
                ))}
            </div>
        </div>
    );
};

export default CustomersPage;