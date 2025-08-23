// frontend/src/components/tasks/PickingChecklist.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Tasks.css'; // We will create a shared CSS file for task components

const PickingChecklist = ({ taskId }) => {
    const navigate = useNavigate();
    const [checklistItems, setChecklistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!taskId) return;
        const fetchChecklist = async () => {
            setLoading(true);
            try {
                // You must build this backend endpoint: GET /api/tasks/:id/checklist
                const response = await api.get(`/tasks/${taskId}/checklist`);
                setChecklistItems(response.data);
            } catch (err) {
                console.error("Failed to fetch checklist", err);
                setError("Could not load checklist items for this task.");
            } finally {
                setLoading(false);
            }
        };
        fetchChecklist();
    }, [taskId]);

    const handleChecklistItemToggle = (itemId) => {
        setChecklistItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
            )
        );
    };

    const handleCompleteTask = async () => {
        if (!window.confirm("Are you sure you want to mark this task as complete?")) return;
        
        try {
            // This is the powerful endpoint that also triggers the next workflow step
            await api.put(`/tasks/${taskId}/complete`, { checklistItems });
            alert("Picking task completed! A delivery task has been generated.");
            navigate('/tasks'); // Navigate back to the main task list
        } catch (err) {
            alert("An error occurred while completing the task.");
            console.error(err);
        }
    };
    
    if (loading) return <p>Loading checklist...</p>;
    if (error) return <p className="alert-error">{error}</p>;
    if (checklistItems.length === 0) return <p>This task has no checklist items.</p>;

    const allItemsChecked = checklistItems.every(item => item.is_completed);

    return (
        <div className="checklist-container">
            <h3>Picking Checklist</h3>
            <ul className="checklist">
                {checklistItems.map(item => (
                    <li 
                        key={item.id} 
                        onClick={() => handleChecklistItemToggle(item.id)} 
                        className={item.is_completed ? 'completed' : ''}
                    >
                        <div className="checkbox">{item.is_completed ? '✓' : ''}</div>
                        <span>{item.item_text}</span>
                    </li>
                ))}
            </ul>
            <button 
                onClick={handleCompleteTask} 
                className="btn-complete-task"
                disabled={!allItemsChecked} // Button is disabled until all items are checked
                title={!allItemsChecked ? "All items must be checked to complete this task" : "Complete Task"}
            >
                Mark Picking as Complete
            </button>
        </div>
    );
};

export default PickingChecklist;