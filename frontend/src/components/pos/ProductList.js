// frontend/src/components/pos/ProductList.js
import React from 'react';

const ProductList = ({ products, onAddToCart }) => {
    if (!products.length) {
        return <p>Loading products...</p>;
    }

    return (
        <div className="product-grid">
            {products.map((product) => (
                <div key={product.id} className="product-card" onClick={() => onAddToCart(product)}>
                    <div className="product-name">{product.name}</div>
                    <div className="product-price">R {parseFloat(product.selling_price).toFixed(2)}</div>
                </div>
            ))}
        </div>
    );
};

export default ProductList;