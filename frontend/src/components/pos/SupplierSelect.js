// frontend/src/components/pos/SupplierSelect.js

import React from 'react';
import './CustomerSelect.css'; // Reuse styles

// CRITICAL FIX: Destructure the new `onViewSupplier` prop from the props object
const SupplierSelect = ({ selectedSupplier, onSelectSupplier, onClearSupplier, onViewSupplier }) => {
    return (
        <div className="customer-select-container">
            <h4>Supplier</h4>
            {selectedSupplier ? (
                <div className="customer-display">
                    <p>{selectedSupplier.name}</p>
                    <div className="customer-display-actions">
                        {/* CRITICAL FIX: The onClick handler for this button now correctly uses the prop */}
                        {/* This button is disabled for now but wired up for the future */}
                        <button onClick={onViewSupplier} className="btn-view-account" title="View Supplier Details (Future Feature)">View Details</button>
                        <button onClick={onClearSupplier} className="btn-change-customer">Change</button>
                    </div>
                </div>
            ) : (
                <button onClick={onSelectSupplier} className="btn-assign">
                    Assign Supplier
                </button>
            )}
        </div>
    );
};

export default SupplierSelect;