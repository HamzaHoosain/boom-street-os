import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth'; // Import our hook
import api from '../services/api';

import ProductList from '../components/pos/ProductList';
import Cart from '../components/pos/Cart';
import CategorySidebar from '../components/pos/CategorySidebar';
import CustomerSelect from '../components/pos/CustomerSelect';
import CustomerSearchModal from '../components/pos/CustomerSearchModal';
import Modal from '../components/layout/Modal';
import '../components/pos/Pos.css';

const PosPage = () => {
    // State for data
     const { selectedBusiness } = useAuth();
    const [allProducts, setAllProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // State for UI control and filtering
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);

    // State for feedback messages
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastSaleId, setLastSaleId] = useState(null);

    // --- DATA FETCHING ---
   useEffect(() => {
        // --- THIS IS THE FIX ---
        // Only attempt to fetch data if a specific business unit is selected.
        if (selectedBusiness && selectedBusiness.business_unit_id) {
            const fetchData = async () => {
                try {
                    const [productsResponse, categoriesResponse] = await Promise.all([
                        api.get(`/products/${selectedBusiness.business_unit_id}`), // Use the dynamic ID
                          api.get(`/categories/${selectedBusiness.business_unit_id}`)
                    ]);
                    setAllProducts(productsResponse.data);
                    setFilteredProducts(productsResponse.data);
                    setCategories(categoriesResponse.data);
                } catch (err) {
                    setError('Failed to fetch page data.');
                }
            };
            fetchData();
        }
    }, [selectedBusiness]); 

    // --- FILTERING LOGIC ---
    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredProducts(allProducts);
        } else {
            setFilteredProducts(
                allProducts.filter(p => p.category_id === selectedCategoryId)
            );
        }
    }, [selectedCategoryId, allProducts]);


    // --- CART MANAGEMENT & PRICE UPDATE FUNCTIONS ---
    const handleAddToCart = (product) => {
        setSuccess('');
        setLastSaleId(null);
        setCartItems((prevItems) => {
            const itemExists = prevItems.find((item) => item.id === product.id);
            if (itemExists) {
                return prevItems.map((item) =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
    };

    const handleRemoveFromCart = (productToRemove) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find(item => item.id === productToRemove.id);
            if (existingItem.quantity === 1) {
                return prevItems.filter(item => item.id !== productToRemove.id);
            }
            return prevItems.map(item =>
                item.id === productToRemove.id ? { ...item, quantity: item.quantity - 1 } : item
            );
        });
    };
    
    const handleUpdatePrice = (productId, newPrice) => {
        setCartItems(cartItems.map(item => 
            item.id === productId ? { ...item, selling_price: newPrice } : item
        ));
    };


    // --- SALE PROCESSING ---
    const handleProcessSale = async () => {
        if (cartItems.length === 0) {
            setError("Cannot process an empty sale.");
            return;
        }
        setError('');
        setSuccess('');
        setLastSaleId(null);

        const total_amount = cartItems.reduce((total, item) => total + (parseFloat(item.selling_price) * item.quantity), 0);
        
        const saleData = {
            business_unit_id: 1,
            total_amount,
            cart_items: cartItems.map(item => ({ id: item.id, quantity: item.quantity, selling_price: item.selling_price })),
            customer_id: selectedCustomer ? selectedCustomer.id : null
        };

        try {
            const response = await api.post('/sales', saleData);
            setSuccess(`Sale #${response.data.saleId} processed successfully!`);
            setLastSaleId(response.data.saleId);
            setCartItems([]);
            setSelectedCustomer(null);
        } catch (err) {
            setError('Sale failed to process on the server. Please try again.');
            console.error(err);
        }
    };

    // --- JSX RENDER ---
    return (
        <div>
            <h1>Point of Sale</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && (
                <div className="alert-success">
                    <span>{success}</span>
                    {lastSaleId && (
                        <a href={`/invoice/${lastSaleId}`} target="_blank" rel="noopener noreferrer" className="btn-print">
                            Print Invoice
                        </a>
                    )}
                </div>
            )}
            
            <div className="pos-layout">
                <CategorySidebar
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                />
                <div className="product-list-container">
                    <ProductList products={filteredProducts} onAddToCart={handleAddToCart} />
                </div>
                <div className="cart-container">
                    <CustomerSelect 
                        selectedCustomer={selectedCustomer}
                        onSelectCustomer={() => setShowCustomerModal(true)}
                        onClearCustomer={() => setSelectedCustomer(null)}
                    />
                    <Cart
                        cartItems={cartItems}
                        onRemoveFromCart={handleRemoveFromCart}
                        onProcessSale={handleProcessSale}
                        onUpdatePrice={handleUpdatePrice} 
                    />
                </div>
            </div>

            <Modal show={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Select or Search for a Customer">
                <CustomerSearchModal 
                    onSelect={setSelectedCustomer}
                    onClose={() => setShowCustomerModal(false)}
                />
            </Modal>
        </div>
    );
};

export default PosPage;