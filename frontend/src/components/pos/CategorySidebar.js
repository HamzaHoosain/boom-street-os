// frontend/src/components/pos/CategorySidebar.js
import React from 'react';
import './CategorySidebar.css'; // We'll create this next

const CategorySidebar = ({ categories, onSelectCategory, selectedCategoryId }) => {
    return (
        <div className="category-sidebar">
            <h4>Categories</h4>
            <ul>
                {/* "All" category to clear the filter */}
                <li
                    className={!selectedCategoryId ? 'active' : ''}
                    onClick={() => onSelectCategory(null)}
                >
                    All Products
                </li>

                {/* Map over the fetched categories */}
                {categories.map(category => (
                    <li
                        key={category.id}
                        className={selectedCategoryId === category.id ? 'active' : ''}
                        onClick={() => onSelectCategory(category.id)}
                    >
                        {category.name}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CategorySidebar;