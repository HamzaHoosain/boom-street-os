// components/pos/Cart.js

import React, { useContext, useState } from 'react';
import { useAuth } from '../../context/useAuth';

// New props added: subtotalPreVat, totalVatAmount, grandTotal, vatRate
const Cart = ({ 
    cartItems, 
    onRemoveFromCart, 
    onProcessSale, 
    onUpdatePrice, 
    onQuantityChange, 
    isBuyMode,
    subtotalPreVat,    // NEW PROP
    totalVatAmount,    // NEW PROP
    grandTotal,        // NEW PROP
    vatRate            // NEW PROP
}) => {    
    const { currentRole } = useAuth();
    const [editingItemCartId, setEditingItemCartId] = useState(null);
    const [newPrice, setNewPrice] = useState('');

    // This function calculates the total based on the individual item prices and quantities
    // It is primarily used for the individual item line totals and the 'buy' mode total.
    // For 'sell' mode, the final grandTotal is passed as a prop from PosPage.js
    const calculateTotal = () => {
        return cartItems.reduce((total, item) => {
            // Use the correct price based on the mode
            const price = isBuyMode ? parseFloat(item.cost_price) : parseFloat(item.selling_price);
            const quantity = parseFloat(item.quantity);
            // Ensure calculation handles potential NaN from parseFloat
            if (isNaN(price) || isNaN(quantity)) return total;
            return total + price * quantity;
        }, 0);
    };

    // Price overrides are only possible in Sell Mode by authorized users
    const canOverridePrice = !isBuyMode && (currentRole === 'Admin' || currentRole === 'Manager');

    const handlePriceClick = (item) => {
        if (!canOverridePrice) return;
        setEditingItemCartId(item.cartId);
        // Ensure newPrice is initialized with a number
        setNewPrice(parseFloat(item.selling_price) || ''); 
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
        setNewPrice(''); // Clear newPrice state after update
    };
    
    const handleKeyPress = (e, item) => {
        if (e.key === 'Enter') {
            handlePriceUpdate(item);
        }
    };

    const getItemTotal = (item) => {
        // Use the correct price for the line item total based on the mode
        const price = isBuyMode ? item.cost_price : item.selling_price;
        const quantity = parseFloat(item.quantity);
        const calculatedPrice = parseFloat(price);

        // Ensure calculation handles potential NaN
        if (isNaN(calculatedPrice) || isNaN(quantity)) return '0.00';

        return (calculatedPrice * quantity).toFixed(2);
    };

    return (
        <div className="cart">
            <h3>{isBuyMode ? 'Purchase Order' : 'Current Sale'}</h3>
            {cartItems.length === 0 ? (
                <p>Cart is empty.</p>
            ) : (
                <ul className="cart-items">
                    {cartItems.map((item) => (
                        <li key={item.cartId}>
                            <span className="cart-item-name">{item.name}</span>
                            
                            {isBuyMode ? (
                                <input
                                    type="number"
                                    step="0.01" // Allow decimal quantities/weights
                                    value={parseFloat(item.quantity) || ''} // Ensure it's a number for input
                                    onChange={(e) => onQuantityChange(item.cartId, e.target.value)}
                                    className="quantity-input"
                                    // autoFocus might cause issues if too many inputs. Consider carefully.
                                    // autoFocus={item.cartId === cartItems[cartItems.length - 1]?.cartId} // Auto-focus last added item
                                />
                            ) : (
                                <span className="cart-item-quantity">(x {item.quantity})</span>
                            )}
                            
                            {/* Price display and override logic */}
                            {editingItemCartId === item.cartId ? (
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newPrice}
                                    onChange={handlePriceChange}
                                    onBlur={() => handlePriceUpdate(item)} // Update on blur
                                    onKeyPress={(e) => handleKeyPress(e, item)}
                                    className="price-input-override"
                                    autoFocus // Auto-focus when in editing mode
                                />
                            ) : (
                                <span className={canOverridePrice ? 'price-editable' : ''} onClick={() => handlePriceClick(item)}>
                                    R {getItemTotal(item)}
                                </span>
                            )}
                            
                            <button onClick={() => onRemoveFromCart(item)}>×</button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="cart-total">
                {/* Conditional display for VAT breakdown in 'sell' mode */}
                {!isBuyMode && (
                    <>
                        <p>Subtotal (Excl. VAT): R {subtotalPreVat.toFixed(2)}</p>
                        <p>VAT ({Math.round(vatRate * 100)}%): R {totalVatAmount.toFixed(2)}</p>
                        <hr />
                        <strong>Total: R {grandTotal.toFixed(2)}</strong>
                    </>
                )}
                {/* Display for 'buy' mode (simple total) */}
                {isBuyMode && (
                    <strong>Total Payout: R {calculateTotal().toFixed(2)}</strong>
                )}
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