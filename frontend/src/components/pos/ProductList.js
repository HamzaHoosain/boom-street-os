import React from 'react';

const ProductList = ({ products, onAddToCart, isBuyMode }) => {
    // A safeguard in case the products array is not yet available
    if (!products) {
        return <p>Loading products...</p>;
    }

    if (products.length === 0) {
        return <p>No products found for this business or category.</p>;
    }

    return (
        <div className="product-grid">
            {products.map((product) => (
                <div key={product.id} className="product-card" onClick={() => onAddToCart(product)}>
                    <div className="product-name">{product.name}</div>
                    
                    {/* 
                      This is a key piece of logic:
                      - If isBuyMode is true, it displays the product's cost_price.
                      - If isBuyMode is false, it displays the product's selling_price.
                    */}
                    <div className="product-price">
                        R {parseFloat(isBuyMode ? product.cost_price : product.selling_price).toFixed(2)}
                        {isBuyMode && ' /kg'}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ProductList;