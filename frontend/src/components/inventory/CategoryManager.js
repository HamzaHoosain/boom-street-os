// frontend/src/components/inventory/CategoryManager.js

import React, { useState } from 'react';
import './Inventory.css';

const CategoryManager = ({ categories, selectedCategoryId, onSelectCategory, onSaveCategory, onDeleteCategory }) => {
    const [editingCategoryId, setEditingCategoryId] = useState(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleStartEdit = (category) => {
        setEditingCategoryId(category.id);
        setNewCategoryName(category.name);
    };

    const handleSave = () => {
        if (!newCategoryName.trim()) return; // Prevent saving empty names
        onSaveCategory({ id: editingCategoryId, name: newCategoryName });
        setEditingCategoryId(null);
        setNewCategoryName('');
    };
    
    const handleSaveNew = () => {
        if (!newCategoryName.trim()) return;
        onSaveCategory({ name: newCategoryName });
        setIsAdding(false);
        setNewCategoryName('');
    };

    const handleCancel = () => {
        setEditingCategoryId(null);
        setIsAdding(false);
        setNewCategoryName('');
    };

    return (
        <div className="category-manager">
            <div className="category-manager-header">
                <h3>Categories</h3>
                <button onClick={() => setIsAdding(true)} className="btn-add-category" title="Add New Category">+</button>
            </div>
            <ul className="category-list">
                <li className={!selectedCategoryId ? 'selected' : ''} onClick={() => onSelectCategory(null)}>
                    All Products
                </li>
                {categories.map(cat => (
                    <li key={cat.id} className={selectedCategoryId === cat.id ? 'selected' : ''}>
                        {editingCategoryId === cat.id ? (
                            <div className="inline-edit-form">
                                <input 
                                    type="text" 
                                    value={newCategoryName} 
                                    onChange={(e) => setNewCategoryName(e.target.value)} 
                                    autoFocus 
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                />
                                <button onClick={handleSave}>✔️</button>
                                <button onClick={handleCancel}>❌</button>
                            </div>
                        ) : (
                            <>
                                <span className="category-name" onClick={() => onSelectCategory(cat.id)}>{cat.name}</span>
                                <div className="category-actions">
                                    <button onClick={() => handleStartEdit(cat)} title="Edit">✏️</button>
                                    <button onClick={() => onDeleteCategory(cat.id)} title="Delete">🗑️</button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
                {isAdding && (
                    <li className="inline-edit-form">
                         <input 
                            type="text" 
                            value={newCategoryName} 
                            placeholder="New category name..."
                            onChange={(e) => setNewCategoryName(e.target.value)} 
                            autoFocus 
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveNew()}
                        />
                        <button onClick={handleSaveNew}>✔️</button>
                        <button onClick={handleCancel}>❌</button>
                    </li>
                )}
            </ul>
        </div>
    );
};

export default CategoryManager;