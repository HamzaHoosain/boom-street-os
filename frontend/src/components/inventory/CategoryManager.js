// frontend/src/components/inventory/CategoryManager.js

import React from 'react';
import './Inventory.css';

const CategoryManager = ({ categories, selectedCategoryId, onSelectCategory, onSaveCategory, onDeleteCategory }) => {
    
    const handleAdd = () => {
        const name = prompt("Enter new category name:");
        if (name) {
            onSaveCategory({ name });
        }
    };

    const handleEdit = (category) => {
        const name = prompt("Enter new name for category:", category.name);
        if (name && name !== category.name) {
            onSaveCategory({ ...category, name });
        }
    };

    return (
        <div className="category-manager">
            <div className="category-manager-header">
                <h3>Categories</h3>
                <button onClick={handleAdd} className="btn-add-category">+</button>
            </div>
            <ul className="category-list">
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
                        <span className="category-name">{cat.name}</span>
                        <div className="category-actions">
                            <button onClick={(e) => { e.stopPropagation(); handleEdit(cat); }} className="btn-cat-edit">✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); onDeleteCategory(cat.id); }} className="btn-cat-delete">🗑️</button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CategoryManager;