// frontend/src/components/pos/Cart.js - ENHANCED
import React, { useContext, useState } from 'react';
import { AuthContext } from '../../context/AuthContext'; // We need the user's role

const Cart = ({ cartItems, onRemoveFromCart, onProcessSale, onUpdatePrice }) => {
    const { selectedBusiness } = useContext(AuthContext); // Get the user's current role
    const [editingItem, setEditingItem] = useState(null); // Track which item is being edited
    const [newPrice, setNewPrice] = useState('');

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + parseFloat(item.selling_price) * item.quantity, 0);
    };

    // Check if the user has a privileged role
    const canOverridePrice = selectedBusiness?.role_name === 'Admin' || selectedBusiness?.role_name === 'Manager';

    const handlePriceClick = (item) => {
        if (!canOverridePrice) return; // Do nothing if user is not an admin/manager
        setEditingItem(item.id);
        setNewPrice(item.selling_price);
    };

    const handlePriceChange = (e) => {
        setNewPrice(e.target.value);
    };

    const handlePriceBlur = (item) => {
        // When the input loses focus, update the price
        const price = parseFloat(newPrice);
        if (!isNaN(price) && price >= 0) {
            onUpdatePrice(item.id, price);
        }
        setEditingItem(null); // Stop editing
    };
    
    const handleKeyPress = (e, item) => {
        if (e.key === 'Enter') {
            handlePriceBlur(item);
        }
    };

    return (
        <div className="cart">
            <h3>Current Sale</h3>
            <ul className="cart-items">
                {cartItems.map((item) => (
                    <li key={item.id}>
                        <span>{item.name} (x{item.quantity})</span>
                        
                        {editingItem === item.id ? (
                            <input
                                type="number"
                                value={newPrice}
                                onChange={handlePriceChange}
                                onBlur={() => handlePriceBlur(item)}
                                onKeyPress={(e) => handleKeyPress(e, item)}
                                autoFocus
                                className="price-input"
                            />
                        ) : (
                            <span 
                                className={canOverridePrice ? 'price-editable' : ''}
                                onClick={() => handlePriceClick(item)}
                            >
                                R {(parseFloat(item.selling_price) * item.quantity).toFixed(2)}
                            </span>
                        )}
                        
                        <button onClick={() => onRemoveFromCart(item)}>×</button>
                    </li>
                ))}
            </ul>
            <div className="cart-total">
                <strong>Total: R {calculateTotal().toFixed(2)}</strong>
            </div>
            <button 
                className="btn-process-sale" 
                disabled={cartItems.length === 0}
                onClick={onProcessSale}
            >
                Process Sale
            </button>
        </div>
    );
};

export default Cart;