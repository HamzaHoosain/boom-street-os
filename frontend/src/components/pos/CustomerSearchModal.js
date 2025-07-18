// frontend/src/components/pos/CustomerSearchModal.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './CustomerSearchModal.css';

const CustomerSearchModal = ({ onSelect, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    // This effect runs every time the user stops typing in the search bar
    useEffect(() => {
        // Don't search on an empty string
        if (searchTerm.trim() === '') {
            setResults([]);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            setLoading(true);
            api.get(`/customers?search=${searchTerm}`)
                .then(response => {
                    setResults(response.data);
                })
                .catch(err => console.error("Search failed", err))
                .finally(() => setLoading(false));
        }, 500); // Wait 500ms after user stops typing before sending API request

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const handleSelectCustomer = (customer) => {
        onSelect(customer); // Pass the selected customer back to the parent
        onClose(); // Close the modal
    };

    return (
        <div className="customer-search-modal">
            <input
                type="text"
                placeholder="Search by name or phone number..."
                className="form-control"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
            />
            <div className="search-results">
                {loading && <p>Searching...</p>}
                {!loading && results.length > 0 && (
                    <ul>
                        {results.map(customer => (
                            <li key={customer.id} onClick={() => handleSelectCustomer(customer)}>
                                <strong>{customer.name}</strong>
                                <small>{customer.phone_number}</small>
                            </li>
                        ))}
                    </ul>
                )}
                {!loading && searchTerm && results.length === 0 && (
                    <p>No customers found.</p>
                )}
            </div>
        </div>
    );
};

export default CustomerSearchModal;