// frontend/src/pages/PaintMixingPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './PaintMixingPage.css'; // This CSS file will now be created

const PaintMixingPage = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();
    const { selectedBusiness } = useContext(AuthContext);

    // State for the task and recipe
    const [task, setTask] = useState(null);
    const [saleItem, setSaleItem] = useState(null);
    const [finishedGood, setFinishedGood] = useState(null);
    const [recipe, setRecipe] = useState([]);
    
    // State for the user's actions
    const [availableIngredients, setAvailableIngredients] = useState([]);
    const [usedIngredients, setUsedIngredients] = useState([]);
    const [selectedIngredientId, setSelectedIngredientId] = useState('');
    const [quantityUsed, setQuantityUsed] = useState('');
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!taskId || !selectedBusiness) return;
            setLoading(true);
            try {
                // Get the task details, which includes the source_id (sale_item_id)
                const taskRes = await api.get(`/tasks/${taskId}`);
                const currentTask = taskRes.data;
                setTask(currentTask);

                // Get all products that ARE ingredients for this business
                const ingredientsRes = await api.get(`/products/ingredients/${selectedBusiness.business_unit_id}`);
                setAvailableIngredients(ingredientsRes.data);
                
                // Get the details of the specific sale item this task is for
                // You'll need a backend route for this: GET /api/sales/item/:saleItemId
                const saleItemRes = await api.get(`/sales/item/${currentTask.source_id}`);
                setSaleItem(saleItemRes.data);
                setFinishedGood(saleItemRes.data.product_details); // Assuming product info is nested
                
                // Fetch the recipe for the finished good product
                const recipeRes = await api.get(`/recipes/${saleItemRes.data.product_id}`);
                setRecipe(recipeRes.data);

            } catch (err) {
                setError("Failed to load task and recipe details.");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [taskId, selectedBusiness]);

    const handleAddIngredient = () => {
        if (!selectedIngredientId || !quantityUsed || quantityUsed <= 0) {
            alert("Please select an ingredient and enter a valid quantity.");
            return;
        }
        const ingredientToAdd = availableIngredients.find(i => i.id === parseInt(selectedIngredientId));
        
        setUsedIngredients(prev => [...prev, {
            ...ingredientToAdd,
            quantity_used: parseFloat(quantityUsed)
        }]);

        // Reset form
        setSelectedIngredientId('');
        setQuantityUsed('');
    };
    
    const handleCompleteMix = async () => {
        if (usedIngredients.length === 0) {
            setError("Please log at least one ingredient used for this mix.");
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/mixing/complete', {
                taskId: task.id,
                saleItemId: saleItem.id,
                ingredientsUsed: usedIngredients.map(ing => ({ id: ing.id, quantity: ing.quantity_used }))
            });
            setSuccess("Mix completed successfully! Stock has been updated.");
            setTimeout(() => navigate('/tasks'), 2000); // Redirect back to tasks after a short delay
        } catch (err) {
            setError(err.response?.data?.msg || "Failed to complete mix.");
            setLoading(false);
        }
    };
    
    if (loading) return <p>Loading mixing task...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div className="mixing-page">
            <Link to="/tasks">← Back to My Tasks</Link>
            <h1>{task?.title}</h1>
            {success ? <p className="alert-success">{success}</p> :
            <div className="mixing-container">
                <div className="ingredient-selector-panel">
                    <h3>Log Ingredients Used</h3>
                    <div className="add-ingredient-form">
                        <select value={selectedIngredientId} onChange={e => setSelectedIngredientId(e.target.value)} className="form-control">
                            <option value="" disabled>-- Select an ingredient --</option>
                            {availableIngredients.map(ing => <option key={ing.id} value={ing.id}>{ing.name}</option>)}
                        </select>
                        <input type="number" value={quantityUsed} onChange={e => setQuantityUsed(e.target.value)} placeholder="Qty Used" className="form-control" />
                        <button onClick={handleAddIngredient} className="btn-add">+</button>
                    </div>
                    
                    <div className="consumption-summary">
                        <h4>Consumption Summary:</h4>
                        <ul className="consumption-list">
                            {usedIngredients.map((ing, index) => (
                                <li key={index}>{ing.name}: <strong>{ing.quantity_used} L/units</strong></li>
                            ))}
                        </ul>
                         <button onClick={handleCompleteMix} disabled={loading} className="btn-complete-mix">
                            {loading ? "Completing..." : "Confirm & Complete Mix"}
                         </button>
                    </div>
                </div>

                <div className="recipe-display-panel">
                    <h3>Recipe / Formula</h3>
                    {finishedGood && <p>Formula for: <strong>{saleItem.quantity_sold}L of {finishedGood.name}</strong></p>}
                    <ul className="recipe-list">
                         {recipe.length > 0 ? recipe.map(ing => (
                             <li key={ing.ingredient_id}>
                                <span>{ing.ingredient_name}</span>
                                <strong>{(parseFloat(ing.quantity_required) * parseFloat(saleItem.quantity_sold)).toFixed(4)}</strong>
                            </li>
                         )) : <p>No recipe found for this product.</p>}
                    </ul>
                </div>
            </div>
            }
        </div>
    );
};

export default PaintMixingPage;