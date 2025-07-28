// frontend/src/components/inventory/CategoryDropdown.js

import React, { useState, useEffect, useRef } from 'react';
import './Inventory.css';

const CategoryDropdown = ({ categories, selectedCategoryId, onSelectCategory, onSaveCategory, onDeleteCategory }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAdd = (e) => {
        e.stopPropagation();
        const name = prompt("Enter new category name:");
        if (name) onSaveCategory({ name });
    };

    const handleEdit = (e, category) => {
        e.stopPropagation();
        const name = prompt("Enter new name:", category.name);
        if (name && name !== category.name) onSaveCategory({ ...category, name });
    };

    const handleDelete = (e, categoryId) => {
        e.stopPropagation();
        onDeleteCategory(categoryId);
    };

    const handleSelect = (categoryId) => {
        onSelectCategory(categoryId);
        setIsOpen(false);
    };
    
    const selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'All Products';

    return (
        <div className="category-dropdown-container" ref={dropdownRef}>
            <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedCategoryName}</span>
                <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
            </button>
            {isOpen && (
                <div className="dropdown-menu">
                    <div className="dropdown-item" onClick={() => handleSelect(null)}>
                        All Products
                    </div>
                    {categories.map(cat => (
                        <div key={cat.id} className="dropdown-item" onClick={() => handleSelect(cat.id)}>
                            <span className="item-name">{cat.name}</span>
                            <div className="item-actions">
                                <button onClick={(e) => handleEdit(e, cat)}>✏️</button>
                                <button onClick={(e) => handleDelete(e, cat.id)}>🗑️</button>
                            </div>
                        </div>
                    ))}
                    <div className="dropdown-divider"></div>
                    <div className="dropdown-item action-item" onClick={handleAdd}>
                        + Add New Category
                    </div>
                </div>
            )}
        </div>
    );
};

export default CategoryDropdown;