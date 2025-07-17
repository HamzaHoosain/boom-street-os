import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css'; // Reusing the inventory table style

// --- Child Component: The Form for Adding/Editing a Customer ---
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
            setError("Failed to save customer. Please check the details.");
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>Name</label>
                <input name="name" value={formData.name} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Phone Number</label>
                <input name="phone_number" value={formData.phone_number} onChange={handleChange} className="form-control" />
            </div>
            <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-control" />
            </div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>
                Save Customer
            </button>
        </form>
    );
};


// --- Main Page Component: The Customer List and Management Logic ---
const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);

    // Initial data fetch
    useEffect(() => {
        fetchCustomers();
    }, []);

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

    // This function is called from the form when the user saves
    const handleSaveCustomer = async (customerData) => {
        // If we are editing, call the PUT endpoint
        if (editingCustomer) {
            await api.put(`/customers/${editingCustomer.id}`, customerData);
        } else {
            // Otherwise, call the POST endpoint to create a new one
            await api.post('/customers', customerData);
        }
        fetchCustomers(); // Re-fetch the list to show the update/new item
        closeModal();
    };

    // Functions to control the modal
    const openAddModal = () => {
        setEditingCustomer(null); // Ensure we are in "add" mode
        setShowModal(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer); // Set the customer to edit
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingCustomer(null);
    };

    if (loading) return <p>Loading customers...</p>;

    return (
        <div>
            <h1>Customer Management</h1>
            <div style={{ marginBottom: '1rem' }}>
                <button onClick={openAddModal} className="btn-login" style={{maxWidth: '200px'}}>Add New Customer</button>
            </div>
            
            <Modal show={showModal} onClose={closeModal} title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}>
                <CustomerForm 
                    onSave={handleSaveCustomer}
                    customer={editingCustomer}
                    onClose={closeModal}
                />
            </Modal>

            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {customers.length > 0 ? customers.map(customer => (
                        <tr key={customer.id}>
                            <td>{customer.name}</td>
                            <td>{customer.phone_number || 'N/A'}</td>
                            <td>{customer.email || 'N/A'}</td>
                            <td>
                                <button onClick={() => openEditModal(customer)} className="btn-edit">Edit</button>
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan="4" style={{ textAlign: 'center' }}>No customers found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default CustomersPage;