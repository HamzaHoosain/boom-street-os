// frontend/src/pages/InventoryPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/useAuth';
import api from '../services/api';

import InventoryList from '../components/inventory/InventoryList';
import ProductFormModal from '../components/inventory/ProductFormModal';
// NEW: Import a new component for the category dropdown
import CategoryDropdown from '../components/inventory/CategoryDropdown';
import SearchBar from '../components/common/SearchBar';

import '../components/inventory/Inventory.css';

const InventoryPage = () => {
    const { selectedBusiness } = useAuth();
    
    // Data State
    const [allProducts, setAllProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    
    // Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);

    const fetchData = async () => {
        if (!selectedBusiness?.business_unit_id) return;
        setLoading(true);
        try {
            const [productsRes, categoriesRes] = await Promise.all([
                api.get(`/products/${selectedBusiness.business_unit_id}`),
                api.get(`/categories/${selectedBusiness.business_unit_id}`)
            ]);
            setAllProducts(productsRes.data);
            setFilteredProducts(productsRes.data);
            setCategories(categoriesRes.data);
            setError('');
        } catch (err) {
            console.error("Failed to fetch inventory data:", err);
            setError('Failed to load inventory data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [selectedBusiness]);

    // This filtering effect remains the same and is correct
    useEffect(() => {
        let tempProducts = [...allProducts];
        if (selectedCategoryId) {
            tempProducts = tempProducts.filter(p => p.category_id === selectedCategoryId);
        }
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempProducts = tempProducts.filter(p =>
                p.name.toLowerCase().includes(lowercasedTerm) ||
                (p.sku && p.sku.toLowerCase().includes(lowercasedTerm))
            );
        }
        setFilteredProducts(tempProducts);
    }, [searchTerm, selectedCategoryId, allProducts]);

    // --- All CRUD handlers (Product and Category) remain the same ---
    const handleAddProductClick = () => {
        setEditingProduct(null);
        setIsProductModalOpen(true);
    };

    const handleEditProductClick = (product) => {
        setEditingProduct(product);
        setIsProductModalOpen(true);
    };

    const handleSaveProduct = async (productData) => {
        // ... (code is identical to previous step, no changes needed here)
        try {
            const payload = { ...productData, category_id: productData.category_id || selectedCategoryId, business_unit_id: selectedBusiness.business_unit_id };
            if (editingProduct) { await api.put(`/products/${editingProduct.id}`, payload); }
            else { await api.post('/products', payload); }
            setIsProductModalOpen(false);
            fetchData();
        } catch (err) { alert('Failed to save product.'); }
    };

    const handleDeleteProduct = async (productId) => {
        // ... (code is identical to previous step, no changes needed here)
        if (window.confirm('Are you sure?')) { await api.delete(`/products/${productId}`); fetchData(); }
    };

    const handleSaveCategory = async (categoryData) => {
        // ... (code is identical to previous step, no changes needed here)
        try {
            if (categoryData.id) { await api.put(`/categories/${categoryData.id}`, { name: categoryData.name }); }
            else { await api.post('/categories', { name: categoryData.name, business_unit_id: selectedBusiness.business_unit_id }); }
            fetchData();
        } catch (err) { alert('Failed to save category.'); }
    };

    const handleDeleteCategory = async (categoryId) => {
        // ... (code is identical to previous step, no changes needed here)
        if (window.confirm('Are you sure?')) {
            await api.delete(`/categories/${categoryId}`);
            if(selectedCategoryId === categoryId) { setSelectedCategoryId(null); }
            fetchData();
        }
    };

    if (!selectedBusiness) {
        return <div className="inventory-container"><h1>Inventory</h1><p>Please select a business unit.</p></div>;
    }

    if (loading) return <div className="inventory-container"><p>Loading...</p></div>;
    if (error) return <div className="inventory-container"><p className="alert-error">{error}</p></div>;

    const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'All Products';

    return (
        <div className="inventory-container">
            {/* MODIFIED: The layout is now a single column, not a grid */}
            <div className="inventory-header">
                <h1>Inventory: <span className="header-category-name">{selectedCategoryName}</span></h1>
                <button className="btn-add-product" onClick={handleAddProductClick}>+ Add Product</button>
            </div>
            
            <div className="inventory-controls">
                <SearchBar 
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    placeholder="Search products in this view..."
                />
                {/* NEW: Using the dropdown component */}
                <CategoryDropdown
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                    onSaveCategory={handleSaveCategory}
                    onDeleteCategory={handleDeleteCategory}
                />
            </div>
            
            <div className="table-wrapper">
                <InventoryList 
                    products={filteredProducts} 
                    onEdit={handleEditProductClick}
                    onDelete={handleDeleteProduct}
                    categories={categories}
                />
            </div>

            {isProductModalOpen && (
                <ProductFormModal 
                    show={isProductModalOpen}
                    onClose={() => setIsProductModalOpen(false)}
                    onSave={handleSaveProduct}
                    product={editingProduct}
                    categories={categories}
                    preselectedCategoryId={selectedCategoryId} 
                />
            )}
        </div>
    );
};

export default InventoryPage;