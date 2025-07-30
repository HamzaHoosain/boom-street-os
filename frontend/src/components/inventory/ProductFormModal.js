// frontend/src/components/inventory/ProductFormModal.js

import React, { useState, useEffect } from 'react'; // Corrected import
import Modal from '../layout/Modal';
import './ProductFormModal.css';

const ProductFormModal = ({ show, onClose, onSave, product, categories, preselectedCategoryId }) => {
    // --- THIS IS THE CRITICAL FIX ---
    // The initial state of the form now includes `unit_type`.
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        category_id: '',
        selling_price: '',
        cost_price: '',
        quantity_on_hand: 0,
        unit_type: 'each' // We provide a default value that will always be sent
    });

    useEffect(() => {
        if (show) { // Reset form state every time the modal is opened
            if (product) { // Editing existing product
                setFormData({
                    name: product.name || '',
                    sku: product.sku || '',
                    category_id: product.category_id || '',
                    selling_price: product.selling_price || '',
                    cost_price: product.cost_price || '',
                    quantity_on_hand: product.quantity_on_hand || 0,
                    unit_type: product.unit_type || 'each' // Use existing unit_type or default
                });
            } else { // Adding new product
                setFormData({
                    name: '', sku: '', 
                    category_id: preselectedCategoryId || '', 
                    selling_price: '', cost_price: '', quantity_on_hand: 0,
                    unit_type: 'each' // Set default for new products
                });
            }
        }
    }, [product, show, preselectedCategoryId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // The `formData` object now correctly includes `unit_type` when it's passed to onSave
        onSave(formData); 
    };

    return (
        <Modal show={show} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'}>
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" required autoFocus />
                </div>
                <div className="form-group">
                    <label>Product Category</label>
                    <select name="category_id" value={formData.category_id} onChange={handleChange} className="form-control" required>
                        <option value="">-- Select a Category --</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="form-group">
                    <label>SKU (Optional)</label>
                    <input type="text" name="sku" value={formData.sku} onChange={handleChange} className="form-control" />
                </div>
                <div className="form-group-row">
                    <div className="form-group">
                        <label>Selling Price (R)</label>
                        <input type="number" step="0.01" name="selling_price" value={formData.selling_price} onChange={handleChange} className="form-control" required />
                    </div>
                    <div className="form-group">
                        <label>Cost Price (R)</label>
                        <input type="number" step="0.01" name="cost_price" value={formData.cost_price} onChange={handleChange} className="form-control" required />
                    </div>
                </div>
                <div className="form-group">
                    <label>Initial Quantity on Hand</label>
                    <input type="number" name="quantity_on_hand" value={formData.quantity_on_hand} onChange={handleChange} className="form-control" disabled={!!product} />
                    {!!product && <small>Quantity can only be adjusted via Stock Takes or Purchases.</small>}
                </div>
                <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn-save">Save Product</button>
                </div>
            </form>
        </Modal>
    );
};

export default ProductFormModal;