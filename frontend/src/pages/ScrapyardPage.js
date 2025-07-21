import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './ScrapyardPage.css';

const ScrapyardPage = () => {
    const [materials, setMaterials] = useState([]);
    const [buyers, setBuyers] = useState([]); // New state for bulk buyers
    const [safes, setSafes] = useState([]); // New state for cash safes (bank accounts)
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { selectedBusiness } = useContext(AuthContext);

    // Form State
    const [sellMaterialId, setSellMaterialId] = useState('');
    const [sellWeight, setSellWeight] = useState('');
    const [sellRevenue, setSellRevenue] = useState('');
    const [buyerId, setBuyerId] = useState(''); // Changed from buyer name to buyer ID
    const [safeId, setSafeId] = useState(''); // New state for destination safe
    const [invoiceNumber, setInvoiceNumber] = useState(''); // New state for invoice number

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch all necessary data in parallel
            const [materialsRes, buyersRes, safesRes] = await Promise.all([
                api.get('/products/2'), // Materials from Paradise Scrap
                api.get('/scrapyard/buyers'), // The new list of bulk buyers
                api.get('/cash/safes') // The list of all safes
            ]);
            setMaterials(materialsRes.data);
            setBuyers(buyersRes.data);
            // Filter for non-physical safes, which represent bank accounts
            setSafes(safesRes.data.filter(s => !s.is_physical_cash));

        } catch (err) {
            setError('Failed to load initial data for the terminal.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (selectedBusiness?.type === 'Bulk Inventory') {
            fetchData();
        }
    }, [selectedBusiness]);

    const handleSellSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const saleData = {
            business_unit_id: 2,
            product_id: parseInt(sellMaterialId),
            weight_kg: parseFloat(sellWeight),
            revenue_amount: parseFloat(sellRevenue),
            buyer_id: parseInt(buyerId),
            safe_id: parseInt(safeId),
            invoice_number: invoiceNumber
        };

        try {
            await api.post('/scrapyard/sell', saleData);
            const selectedMaterial = materials.find(m => m.id === saleData.product_id);
            const selectedBuyer = buyers.find(b => b.id === saleData.buyer_id);
            setSuccess(`Successfully sold ${sellWeight}kg of ${selectedMaterial.name} to ${selectedBuyer.name}.`);
            
            // Reset form
            setSellMaterialId(''); setSellWeight(''); setSellRevenue('');
            setBuyerId(''); setSafeId(''); setInvoiceNumber('');
            
            // Re-fetch materials to update stock levels
            fetchData();

        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to process sale. Please try again.');
            console.error(err);
        }
    };
    
    if (selectedBusiness?.type !== 'Bulk Inventory') {
        return (
            <div>
                <h1>Bulk Scrap Sales</h1>
                <p>This feature is only available for a Bulk Inventory business unit. Please switch using the header.</p>
            </div>
        )
    }
    
    if (loading) return <p>Loading Scrapyard Terminal...</p>;
    
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
                            <label>Invoice / Reference #</label>
                            <input type="text" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="form-control" />
                        </div>
                        <div className="form-group">
                            <label>Buyer</label>
                            <select value={buyerId} onChange={(e) => setBuyerId(e.target.value)} className="form-control" required>
                                <option value="">-- Select Buyer --</option>
                                {buyers.map(b => (<option key={b.id} value={b.id}>{b.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Material</label>
                            <select value={sellMaterialId} onChange={(e) => setSellMaterialId(e.target.value)} className="form-control" required>
                                <option value="">-- Select Material --</option>
                                {materials.map(m => (<option key={m.id} value={m.id}>{m.name}</option>))}
                            </select>
                        </div>
                         <div className="form-group">
                            <label>Deposit To</label>
                            <select value={safeId} onChange={(e) => setSafeId(e.target.value)} className="form-control" required>
                                <option value="">-- Select Bank Account --</option>
                                {safes.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Weight to Sell (kg)</label>
                            <input type="number" step="0.01" value={sellWeight} onChange={(e) => setSellWeight(e.target.value)} className="form-control" required />
                        </div>
                        <div className="form-group">
                            <label>Total Revenue Received (R)</label>
                            <input type="number" step="0.01" value={sellRevenue} onChange={(e) => setSellRevenue(e.target.value)} className="form-control" required />
                        </div>
                        <button type="submit" className="btn-sell">Process Bulk Sale</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ScrapyardPage;