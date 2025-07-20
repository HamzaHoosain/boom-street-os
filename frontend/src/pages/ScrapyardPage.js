import React, { useState, useEffect } from 'react';
import api from '../services/api';
import './ScrapyardPage.css';

const ScrapyardPage = () => {
    const [materials, setMaterials] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // State for the "Sell Scrap" Form
    const [sellMaterialId, setSellMaterialId] = useState('');
    const [sellWeight, setSellWeight] = useState('');
    const [sellRevenue, setSellRevenue] = useState('');
    const [buyer, setBuyer] = useState(''); // New field for the buyer's name

    const fetchMaterials = async () => {
        try {
            // Always fetch materials for Paradise Scrap (business_unit_id: 2)
            const response = await api.get('/products/2');
            setMaterials(response.data);
        } catch (err) {
            setError('Failed to load scrap materials.');
            console.error(err);
        }
    };

    // Fetch the materials when the component first loads
    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        // Client-side validation to check for available stock
        const selectedMaterial = materials.find(m => m.id === parseInt(sellMaterialId));
        if (parseFloat(sellWeight) > parseFloat(selectedMaterial.quantity_on_hand)) {
            setError(`Not enough stock. Only ${selectedMaterial.quantity_on_hand} kg of ${selectedMaterial.name} available.`);
            return;
        }

        try {
            await api.post('/scrapyard/sell', {
                business_unit_id: 2, // Hardcoded to Paradise Scrap
                product_id: parseInt(sellMaterialId),
                weight_kg: parseFloat(sellWeight),
                revenue_amount: parseFloat(sellRevenue)
                // In a future step, we can enhance the backend to save the 'buyer' name.
            });
            setSuccess(`Successfully sold ${sellWeight}kg of ${selectedMaterial.name} to ${buyer} for R ${sellRevenue}.`);
            
            // Reset the form fields for the next entry
            setSellMaterialId('');
            setSellWeight('');
            setSellRevenue('');
            setBuyer('');

            // Re-fetch materials to update the stock levels shown in the dropdown
            fetchMaterials();

        } catch (err) {
            setError('Failed to process sale. Please check the details and try again.');
            console.error(err);
        }
    };

    return (
        <div>
            <h1>Bulk Scrap Sales Terminal</h1>
            {error && <p className="alert-error" style={{marginTop: '1rem'}}>{error}</p>}
            {success && <p className="alert-success" style={{marginTop: '1rem'}}>{success}</p>}

            <div className="scrapyard-layout-single">
                <div className="form-container">
                    <h2>Sell Scrap to Processors</h2>
                    <form onSubmit={handleSellSubmit}>
                        <div className="form-group">
                            <label>Buyer (e.g., RECLAM, Wayne's Scrap)</label>
                            <input 
                                type="text" 
                                value={buyer} 
                                onChange={(e) => setBuyer(e.target.value)} 
                                className="form-control" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Material (Current Stock Available)</label>
                            <select 
                                value={sellMaterialId} 
                                onChange={(e) => setSellMaterialId(e.target.value)} 
                                className="form-control" 
                                required
                            >
                                <option value="">-- Select Material --</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.name} ({parseFloat(m.quantity_on_hand).toFixed(2)} kg available)
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weight to Sell (kg)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={sellWeight} 
                                onChange={(e) => setSellWeight(e.target.value)} 
                                className="form-control" 
                                required 
                            />
                        </div>
                        <div className="form-group">
                            <label>Total Revenue Received (R)</label>
                            <input 
                                type="number" 
                                step="0.01" 
                                value={sellRevenue} 
                                onChange={(e) => setSellRevenue(e.target.value)} 
                                className="form-control" 
                                required 
                            />
                        </div>
                        <button type="submit" className="btn-sell">Process Bulk Sale</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ScrapyardPage;