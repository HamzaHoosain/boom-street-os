// frontend/src/pages/PosPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProductList from '../components/pos/ProductList';
import Cart from '../components/pos/Cart';
import CategorySidebar from '../components/pos/CategorySidebar'; // Import new component
import '../components/pos/Pos.css';

const PosPage = () => {
    const [allProducts, setAllProducts] = useState([]); // All products from the API
    const [filteredProducts, setFilteredProducts] = useState([]); // Products to display
    const [categories, setCategories] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null); // To track selected category
    const [cartItems, setCartItems] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch both products and categories on component load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsResponse, categoriesResponse] = await Promise.all([
                    api.get('/products/1'), // Hardcoded to Autopaints (business_unit_id: 1)
                    api.get('/categories')
                ]);
                setAllProducts(productsResponse.data);
                setFilteredProducts(productsResponse.data); // Initially, show all products
                setCategories(categoriesResponse.data);
            } catch (err) {
                setError('Failed to fetch data.');
                console.error(err);
            }
        };
        fetchData();
    }, []);

    // This effect runs whenever the selected category changes
    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredProducts(allProducts); // Show all products
        } else {
            // Filter products based on the selected category ID
            setFilteredProducts(
                allProducts.filter(p => p.category_id === selectedCategoryId)
            );
        }
    }, [selectedCategoryId, allProducts]);

    const handleAddToCart = (product) => {
        setSuccess('');
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

    const handleProcessSale = async () => {
        setError('');
        setSuccess('');
        if (cartItems.length === 0) return;

        const total_amount = cartItems.reduce((total, item) => total + (parseFloat(item.selling_price) * item.quantity), 0);
        const saleData = {
            business_unit_id: 1,
            total_amount,
            cart_items: cartItems.map(item => ({ id: item.id, quantity: item.quantity, selling_price: item.selling_price }))
        };

        try {
            const response = await api.post('/sales', saleData);
            setSuccess(`Sale #${response.data.saleId} processed successfully!`);
            setCartItems([]);
        } catch (err) {
            setError('Sale failed to process. Please try again.');
            console.error(err);
        }
    };

    return (
        <div>
            <h1>Point of Sale</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}
            <div className="pos-layout">
                {/* Add the new Category Sidebar */}
                <CategorySidebar
                    categories={categories}
                    selectedCategoryId={selectedCategoryId}
                    onSelectCategory={setSelectedCategoryId}
                />
                <div className="product-list-container">
                    {/* ProductList now receives the filtered list */}
                    <ProductList products={filteredProducts} onAddToCart={handleAddToCart} />
                </div>
                <div className="cart-container">
                    <Cart
                        cartItems={cartItems}
                        onRemoveFromCart={handleRemoveFromCart}
                        onProcessSale={handleProcessSale}
                    />
                </div>
            </div>
        </div>
    );
};

export default PosPage;