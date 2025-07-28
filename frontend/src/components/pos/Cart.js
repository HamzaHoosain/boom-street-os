// frontend/src/components/pos/Cart.js

import React, { useEffect, useRef, useContext } from 'react';
// THE ONLY CHANGE IS ON THIS NEXT LINE
import { AuthContext } from '../../context/AuthContext'; // Corrected path from ../ to ../../

const Cart = ({ 
    cartItems, 
    onRemoveFromCart, 
    onProcessSale, 
    onUpdatePrice, 
    onQuantityChange, 
    isBuyMode,
    subtotalPreVat,
    totalVatAmount, 
    grandTotal,     
    vatRate         
}) => {    
    const { selectedBusiness } = useContext(AuthContext);
    const currentRole = selectedBusiness?.role_name;

    const prevCartLength = useRef(cartItems.length);

    useEffect(() => {
        if (isBuyMode && cartItems.length > prevCartLength.current) {
            const lastItem = cartItems[cartItems.length - 1];
            if (lastItem) {
                const inputElement = document.getElementById(`quantity-input-${lastItem.cartId}`);
                if (inputElement) {
                    inputElement.focus();
                    inputElement.select();
                }
            }
        }
        prevCartLength.current = cartItems.length;
    }, [cartItems, isBuyMode]);

    const canOverridePrice = !isBuyMode && (currentRole === 'Admin' || currentRole === 'Manager');

    const getItemTotal = (item) => {
        const price = isBuyMode ? item.cost_price : item.selling_price;
        return (parseFloat(price) * (parseFloat(item.quantity) || 0)).toFixed(2);
    };
    
    const handlePriceClick = (item) => {
        if (!canOverridePrice) return;
        const newPriceStr = prompt("Enter new price:", item.selling_price);
        if (newPriceStr !== null) {
            const price = parseFloat(newPriceStr);
            if (!isNaN(price) && price >= 0) {
                onUpdatePrice(item.cartId, price);
            }
        }
    };

    return (
        <div className="cart">
            <h3>{isBuyMode ? 'Purchase Order' : 'Current Sale'}</h3>
            {cartItems.length === 0 ? (
                <p className="cart-empty-message">Cart is empty.</p>
            ) : (
                <ul className="cart-items">
                    {cartItems.map((item) => (
                        <li key={item.cartId} className={isBuyMode ? 'buy-mode-item' : ''}>
                            <span className="cart-item-name">{item.name}</span>
                            
                            {isBuyMode ? (
                                <div className="quantity-control-wrapper">
                                    <input
                                        type="number"
                                        id={`quantity-input-${item.cartId}`}
                                        value={item.quantity}
                                        onChange={(e) => onQuantityChange(item.cartId, e.target.value)}
                                        className="quantity-input"
                                        step="0.01"
                                        min="0"
                                    />
                                    <input
                                        type="range"
                                        value={item.quantity}
                                        onChange={(e) => onQuantityChange(item.cartId, e.target.value)}
                                        className="quantity-slider"
                                        min="0"
                                        max="200"
                                        step="0.1"
                                    />
                                </div>
                            ) : (
                                <span className="cart-item-quantity">(x {item.quantity})</span>
                            )}
                            
                            <span className={canOverridePrice ? 'price-editable' : ''} onClick={() => handlePriceClick(item)}>
                                R {getItemTotal(item)}
                            </span>
                            
                            <button className="remove-item-btn" onClick={() => onRemoveFromCart(item)}>×</button>
                        </li>
                    ))}
                </ul>
            )}

            <div className="cart-summary">
                {!isBuyMode ? (
                    <>
                        <p>Subtotal (Excl. VAT): R {subtotalPreVat.toFixed(2)}</p>
                        <p>VAT ({Math.round(vatRate * 100)}%): R {totalVatAmount.toFixed(2)}</p>
                        <hr />
                        <strong>Total: R {grandTotal.toFixed(2)}</strong>
                    </>
                ) : (
                    <strong>Total Payout: R {subtotalPreVat.toFixed(2)}</strong>
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