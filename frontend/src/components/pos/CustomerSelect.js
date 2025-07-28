// frontend/src/components/pos/CustomerSelect.js

import React from 'react';
import './CustomerSelect.css';

// CRITICAL FIX: Destructure the new `onViewCustomer` prop from the props object
const CustomerSelect = ({ selectedCustomer, onSelectCustomer, onClearCustomer, onViewCustomer }) => {
    return (
        <div className="customer-select-container">
            <h4>Customer</h4>
            {selectedCustomer ? (
                <div className="customer-display">
                    <p>{selectedCustomer.name}</p>
                    <div className="customer-display-actions">
                        {/* CRITICAL FIX: The onClick handler for this button now correctly uses the prop */}
                        <button onClick={onViewCustomer} className="btn-view-account">View Account</button>
                        <button onClick={onClearCustomer} className="btn-change-customer">Change</button>
                    </div>
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