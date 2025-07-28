// frontend/src/components/inventory/ProductFormModal.js

import React from 'react';
import Modal from '../layout/Modal';
import './ProductFormModal.css';

// MODIFIED: Added `categories` and `preselectedCategoryId` props
const ProductFormModal = ({ show, onClose, onSave, product, categories, preselectedCategoryId }) => {
    const [formData, setFormData] = React.useState({
        name: '',
        sku: '',
        category_id: '', // CHANGED from unit_type
        selling_price: '',
        cost_price: '',
        quantity_on_hand: 0,
    });

    React.useEffect(() => {
        if (product) { // Editing existing product
            setFormData({
                name: product.name || '',
                sku: product.sku || '',
                category_id: product.category_id || '', // Use category_id
                selling_price: product.selling_price || '',
                cost_price: product.cost_price || '',
                quantity_on_hand: product.quantity_on_hand || 0,
            });
        } else { // Adding new product
            setFormData({
                name: '', sku: '', 
                // Pre-fill category if one was selected, otherwise default to empty
                category_id: preselectedCategoryId || '', 
                selling_price: '', cost_price: '', quantity_on_hand: 0,
            });
        }
    }, [product, show, preselectedCategoryId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <Modal show={show} onClose={onClose} title={product ? 'Edit Product' : 'Add New Product'}>
            <form onSubmit={handleSubmit} className="product-form">
                <div className="form-group">
                    <label>Product Name</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-control" required />
                </div>
                <div className="form-group">
                    <label>Product Category</label>
                    {/* CHANGED: Text input is now a dropdown select */}
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