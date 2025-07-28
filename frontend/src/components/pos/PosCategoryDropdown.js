// frontend/src/components/pos/PosCategoryDropdown.js

import React, { useState, useEffect, useRef } from 'react';
import './Pos.css';

const PosCategoryDropdown = ({ categories, selectedCategoryId, onSelectCategory, customerHasFavourites }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleSelect = (categoryId) => {
        onSelectCategory(categoryId);
        setIsOpen(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    let selectedCategoryName = 'All Categories';
    if (selectedCategoryId === 'favourites') {
        selectedCategoryName = '⭐ Favourites';
    } else {
        selectedCategoryName = categories.find(c => c.id === selectedCategoryId)?.name || 'All Categories';
    }

    return (
        <div className="pos-category-dropdown-wrapper" ref={dropdownRef}>
            <button className="dropdown-toggle" onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedCategoryName}</span>
                <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
            </button>
            {isOpen && (
                <div className="dropdown-menu">
                    {customerHasFavourites && <div className="dropdown-item favourite" onClick={() => handleSelect('favourites')}>⭐ Favourites</div>}
                    <div className="dropdown-item" onClick={() => handleSelect(null)}>All Categories</div>
                    {categories.map(cat => (
                        <div key={cat.id} className="dropdown-item" onClick={() => handleSelect(cat.id)}>
                            {cat.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PosCategoryDropdown;