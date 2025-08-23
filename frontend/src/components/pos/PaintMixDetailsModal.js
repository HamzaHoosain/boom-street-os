// frontend/src/components/pos/PaintMixDetailsModal.js
import React, { useState } from 'react';
// Import a new CSS file we will create
import './PaintMixDetailsModal.css';

const PaintMixDetailsModal = ({ onSave, onClose, initialDetails = {} }) => {
    const [details, setDetails] = useState({
        paint_type: initialDetails.paint_type || '',
        quantity: initialDetails.quantity || '1',
        brand: initialDetails.brand || '',
        color_code: initialDetails.color_code || '',
    });

    const handleChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleConfirm = () => {
        if (!details.paint_type || !details.quantity || parseFloat(details.quantity) <= 0) {
            alert("Please select a Paint Type and enter a valid Quantity.");
            return;
        }
        onSave(details);
    };

    return (
        <div className="paint-mix-modal-content">
            <h4>Enter Paint Mix Details</h4>
            <div className="form-group">
                <label>Paint Type*</label>
                <select name="paint_type" value={details.paint_type} onChange={handleChange} className="form-control" required autoFocus>
                    <option value="" disabled>-- Select --</option>
                    <option value="2K">2K</option>
                    <option value="Basecoat">Basecoat</option>
                    <option value="QD Enamel">QD Enamel</option>
                    <option value="Road Marking">Road Marking</option>
                </select>
            </div>
            <div className="form-group">
                <label>Quantity (Liters)*</label>
                <input name="quantity" type="number" step="0.01" value={details.quantity} onChange={handleChange} className="form-control" required />
            </div>

            <hr className="modal-divider" />
            
            <h4>Advanced Options (For Mixer)</h4>
            <div className="form-group">
                <label>Brand of Toner (Optional)</label>
                <input name="brand" value={details.brand} onChange={handleChange} placeholder="e.g., Luxor, Carvello" className="form-control" />
            </div>
            <div className="form-group">
                <label>Color Code or Name (Optional)</label>
                <input name="color_code" value={details.color_code} onChange={handleChange} placeholder="e.g., Toyota 1C0" className="form-control" />
            </div>

            <div className="modal-actions">
                <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
                <button onClick={handleConfirm} className="btn-login">Confirm Details</button>
            </div>
        </div>
    );
};

export default PaintMixDetailsModal;