import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';
import InventoryList from '../components/inventory/InventoryList';
import SearchBar from '../components/common/SearchBar'; // <-- 1. IMPORT THE NEW COMPONENT
import '../components/inventory/Inventory.css';

const InventoryPage = () => {
    const [allProducts, setAllProducts] = useState([]); // Holds the original full list from the API
    const [filteredProducts, setFilteredProducts] = useState([]); // Holds the list to be displayed
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState(''); // <-- 2. ADD STATE FOR THE SEARCH TERM
    const { selectedBusiness } = useAuth();

    // --- EFFECT 1: Fetch data from the API when the business context changes ---
    useEffect(() => {
        if (!selectedBusiness) return;
        
        const fetchInventory = async () => {
            setLoading(true);
            setSearchTerm(''); // Reset search when business changes
            try {
                let response;
                const businessId = selectedBusiness.business_unit_id;

                if (!businessId) { // This is the "Company Overview" mode
                    response = await api.get('/products/overview/all');
                } else { // This is a specific business unit
                    response = await api.get(`/products/${businessId}`);
                }
                setAllProducts(response.data);
                setFilteredProducts(response.data); // Initially, display all fetched products
            } catch (err) {
                setError('Failed to fetch inventory.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInventory();
    }, [selectedBusiness]);


    // --- EFFECT 2: Filter the displayed products when the search term changes ---
    useEffect(() => {
        if (searchTerm === '') {
            setFilteredProducts(allProducts); // If search is cleared, show all products
        } else {
            // Filter the 'allProducts' list based on the search term
            const lowercasedTerm = searchTerm.toLowerCase();
            const results = allProducts.filter(product =>
                product.name.toLowerCase().includes(lowercasedTerm) ||
                product.sku?.toLowerCase().includes(lowercasedTerm)
            );
            setFilteredProducts(results);
        }
    }, [searchTerm, allProducts]);


    if (loading) return <div>Loading inventory...</div>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div>
            <h1>Inventory Management for {selectedBusiness.business_unit_name}</h1>
            
            {/* --- 3. ADD THE SEARCH BAR COMPONENT --- */}
            <SearchBar 
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                placeholder="Search by name or SKU..."
            />

            {/* The InventoryList now receives the 'filteredProducts' list */}
            <InventoryList products={filteredProducts} />
        </div>
    );
};

export default InventoryPage;