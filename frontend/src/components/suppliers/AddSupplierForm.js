// frontend/src/components/suppliers/AddSupplierForm.js
import React, { useState } from 'react';
import supplierService from '../../services/supplierService';

const AddSupplierForm = ({ onSupplierAdded, onClose }) => {
    const [name, setName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const newSupplier = {
                name,
                contact_person: contactPerson,
                phone_number: phone,
                email
            };
            const response = await supplierService.createSupplier(newSupplier);
            onSupplierAdded(response.data); // Pass the new supplier back to the parent page
            onClose(); // Close the modal
        } catch (err) {
            setError('Failed to create supplier.');
            console.error(err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>Supplier Name</label>
                <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
            </div>
            <div className="form-group">
                <label>Contact Person</label>
                <input
                    type="text"
                    className="form-control"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Phone Number</label>
                <input
                    type="text"
                    className="form-control"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                />
            </div>
            <div className="form-group">
                <label>Email</label>
                <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>
            <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>
                Save Supplier
            </button>
        </form>
    );
};

export default AddSupplierForm;