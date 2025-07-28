// frontend/src/components/pos/ProductList.js

import React from 'react';

// The new ProductList component for the image-driven grid
const ProductList = ({ products, onAddToCart, isBuyMode, customPrices = {} }) => {
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
                const displayPrice = isBuyMode 
                    ? product.cost_price 
                    : (customPrice !== undefined ? customPrice : product.selling_price);

                // Check if this product has a special price for the current customer
                const hasCustomPrice = !isBuyMode && customPrice !== undefined;
                
                // Use the product's image_url, or fallback to the placeholder
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
                                R {parseFloat(displayPrice).toFixed(2)}
                                {isBuyMode && ' /kg'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ProductList;