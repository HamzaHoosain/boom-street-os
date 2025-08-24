// frontend/src/components/employees/IssueAdvanceForm.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const IssueAdvanceForm = ({ employee, onSave, onClose }) => {
    const [amount, setAmount] = useState('');
    const [safeId, setSafeId] = useState('');
    const [notes, setNotes] = useState('Staff Advance');
    const [safes, setSafes] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/cash/safes').then(res => {
            // It's good practice to only allow advances from physical cash tills
            setSafes(res.data.filter(s => s.is_physical_cash));
        }).catch(err => console.error("Could not load safes", err));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!amount || amount <= 0 || !safeId) {
            setError("Please enter a valid amount and select a source of funds.");
            return;
        }

        try {
            const loanData = {
                employee_id: employee.id,
                principal_amount: parseFloat(amount),
                safe_id: parseInt(safeId),
                notes
            };
            await onSave(loanData);
        } catch (err) {
            setError(err.response?.data?.msg || 'Failed to issue advance. The selected safe may have insufficient funds.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>Source of Funds</label>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Till/Float --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Advance Amount (R)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required autoFocus />
            </div>
            <div className="form-group">
                <label>Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="form-control" />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Issue Advance</button>
        </form>
    );
};

export default IssueAdvanceForm;