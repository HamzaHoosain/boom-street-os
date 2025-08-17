// frontend/src/components/pos/PaintMixingInterface.js

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import './PaintMixingInterface.css'; // New CSS file needed

const PaintMixingInterface = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [mixableProducts, setMixableProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [recipe, setRecipe] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch products that can be mixed (assuming they have recipes)
    useEffect(() => {
        const fetchMixableProducts = async () => {
            // NOTE: Needs a backend endpoint to get only products with recipes
            // For now, we'll fetch all and filter on frontend (inefficient, but works for demo)
            const res = await api.get(`/products/${selectedBusiness.business_unit_id}`);
            // A better way would be `api.get('/products/mixable')`
            setMixableProducts(res.data); 
        };
        if(selectedBusiness) fetchMixableProducts();
    }, [selectedBusiness]);
    
    // Fetch recipe when a product is selected
    useEffect(() => {
        if (selectedProduct) {
            api.get(`/recipes/${selectedProduct.id}`).then(res => {
                setRecipe(res.data);
            });
        } else {
            setRecipe([]);
        }
    }, [selectedProduct]);

    const handleExecuteMix = async () => {
        if (!selectedProduct || !quantity) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/mixing/execute', {
                finishedGoodId: selectedProduct.id,
                quantityToMix: quantity,
                business_unit_id: selectedBusiness.business_unit_id
            });
            setSuccess(`Successfully mixed ${quantity}L of ${selectedProduct.name}! Stock has been updated.`);
        } catch (err) {
            setError(err.response?.data?.msg || 'An error occurred during the mix.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="mixing-interface-container">
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}

            <div className="mixing-grid">
                <div className="mixing-panel selection-panel">
                    <h3>1. Select Paint to Mix</h3>
                    <select 
                        onChange={(e) => setSelectedProduct(mixableProducts.find(p => p.id === parseInt(e.target.value)))} 
                        className="form-control"
                        defaultValue=""
                    >
                        <option value="" disabled>-- Choose a Paint Formula --</option>
                        {mixableProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {selectedProduct && (
                        <>
                            <h3>2. Enter Quantity to Mix</h3>
                             <input 
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="form-control"
                                placeholder="e.g., 1.5 for 1.5 Liters"
                             />
                        </>
                    )}
                </div>
                <div className="mixing-panel recipe-panel">
                     <h3>Recipe Details</h3>
                    {selectedProduct ? (
                        <>
                            <h4>Ingredients for {quantity}L of {selectedProduct.name}:</h4>
                            <ul className="recipe-list">
                                {recipe.map(ing => {
                                    const needed = (ing.quantity_required * quantity).toFixed(4);
                                    const hasStock = parseFloat(ing.quantity_on_hand) >= needed;
                                    return (
                                        <li key={ing.ingredient_id} className={!hasStock ? 'no-stock' : ''}>
                                            <span>{ing.ingredient_name}</span>
                                            <span><strong>{needed}</strong> (On Hand: {ing.quantity_on_hand})</span>
                                        </li>
                                    );
                                })}
                            </ul>
                            <button 
                                onClick={handleExecuteMix} 
                                className="btn-mix"
                                disabled={loading || recipe.some(ing => parseFloat(ing.quantity_on_hand) < (ing.quantity_required * quantity))}
                            >
                                {loading ? 'Mixing...' : 'Confirm & Mix Paint'}
                            </button>
                        </>
                    ) : (
                        <p>Please select a paint formula to see its recipe.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
export default PaintMixingInterface;