// frontend/src/components/pos/CustomerSearchModal.js

import React, { useState } from 'react';
import api from '../../services/api';

const CustomerSearchModal = ({ onSelect, onClose, selectedBusiness }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        
        // Guard clause: Don't search without a term or business context
        if (term.length < 2 || !selectedBusiness?.business_unit_id) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // CRITICAL: Call the new, tenant-aware search API endpoint
            const res = await api.get(`/customers?businessUnitId=${selectedBusiness.business_unit_id}&search=${term}`);
            setResults(res.data);
        } catch (error) {
            console.error("Failed to search customers:", error);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="customer-search-modal">
            <input
                type="text"
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search by name or phone number..."
                className="form-control"
                autoFocus
            />
            {loading && <p>Searching...</p>}
            <ul className="search-results-list">
                {results.length > 0 ? (
                    results.map(customer => (
                        <li key={customer.id} onClick={() => onSelect(customer)}>
                            {customer.name} - {customer.phone_number}
                        </li>
                    ))
                ) : (
                    searchTerm.length > 1 && !loading && <li>No results found.</li>
                )}
            </ul>
        </div>
    );
};

export default CustomerSearchModal;