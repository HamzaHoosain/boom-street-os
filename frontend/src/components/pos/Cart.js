import React, { useContext, useState } from 'react';
import { useAuth } from '../../context/useAuth';

const Cart = ({ cartItems, onRemoveFromCart, onProcessSale, onUpdatePrice, onQuantityChange, isBuyMode }) => {    const { currentRole } = useAuth();
    const [editingItemCartId, setEditingItemCartId] = useState(null);
    const [newPrice, setNewPrice] = useState('');

    const calculateTotal = () => {
        return cartItems.reduce((total, item) => {
            // KEY FIX: Use the correct price based on the mode
            const price = isBuyMode ? parseFloat(item.cost_price) : parseFloat(item.selling_price);
            return total + price * item.quantity;
        }, 0);
    };

    // Price overrides are only possible in Sell Mode by authorized users
    const canOverridePrice = !isBuyMode && (currentRole === 'Admin' || currentRole === 'Manager');

    const handlePriceClick = (item) => {
        if (!canOverridePrice) return;
        setEditingItemCartId(item.cartId);
        setNewPrice(item.selling_price);
    };

    const handlePriceChange = (e) => {
        setNewPrice(e.target.value);
    };

    const handlePriceUpdate = (item) => {
        const price = parseFloat(newPrice);
        if (!isNaN(price) && price >= 0) {
            onUpdatePrice(item.cartId, price);
        }
        setEditingItemCartId(null);
    };
    
    const handleKeyPress = (e, item) => {
        if (e.key === 'Enter') {
            handlePriceUpdate(item);
        }
    };

    const getItemTotal = (item) => {
        // KEY FIX: Use the correct price for the line item total based on the mode
        const price = isBuyMode ? item.cost_price : item.selling_price;
        return (parseFloat(price) * item.quantity).toFixed(2);
    };

    return (
        <div className="cart">
            <h3>{isBuyMode ? 'Purchase Order' : 'Current Sale'}</h3>
            <ul className="cart-items">
                {cartItems.map((item) => (
                    <li key={item.cartId}>
    <span className="cart-item-name">{item.name}</span>
    
    {/* --- THIS IS THE NEW LOGIC --- */}
    {isBuyMode ? (
        <input
            type="number"
            value={item.quantity}
            onChange={(e) => onQuantityChange(item.cartId, e.target.value)}
            className="quantity-input"
            autoFocus
        />
    ) : (
        <span className="cart-item-quantity">(x {item.quantity})</span>
    )}
    {/* --- END OF NEW LOGIC --- */}
    
    <span className={canOverridePrice ? 'price-editable' : ''} onClick={() => handlePriceClick(item)}>
        R {getItemTotal(item)}
    </span>
    
    <button onClick={() => onRemoveFromCart(item)}>×</button>
</li>
                ))}
            </ul>
            <div className="cart-total">
                <strong>{isBuyMode ? 'Total Payout:' : 'Total:'} R {calculateTotal().toFixed(2)}</strong>
            </div>
            <button 
                className={isBuyMode ? 'btn-buy' : 'btn-process-sale'} 
                disabled={cartItems.length === 0}
                onClick={onProcessSale}
            >
                {isBuyMode ? 'Process Payout' : 'Process Sale'}
            </button>
        </div>
    );
};

export default Cart;