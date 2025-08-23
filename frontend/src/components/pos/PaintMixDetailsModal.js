// frontend/src/components/pos/PaintMixDetailsModal.js

import React, { useState, useEffect } from 'react';
import './PaintMixDetailsModal.css';

const PaintMixDetailsModal = ({ onSave, onClose, initialDetails = {}, initialPrice }) => {
    const [details, setDetails] = useState({
        paint_type: initialDetails.paint_type || '',
        quantity: initialDetails.quantity || '1',
        brand: initialDetails.brand || '',
        color_code: initialDetails.color_code || '',
    });

    // NEW: State for the total price input
    const [totalPrice, setTotalPrice] = useState(initialPrice ? initialPrice.toFixed(2) : '');

    const handleChange = (e) => {
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleConfirm = () => {
        if (!details.paint_type || !details.quantity || parseFloat(details.quantity) <= 0) {
            alert("Please select or enter a Paint Type and a valid Quantity.");
            return;
        }
        // Pass both the details AND the new total price back to the parent
        onSave(details, parseFloat(totalPrice) || null);
    };

    return (
        <div className="paint-mix-modal-content">
            <h4>Enter Paint Mix Details</h4>
            
            {/* --- THIS IS THE NEW EDITABLE DROPDOWN --- */}
            <div className="form-group">
                <label>Paint Type*</label>
                <input
                    list="paint-types"
                    name="paint_type"
                    value={details.paint_type}
                    onChange={handleChange}
                    className="form-control"
                    placeholder="e.g., Basecoat, 2K, etc."
                    required
                    autoFocus
                />
                <datalist id="paint-types">
                    <option value="2K" />
                    <option value="Basecoat" />
                    <option value="QD Enamel" />
                    <option value="Water-Based" />
                    <option value="Industrial" />
                </datalist>
            </div>
            
            <div className="form-group">
                <label>Quantity (Liters)*</label>
                <input name="quantity" type="number" step="0.01" value={details.quantity} onChange={handleChange} className="form-control" required />
            </div>

            {/* --- NEW: TOTAL PRICE INPUT --- */}
             <div className="form-group">
                <label>Total Price (VAT Incl.)</label>
                <input 
                    name="total_price" 
                    type="number" 
                    step="0.01" 
                    value={totalPrice} 
                    onChange={(e) => setTotalPrice(e.target.value)} 
                    placeholder="Enter final price..."
                    className="form-control" 
                />
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
                <button onClick={handleConfirm} className="btn-login">Confirm & Update Cart</button>
            </div>
        </div>
    );
};

export default PaintMixDetailsModal;