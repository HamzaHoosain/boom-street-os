// frontend/src/pages/StockTakePage.js

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './StockTakePage.css'; // We'll create this file next

const StockTakePage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [countedItems, setCountedItems] = useState({});
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (selectedBusiness?.business_unit_id) {
            setLoading(true);
            // Fetch products sorted alphabetically for easy finding
            api.get(`/products/alpha/${selectedBusiness.business_unit_id}`)
                .then(res => {
                    setProducts(res.data);
                })
                .catch(err => setError("Failed to load products."))
                .finally(() => setLoading(false));
        }
    }, [selectedBusiness]);

    const handleCountChange = (productId, count) => {
        setCountedItems(prev => ({ ...prev, [productId]: count }));
    };
    
    const handleProcessStockTake = async () => {
        if (Object.keys(countedItems).length === 0) {
            setError("You haven't counted any items.");
            return;
        }
        
        setError('');
        setSuccess('');
        setSubmitting(true);
        
        const itemsToSubmit = Object.entries(countedItems).map(([product_id, counted_qty]) => ({
            product_id: parseInt(product_id),
            counted_qty: parseFloat(counted_qty) || 0
        }));

        try {
            const payload = {
                business_unit_id: selectedBusiness.business_unit_id,
                notes,
                items: itemsToSubmit
            };
            const res = await api.post('/stocktakes', payload);
            setSuccess(`Stock take #${res.data.stockTakeId} processed! Total variance value: R${res.data.variance.toFixed(2)}`);
            setCountedItems({});
            setNotes('');
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to process stock take.");
        } finally {
            setSubmitting(false);
        }
    };
    
    const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!selectedBusiness) return <div><h1>Stock Take</h1><p>Please select a business unit.</p></div>;

    return (
        <div>
            <h1>Stock Take for {selectedBusiness.business_unit_name}</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}
            
            <div className="stock-take-controls">
                <input
                    type="text"
                    placeholder="Search for products to count..."
                    className="form-control"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <textarea
                    placeholder="Add optional notes (e.g., 'Aisle 5 monthly count')"
                    className="form-control"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows="2"
                />
            </div>

            <div className="stock-take-list">
                {loading ? <p>Loading products...</p> : filteredProducts.map(product => {
                    const variance = countedItems[product.id] !== undefined ? parseFloat(countedItems[product.id]) - product.quantity_on_hand : null;
                    return (
                        <div className="stock-item-card" key={product.id}>
                            <div className="item-info">
                                <span className="item-name">{product.name}</span>
                                <span className="item-sku">SKU: {product.sku || 'N/A'}</span>
                            </div>
                            <div className="item-counts">
                                <div className="count-box system-qty">
                                    <label>System</label>
                                    <span>{product.quantity_on_hand}</span>
                                </div>
                                <div className="count-box">
                                    <label>Counted</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="count-input"
                                        value={countedItems[product.id] || ''}
                                        onChange={(e) => handleCountChange(product.id, e.target.value)}
                                    />
                                </div>
                                {variance !== null && (
                                    <div className={`count-box variance ${variance > 0 ? 'positive' : variance < 0 ? 'negative' : ''}`}>
                                        <label>Variance</label>
                                        <span>{variance.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="stock-take-footer">
                <button 
                    onClick={handleProcessStockTake} 
                    className="btn-login"
                    disabled={submitting || Object.keys(countedItems).length === 0}
                >
                    {submitting ? 'Processing...' : 'Finalize & Process Stock Take'}
                </button>
            </div>
        </div>
    );
};

export default StockTakePage;