// frontend/src/components/pos/CustomerSelect.js - VERIFIED
import React from 'react';
import './CustomerSelect.css';

// The props need to be destructured inside curly braces {}
const CustomerSelect = ({ selectedCustomer, onSelectCustomer, onClearCustomer }) => {
    return (
        <div className="customer-select-container">
            <h4>Customer</h4>
            {selectedCustomer ? (
                <div className="customer-display">
                    <p>{selectedCustomer.name}</p>
                    <button onClick={onClearCustomer}>Change</button>
                </div>
            ) : (
                <button onClick={onSelectCustomer} className="btn-assign">
                    Assign Customer
                </button>
            )}
        </div>
    );
};

export default CustomerSelect;