// frontend/src/components/pos/SupplierList.js

import React from 'react';
import './Pos.css'; // We'll add styles for this in Pos.css

const SupplierList = ({ suppliers, onSelectSupplier, filterTerm }) => {
    
    const filteredSuppliers = suppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
        (supplier.contact_person && supplier.contact_person.toLowerCase().includes(filterTerm.toLowerCase()))
    );

    if (suppliers.length > 0 && filteredSuppliers.length === 0) {
        return <p className="loading-or-empty-message">No suppliers match your search.</p>;
    }

    if (filteredSuppliers.length === 0) {
        return <p className="loading-or-empty-message">Loading suppliers...</p>;
    }

    return (
        <div className="supplier-grid">
            {filteredSuppliers.map((supplier) => (
                <div 
                    key={supplier.id} 
                    className="supplier-card" 
                    onClick={() => onSelectSupplier(supplier)}
                >
                    <div className="supplier-card-name">{supplier.name}</div>
                    <div className="supplier-card-contact">{supplier.contact_person || supplier.phone_number || 'No contact info'}</div>
                </div>
            ))}
        </div>
    );
};

export default SupplierList;