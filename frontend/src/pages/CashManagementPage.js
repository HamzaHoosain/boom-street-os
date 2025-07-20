// frontend/src/pages/CashManagementPage.js - FINAL VERIFIED VERSION
import React, { useState, useEffect, useContext } from 'react'; // Corrected import
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import './DashboardPage.css'; // Reuse widget styles

const CashTransferForm = ({ safes, onSave, onClose }) => {
    const [fromSafeId, setFromSafeId] = useState('');
    const [toSafeId, setToSafeId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');
    const { selectedBusiness } = useContext(AuthContext); // Correct context usage

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (fromSafeId === toSafeId) {
            setError("Cannot transfer cash to and from the same safe.");
            return;
        }

        const transferData = {
            from_safe_id: parseInt(fromSafeId),
            to_safe_id: parseInt(toSafeId),
            amount: parseFloat(amount),
            notes,
            business_unit_id: selectedBusiness?.business_unit_id || 6
        };

        try {
            await onSave(transferData);
        } catch (err) {
            setError('Failed to save transfer.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>From Safe</label>
                <select value={fromSafeId} onChange={e => setFromSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Source --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name} (R {parseFloat(s.current_balance).toFixed(2)})</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>To Safe</label>
                <select value={toSafeId} onChange={e => setToSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Destination --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Amount (R)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Notes / Reason</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Process Transfer</button>
        </form>
    );
};


const CashManagementPage = () => {
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [error, setError] = useState('');

    const fetchSafes = async () => {
        setLoading(true);
        try {
            const response = await api.get('/cash/safes');
            setSafes(response.data);
        } catch (error) {
            console.error("Failed to fetch safes", error);
            setError("Could not load cash safe data.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSafes();
    }, []);

    const handleSaveTransfer = async (transferData) => {
        try {
            await api.post('/cash/transfer', transferData);
            setShowModal(false);
            fetchSafes();
        } catch (error) {
            alert('Failed to process transfer. Check details.');
            console.error(error);
            throw error;
        }
    };

    if (loading) return <p>Loading cash safes...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div>
            <h1>Cash Management</h1>
            <p>Overview of all cash locations in the company.</p>
            <div style={{ marginBottom: '1rem', marginTop: '1rem' }}>
                <button onClick={() => setShowModal(true)} className="btn-login" style={{maxWidth: '250px'}}>
                    Move Cash Between Safes
                </button>
            </div>

            <Modal show={showModal} onClose={() => setShowModal(false)} title="Cash Transfer">
                <CashTransferForm 
                    safes={safes} 
                    onSave={handleSaveTransfer} 
                    onClose={() => setShowModal(false)} 
                />
            </Modal>
            
            <div className="widget-grid">
                {safes.map(safe => (
                    <div className="widget" key={safe.id}>
                        <h3>{safe.name}</h3>
                        <p className="widget-value">R {parseFloat(safe.current_balance).toFixed(2)}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CashManagementPage;