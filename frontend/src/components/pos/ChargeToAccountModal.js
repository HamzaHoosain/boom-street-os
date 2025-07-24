// frontend/src/components/pos/ChargeToAccountModal.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './ChargeToAccountModal.css'; // Assuming you have some styles for this modal
import api from '../../services/api';

const ChargeToAccountModal = ({ onCharge, onClose }) => {
    const [businesses, setBusinesses] = useState([]);
    const [selectedUnitId, setSelectedUnitId] = useState('');
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        // Fetch a list of all business units to populate the dropdown
        const fetchBusinesses = async () => {
            try {
                // We need a new backend endpoint for this
                const response = await api.get('/business-units');
                // Filter out the current business, as you can't charge to yourself
                const otherBusinesses = response.data.filter(b => b.id !== selectedBusiness.business_unit_id);
                setBusinesses(otherBusinesses);
            } catch (error) {
                console.error("Failed to fetch business units", error);
            }
        };
        fetchBusinesses();
    }, [selectedBusiness]);

    const handleConfirm = () => {
        if (selectedUnitId) {
            onCharge(parseInt(selectedUnitId));
        }
    };

    return (
        <div>
            <div className="form-group">
                <label>Select Business Unit to Charge</label>
                <select value={selectedUnitId} onChange={e => setSelectedUnitId(e.target.value)} className="form-control" required>
                    <option value="">-- Select a Business --</option>
                    {businesses.map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                </select>
            </div>
            <div style={{display: 'flex', gap: '1rem', marginTop: '1.5rem'}}>
                <button onClick={onClose} className="btn-close-modal" style={{width: '100%', margin: 0}}>Cancel</button>
                <button onClick={handleConfirm} className="btn-login" style={{width: '100%', margin: 0}} disabled={!selectedUnitId}>
                    Confirm Charge
                </button>
            </div>
        </div>
    );
};

export default ChargeToAccountModal;