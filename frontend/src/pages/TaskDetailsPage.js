// frontend/src/pages/TaskDetailsPage.js

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './TaskDetailsPage.css'; // New CSS file

const TaskDetailsPage = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [checklistItems, setChecklistItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // You will need this backend route: GET /api/tasks/:id/checklist
                const [taskRes, checklistRes] = await Promise.all([
                    api.get(`/tasks/${taskId}`),
                    api.get(`/tasks/${taskId}/checklist`) 
                ]);
                setTask(taskRes.data);
                setChecklistItems(checklistRes.data);
            } catch (err) {
                setError("Failed to load task details.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [taskId]);
    
    const handleChecklistItemToggle = (itemId) => {
        setChecklistItems(prevItems =>
            prevItems.map(item =>
                item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
            )
        );
    };
    
    const handleCompleteTask = async () => {
        try {
            // Call the new backend endpoint, passing the state of the checklist
            await api.put(`/tasks/${taskId}/complete`, { checklistItems });
            alert("Task Completed! The next step in the workflow has been triggered.");
            navigate('/tasks'); // Go back to the main task list
        } catch (err) {
            alert("Error completing task.");
        }
    };
    
    if (loading) return <p>Loading task...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    const allItemsChecked = checklistItems.every(item => item.is_completed);

    return (
        <div className="task-details-page">
            <Link to="/tasks">← Back to My Tasks</Link>
            <h1>{task?.title}</h1>
            <p className="task-page-description">{task?.description}</p>
            
            <div className="task-details-container">
                {checklistItems.length > 0 && (
                    <div className="checklist-container">
                        <h3>Picking Checklist</h3>
                        <ul className="checklist">
                            {checklistItems.map(item => (
                                <li key={item.id} onClick={() => handleChecklistItemToggle(item.id)} className={item.is_completed ? 'completed' : ''}>
                                    <div className="checkbox">{item.is_completed && '✓'}</div>
                                    <span>{item.item_text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* This section can be expanded for delivery tasks with POD capture */}
                {task?.source_type === 'delivery_run' && (
                    <div className="delivery-details-container">
                        <h3>Delivery Actions</h3>
                        {/* Placeholder for future delivery note and signature pad */}
                        <p>Delivery information and Proof of Delivery capture will appear here.</p>
                    </div>
                )}
            </div>

            <button 
                onClick={handleCompleteTask} 
                className="btn-complete-task"
                disabled={!allItemsChecked && checklistItems.length > 0}
            >
                Mark Task as Complete
            </button>
        </div>
    );
};

export default TaskDetailsPage;