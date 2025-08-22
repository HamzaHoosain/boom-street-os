// frontend/src/components/pos/Cart.js

import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const Cart = ({
    cartItems,
    onRemoveFromCart,
    onProcess,
    onUpdatePrice,
    onQuantityChange,
    mode,
    isCostMode,
    subtotalPreVat,
    totalVatAmount,
    grandTotal,
    vatRate
}) => {
    const { selectedBusiness } = useContext(AuthContext);
    const currentRole = selectedBusiness?.role_name;
    const prevCartLength = useRef(cartItems.length);
    
    const [editingPriceCartId, setEditingPriceCartId] = useState(null);
    const [editedPrice, setEditedPrice] = useState('');

    useEffect(() => {
        if ((isCostMode || mode === 'buy') && cartItems.length > prevCartLength.current) {
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
    }, [cartItems, isCostMode, mode]);
    
    const getUIText = () => {
        switch(mode) {
            case 'quote':
                return { title: 'Current Quote', totalLabel: 'Quote Total:', buttonText: 'Save Quote' };
            case 'sales_order':
                return { title: 'Sales Order', totalLabel: 'Order Total:', buttonText: 'Create Sales Order' };
            case 'purchase_order':
                return { title: 'Purchase Order', totalLabel: 'Order Total (Cost):', buttonText: 'Create Purchase Order' };
            case 'buy':
                return { title: 'Current Purchase', totalLabel: 'Total Payout:', buttonText: 'Process Payout' };
            case 'sell':
            default:
                return { title: 'Current Sale', totalLabel: 'Total Due:', buttonText: 'Process Sale' };
        }
    };
    const { title, totalLabel, buttonText } = getUIText();
    
    const canOverridePrice = !isCostMode && (currentRole === 'Admin' || currentRole === 'Manager');

    const getItemTotal = (item) => {
        const price = isCostMode ? (item.cost_price || 0) : (item.selling_price || 0);
        return (parseFloat(price) * (parseFloat(item.quantity) || 0)).toFixed(2);
    };

    const handlePriceClick = (item) => {
        if (!canOverridePrice) return;
        setEditingPriceCartId(item.cartId);
        setEditedPrice(String(item.selling_price));
    };
    const handlePriceChange = (e) => {
        setEditedPrice(e.target.value);
    };
    const handlePriceUpdate = (cartId) => {
        const price = parseFloat(editedPrice);
        if (!isNaN(price) && price >= 0) {
            onUpdatePrice(cartId, price);
        }
        setEditingPriceCartId(null);
        setEditedPrice('');
    };
    const handleKeyDown = (e, cartId) => {
        if (e.key === 'Enter') handlePriceUpdate(cartId);
        if (e.key === 'Escape') {
            setEditingPriceCartId(null);
            setEditedPrice('');
        }
    };

    return (
        <div className="cart">
            <h3>{title}</h3>
            {cartItems.length === 0 ? ( <p className="cart-empty-message">Cart is empty.</p> ) : (
                <ul className="cart-items">
                    {cartItems.map((item) => (
                        <li key={item.cartId} className={item.lowStockWarning ? 'low-stock-warning' : ''}>
                            <div className="cart-item-main-line">
                                <span className="cart-item-name">{item.name}</span>
                                {editingPriceCartId === item.cartId ? (
                                    <input
                                        type="number"
                                        value={editedPrice}
                                        onChange={handlePriceChange}
                                        onBlur={() => handlePriceUpdate(item.cartId)}
                                        onKeyDown={(e) => handleKeyDown(e, item.cartId)}
                                        className="price-input-override"
                                        autoFocus
                                    />
                                ) : (
                                    <span className={canOverridePrice ? 'price-editable' : ''} onClick={() => handlePriceClick(item)}>
                                        R {getItemTotal(item)}
                                    </span>
                                )}
                                <button className="remove-item-btn" onClick={() => onRemoveFromCart(item)}>×</button>
                            </div>
                            
                            <div className="cart-item-sub-line">
                                {item.lowStockWarning && <span className="stock-warning-label">Low Stock! (On Hand: {item.quantity_on_hand})</span>}
                                {isCostMode || mode === 'buy' || mode.includes('order') || mode === 'quote' ? (
                                    <div className="quantity-control-wrapper-simple">
                                        <span>Qty:</span>
                                        <input
                                            type="number"
                                            id={`quantity-input-${item.cartId}`}
                                            value={item.quantity}
                                            onChange={(e) => onQuantityChange(item.cartId, e.target.value)}
                                            className="quantity-input-simple"
                                            step="0.01" min="0"
                                        />
                                    </div>
                                ) : (
                                    <span className="cart-item-quantity">(Unit Price: R{parseFloat(item.selling_price).toFixed(2)} x {item.quantity})</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            )}

           <div className="cart-summary">
                {/* --- REPLACE THIS ENTIRE LOGIC BLOCK --- */}
                {mode === 'buy' ? (
                    // "Buy" mode is an immediate payout, typically shown without VAT breakdown on the screen
                    <div className="summary-line final-total">
                        <strong>{totalLabel}</strong>
                        <strong>R {subtotalPreVat.toFixed(2)}</strong>
                    </div>
                ) : (
                    <>
                        <div className="summary-line">
                            <span>Subtotal (Excl. VAT):</span>
                            <span>R {subtotalPreVat.toFixed(2)}</span>
                        </div>
                        <div className="summary-line">
                            <span>VAT ({Math.round(vatRate * 100)}%):</span>
                            <span>R {totalVatAmount.toFixed(2)}</span>
                        </div>
                        <hr className="summary-divider" />
                        <div className="summary-line final-total">
                            <strong>{totalLabel}</strong>
                            <strong>R {grandTotal.toFixed(2)}</strong>
                        </div>
                    </>
                )}
            </div>
            
            <button 
                className={`btn-process-default btn-process-${mode}`}
                disabled={cartItems.length === 0}
                onClick={onProcess}
            >
                {buttonText}
            </button>
        </div>
    );
};

export default Cart;