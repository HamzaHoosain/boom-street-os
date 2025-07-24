// frontend/src/components/pos/ProductTypeSidebar.js (previously CategorySidebar.js)

import React from 'react';
// Assuming Pos.css contains the styles for .category-sidebar and its list items
import './Pos.css'; 

// Props changed: categories -> productTypes, selectedCategoryId -> selectedProductType, onSelectCategory -> onSelectProductType
const ProductTypeSidebar = ({ productTypes, selectedProductType, onSelectProductType }) => {
    return (
        <div className="category-sidebar"> {/* Keep class name for existing styles, but now it's for types */}
            <h3>Product Types</h3> {/* Updated title */}
            <ul>
                {/* Option to view all products */}
                <li
                    className={selectedProductType === null ? 'selected' : ''}
                    onClick={() => onSelectProductType(null)} // null signifies 'All Products'
                >
                    All Products
                </li>
                {/* Dynamically generated list of unique product types */}
                {productTypes.map(type => (
                    <li
                        key={type} // type itself is unique string
                        className={selectedProductType === type ? 'selected' : ''}
                        onClick={() => onSelectProductType(type)}
                    >
                        {type}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductTypeSidebar;