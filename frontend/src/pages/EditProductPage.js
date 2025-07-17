// frontend/src/pages/EditProductPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

const EditProductPage = () => {
    const { productId } = useParams(); // Gets the product ID from the URL
    const navigate = useNavigate(); // To redirect after saving

    const [product, setProduct] = useState(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch both the product details and the full supplier list at the same time
                const [productResponse, suppliersResponse] = await Promise.all([
                    api.get(`/products/single/${productId}`), // We need to create this new backend route
                    api.get('/suppliers')
                ]);
                
                setProduct(productResponse.data);
                setSuppliers(suppliersResponse.data);
            } catch (err) {
                setError('Failed to fetch data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [productId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProduct({ ...product, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.put(`/products/${product.id}`, product);
            setSuccess('Product updated successfully!');
            // Redirect back to the inventory list after a short delay
            setTimeout(() => navigate('/inventory'), 1500);
        } catch (err) {
            setError('Failed to update product.');
            console.error(err);
        }
    };

    if (loading) return <p>Loading product details...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (!product) return <p>Product not found.</p>;

    return (
        <div>
            <h1>Edit Product: {product.name}</h1>
            {success && <p className="alert-success">{success}</p>}
            <form onSubmit={handleSubmit} className="edit-product-form">
                <div className="form-group">
                    <label>SKU</label>
                    <input name="sku" value={product.sku || ''} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Product Name</label>
                    <input name="name" value={product.name || ''} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Cost Price (Excl.)</label>
                    <input type="number" name="cost_price" value={product.cost_price || ''} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Selling Price</label>
                    <input type="number" name="selling_price" value={product.selling_price || ''} onChange={handleInputChange} className="form-control" />
                </div>
                <div className="form-group">
                    <label>Supplier</label>
                    <select name="supplier_id" value={product.supplier_id || ''} onChange={handleInputChange} className="form-control">
                        <option value="">-- Select a Supplier --</option>
                        {suppliers.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <button type="submit" className="btn-login" style={{ marginTop: '1rem' }}>Save Changes</button>
            </form>
        </div>
    );
};

export default EditProductPage;