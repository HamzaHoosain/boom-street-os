// frontend/src/pages/InventoryPage.js - CORRECTED
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth'; // Import our hook
import api from '../services/api';
import InventoryList from '../components/inventory/InventoryList';
import '../components/inventory/Inventory.css';

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { selectedBusiness } = useAuth(); // Get the currently selected business

    useEffect(() => {
        // Only fetch data if a specific business unit has been selected
        if (selectedBusiness && selectedBusiness.business_unit_id) {
            const fetchInventory = async () => {
                setLoading(true);
                try {
            let response;
            // --- THIS IS THE FIX ---
            if (selectedBusiness && !selectedBusiness.business_unit_id) {
                // If in "Company Overview" mode, call the new endpoint
                response = await api.get('/products/overview/all');
            } else {
                // Otherwise, get products for the specific business
                response = await api.get(`/products/${selectedBusiness.business_unit_id}`);
            }
            setProducts(response.data);
                } catch (err) {
                    setError('Failed to fetch inventory.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };
            fetchInventory();
        } else {
            // Handle the case where the user is in "Company Overview" mode
            setProducts([]); // Show an empty list
            setLoading(false);
        }
    }, [selectedBusiness]); // This effect re-runs whenever the user switches businesses

    if (loading) return <div>Loading inventory...</div>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div>
            <h1>Inventory Management for {selectedBusiness.business_unit_name}</h1>
            
            {/* Show a message if the user is in overview mode */}
            {!selectedBusiness.business_unit_id && (
                <p>Please select a specific business unit from the header to view its inventory.</p>
            )}

            {/* Only show the table if there is a business ID selected */}
            {selectedBusiness.business_unit_id && <InventoryList products={products} />}
        </div>
    );
};

export default InventoryPage;