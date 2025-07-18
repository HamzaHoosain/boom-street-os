// frontend/src/pages/ScrapyardPage.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './ScrapyardPage.css';

const ScrapyardPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [materials, setMaterials] = useState([]); // List of scrap materials we buy/sell
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // --- State for the "Buy Scrap" Form ---
    const [buyMaterialId, setBuyMaterialId] = useState('');
    const [buyWeight, setBuyWeight] = useState('');

    // --- State for the "Sell Scrap" Form ---
    const [sellMaterialId, setSellMaterialId] = useState('');
    const [sellWeight, setSellWeight] = useState('');
    const [sellRevenue, setSellRevenue] = useState('');


    useEffect(() => {
        // Fetch the list of scrap materials for the dropdowns
        const fetchMaterials = async () => {
            // Paradise Scrap is business_unit_id 2
            try {
                const response = await api.get('/products/2');
                setMaterials(response.data);
            } catch (err) {
                setError('Failed to load scrap materials.');
            }
        };
        fetchMaterials();
    }, []);

    const handleBuySubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const selectedMaterial = materials.find(m => m.id === parseInt(buyMaterialId));
        const payout = (selectedMaterial.cost_price * parseFloat(buyWeight)).toFixed(2);
        
        // Confirmation prompt
        if (!window.confirm(`Payout will be R${payout}. Proceed?`)) {
            return;
        }

        try {
            await api.post('/scrapyard/buy', {
                business_unit_id: 2,
                product_id: parseInt(buyMaterialId),
                weight_kg: parseFloat(buyWeight)
            });
            setSuccess(`Successfully bought ${buyWeight}kg of ${selectedMaterial.name}. Payout: R${payout}`);
            // Reset form
            setBuyMaterialId('');
            setBuyWeight('');
        } catch (err) {
            setError('Failed to process purchase.');
        }
    };

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const selectedMaterial = materials.find(m => m.id === parseInt(sellMaterialId));
            await api.post('/scrapyard/sell', {
                business_unit_id: 2,
                product_id: parseInt(sellMaterialId),
                weight_kg: parseFloat(sellWeight),
                revenue_amount: parseFloat(sellRevenue)
            });
            setSuccess(`Successfully sold ${sellWeight}kg of ${selectedMaterial.name} for R${sellRevenue}.`);
            // Reset form
            setSellMaterialId('');
            setSellWeight('');
            setSellRevenue('');
        } catch (err) {
            setError('Failed to process sale.');
        }
    };

    return (
        <div>
            <h1>Scrapyard Operations</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && <p className="alert-success">{success}</p>}

            <div className="scrapyard-layout">
                {/* --- BUY SCRAP FORM --- */}
                <div className="form-container">
                    <h2>Buy Scrap</h2>
                    <form onSubmit={handleBuySubmit}>
                        <div className="form-group">
                            <label>Material</label>
                            <select value={buyMaterialId} onChange={(e) => setBuyMaterialId(e.target.value)} className="form-control" required>
                                <option value="">-- Select Material --</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name} (R{m.cost_price}/kg)</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weight (kg)</label>
                            <input type="number" step="0.01" value={buyWeight} onChange={(e) => setBuyWeight(e.target.value)} className="form-control" required />
                        </div>
                        <button type="submit" className="btn-buy">Process Purchase</button>
                    </form>
                </div>

                {/* --- SELL SCRAP FORM --- */}
                <div className="form-container">
                    <h2>Sell Scrap</h2>
                    <form onSubmit={handleSellSubmit}>
                        <div className="form-group">
                            <label>Material</label>
                            <select value={sellMaterialId} onChange={(e) => setSellMaterialId(e.target.value)} className="form-control" required>
                                <option value="">-- Select Material --</option>
                                {materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weight (kg)</label>
                            <input type="number" step="0.01" value={sellWeight} onChange={(e) => setSellWeight(e.target.value)} className="form-control" required />
                        </div>
                        <div className="form-group">
                            <label>Total Revenue (R)</label>
                            <input type="number" step="0.01" value={sellRevenue} onChange={(e) => setSellRevenue(e.target.value)} className="form-control" required />
                        </div>
                        <button type="submit" className="btn-sell">Process Sale</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ScrapyardPage;