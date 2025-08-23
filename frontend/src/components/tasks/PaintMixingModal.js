// frontend/src/components/tasks/PaintMixingModal.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
// Styles will be shared via a single tasks.css file
// import './Tasks.css'; 

const PaintMixingModal = ({ task, onClose }) => {
    const navigate = useNavigate();
    const [availableIngredients, setAvailableIngredients] = useState([]);
    const [usedIngredients, setUsedIngredients] = useState([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [quantityUsed, setQuantityUsed] = useState('');

    useEffect(() => {
        // Fetch all products marked as 'is_ingredient' for the task's business unit
        api.get(`/products/ingredients/${task.business_unit_id}`)
           .then(res => setAvailableIngredients(res.data));
    }, [task]);
    
    // Logic for adding/removing ingredients is the same as the full-page version
    const handleAddIngredient = (e) => { /* ... from previous response */ };
    const handleRemoveIngredient = (id) => { /* ... from previous response */ };

    const handleCompleteMix = async () => {
        try {
            // NOTE: You must build `GET /tasks/:id/job-details` to get the mixingJobId
            const jobDetails = await api.get(`/tasks/${task.id}/job-details`);

            await api.post('/mixing/complete', {
                mixingJobId: jobDetails.data.id,
                ingredientsUsed: usedIngredients.map(ing => ({ id: ing.id, quantity: ing.quantity_used }))
            });
            alert("Mix completed successfully!");
            navigate('/tasks');
        } catch (err) {
            alert("Failed to complete mix.");
        }
    };
    
    return (
        <div>
            {/* The full form and summary list UI for logging ingredients goes here */}
            {/* This is the same JSX from the body of the old PaintMixingPage */}
            <form onSubmit={handleAddIngredient} className="add-ingredient-form">
                {/* select, input, button */}
            </form>
            <div className="consumption-summary">
                {/* ul of used ingredients, and the final complete button */}
                <button onClick={handleCompleteMix} className="btn-login">Confirm & Complete Mix</button>
            </div>
        </div>
    );
};

export default PaintMixingModal;