// frontend/src/pages/PosPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ProductList from '../components/pos/ProductList';
import Cart from '../components/pos/Cart';
import '../components/pos/Pos.css';

const PosPage = () => {
    const [products, setProducts] = useState([]);
    const [cartItems, setCartItems] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(''); // To show a success message

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/products/1'); 
                setProducts(response.data);
            } catch (err) {
                setError('Failed to fetch products.');
                console.error(err);
            }
        };
        fetchProducts();
    }, []);

    const handleAddToCart = (product) => {
        setSuccess(''); // Clear success message on new action
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

    // ==========================================================
    // --- NEW FUNCTION TO PROCESS THE SALE ---
    // ==========================================================
    const handleProcessSale = async () => {
        setError('');
        setSuccess('');

        if (cartItems.length === 0) {
            setError("Cannot process an empty cart.");
            return;
        }

        // 1. Calculate the total amount from the cart items on the frontend
        const total_amount = cartItems.reduce((total, item) => {
            return total + (parseFloat(item.selling_price) * item.quantity);
        }, 0);

        // 2. Prepare the payload for the API
        const saleData = {
            business_unit_id: 1, // Hardcoded to Autopaints for now
            total_amount: total_amount,
            // The API expects 'cart_items' with specific fields
            cart_items: cartItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                selling_price: item.selling_price
            }))
        };

        // 3. Send the data to the backend API
        try {
            const response = await api.post('/sales', saleData);
            setSuccess(`Sale #${response.data.saleId} processed successfully!`);
            // 4. Clear the cart for the next customer
            setCartItems([]);
        } catch (err) {
            setError('Sale failed to process. Please try again.');
            console.error(err);
        }
    };
    // ==========================================================
    // --- END OF NEW FUNCTION ---
    // ==========================================================


    return (
        <div>
            <h1>Point of Sale</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>} {/* Display success message */}
            <div className="pos-layout">
                <div className="product-list-container">
                    <ProductList products={products} onAddToCart={handleAddToCart} />
                </div>
                <div className="cart-container">
                    {/* Pass the new function as a prop to the Cart */}
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