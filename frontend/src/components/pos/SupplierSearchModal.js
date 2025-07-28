// frontend/src/components/pos/SupplierSearchModal.js

import React, { useState } from 'react';
import api from '../../services/api';

const SupplierSearchModal = ({ onSelect, onClose, selectedBusiness }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleSearch = async (e) => {
        const term = e.target.value;
        setSearchTerm(term);
        
        if (term.length < 1 || !selectedBusiness?.business_unit_id) {
            setResults([]);
            return;
        }

        setLoading(true);
        try {
            // CRITICAL FIX: This now calls the correct tenant-aware search endpoint
            const res = await api.get(`/suppliers?businessUnitId=${selectedBusiness.business_unit_id}&search=${term}`);
            setResults(res.data);
        } catch (error) {
            console.error("Failed to search suppliers:", error);
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
                placeholder="Search by supplier name..."
                className="form-control"
                autoFocus
            />
            {loading && <p>Searching...</p>}
            <ul className="search-results-list">
                {results.length > 0 ? (
                    results.map(supplier => (
                        <li key={supplier.id} onClick={() => onSelect(supplier)}>
                            {supplier.name}
                        </li>
                    ))
                ) : (
                    searchTerm.length > 0 && !loading && <li>No results found.</li>
                )}
            </ul>
        </div>
    );
};

export default SupplierSearchModal;