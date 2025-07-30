// frontend/src/components/pos/ProductList.js

import React from 'react';
import './Pos.css'; // Ensure you're importing the styles for the new image grid

const ProductList = ({ products, onAddToCart, isCostMode, customPrices = {} }) => {
    if (!products) {
        return <p className="loading-or-empty-message">Loading products...</p>;
    }

    if (products.length === 0) {
        return <p className="loading-or-empty-message">No products found for the current filter.</p>;
    }

    return (
        <div className="product-list-area">
            {products.map((product) => {
                // Determine the correct price to display (default, custom, or cost)
                const customPrice = customPrices[product.id];
                const displayPrice = isCostMode ? product.cost_price : (customPrice !== undefined ? customPrice : product.selling_price);
                
                // --- CRITICAL FIX 1 ---
                // Check if this product has a special price, using the correct 'isCostMode' variable.
                const hasCustomPrice = !isCostMode && customPrice !== undefined;
                
                // Use the product's image_url, or fallback to a placeholder if it doesn't exist.
                // Ensure you have a placeholder.png in your /public folder.
                const imageUrl = product.image_url || '/placeholder.png'; 

                return (
                    <div 
                        key={product.id} 
                        className="image-product-card" 
                        onClick={() => onAddToCart(product)}
                        style={{ backgroundImage: `url(${imageUrl})` }}
                    >
                        <div className="card-overlay">
                            <div className="card-product-name">{product.name}</div>
                            <div className={`card-product-price ${hasCustomPrice ? 'custom' : ''}`}>
                                R {parseFloat(displayPrice || 0).toFixed(2)}

                                {/* --- CRITICAL FIX 2 --- */}
                                {/* The check for '/kg' suffix must also use 'isCostMode'. */}
                                {isCostMode && ' /kg'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProductList;