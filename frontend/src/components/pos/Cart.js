// frontend/src/components/pos/Cart.js
import React from 'react';

// Accept the new onProcessSale prop
const Cart = ({ cartItems, onRemoveFromCart, onProcessSale }) => {
    const calculateTotal = () => {
        return cartItems.reduce((total, item) => total + parseFloat(item.selling_price) * item.quantity, 0);
    };

    return (
        <div className="cart">
            <h3>Current Sale</h3>
            <ul className="cart-items">
                {cartItems.map((item) => (
                    <li key={item.id}>
                        <span>{item.name} (x{item.quantity})</span>
                        <span>R {(parseFloat(item.selling_price) * item.quantity).toFixed(2)}</span>
                        <button onClick={() => onRemoveFromCart(item)}>×</button>
                    </li>
                ))}
            </ul>
            <div className="cart-total">
                <strong>Total: R {calculateTotal().toFixed(2)}</strong>
            </div>
            {/* Add the onClick handler to the button */}
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