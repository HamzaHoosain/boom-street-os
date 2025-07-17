// frontend/src/pages/SuppliersPage.js
import React, { useState, useEffect } from 'react';
import supplierService from '../services/supplierService';
import Modal from '../components/layout/Modal'; // Import Modal
import AddSupplierForm from '../components/suppliers/AddSupplierForm'; // Import Form

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false); // State to control modal visibility

    const fetchSuppliers = () => {
        setLoading(true);
        supplierService.getSuppliers().then(response => {
            setSuppliers(response.data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const handleSupplierAdded = (newSupplier) => {
        // Add the new supplier to our list without needing to re-fetch everything
        setSuppliers([...suppliers, newSupplier]);
    };

    if (loading) return <p>Loading suppliers...</p>;

    return (
        <div>
            <h1>Supplier Management</h1>
            {/* This button now controls the modal */}
            <button onClick={() => setShowModal(true)} className="btn-login" style={{maxWidth: '200px'}}>
                Add New Supplier
            </button>
            
            {/* The Modal component */}
            <Modal show={showModal} onClose={() => setShowModal(false)} title="Add New Supplier">
                <AddSupplierForm
                    onSupplierAdded={handleSupplierAdded}
                    onClose={() => setShowModal(false)}
                />
            </Modal>

            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Contact Person</th>
                        <th>Phone</th>
                        <th>Email</th>
                    </tr>
                </thead>
                <tbody>
                    {suppliers.map(supplier => (
                        <tr key={supplier.id}>
                            <td>{supplier.name}</td>
                            <td>{supplier.contact_person || 'N/A'}</td>
                            <td>{supplier.phone_number || 'N/A'}</td>
                            <td>{supplier.email || 'N/A'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default SuppliersPage;