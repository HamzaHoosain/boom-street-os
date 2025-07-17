// frontend/src/pages/InventoryPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import InventoryList from '../components/inventory/InventoryList';
import '../components/inventory/Inventory.css';

const InventoryPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Fetch products from the backend when the component loads
    useEffect(() => {
        const fetchInventory = async () => {
            try {
                // For now, we'll hardcode fetching for Autopaints (business_unit_id: 1)
                // Later, this ID will come from the logged-in user's profile
                const response = await api.get('/products/1');
                setProducts(response.data);
            } catch (err) {
                setError('Failed to fetch inventory.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchInventory();
    }, []); // The empty array means this effect runs once on mount

    if (loading) {
        return <div>Loading inventory...</div>;
    }

    if (error) {
        return <p className="alert-error">{error}</p>;
    }

    return (
        <div>
            <h1>Inventory Management</h1>
            {/* We can add search and filter controls here later */}
            <InventoryList products={products} />
        </div>
    );
};

export default InventoryPage;