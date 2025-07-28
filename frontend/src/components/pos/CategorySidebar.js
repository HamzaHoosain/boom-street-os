// frontend/src/components/pos/CategorySidebar.js

import React from 'react';
import './Pos.css'; 

const CategorySidebar = ({ categories, selectedCategoryId, onSelectCategory }) => {
    return (
        <div className="category-sidebar">
            <h3>Categories</h3>
            <ul>
                <li
                    className={!selectedCategoryId ? 'selected' : ''}
                    onClick={() => onSelectCategory(null)}
                >
                    All Products
                </li>
                {categories.map(cat => (
                    <li
                        key={cat.id}
                        className={selectedCategoryId === cat.id ? 'selected' : ''}
                        onClick={() => onSelectCategory(cat.id)}
                    >
                        {cat.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CategorySidebar;