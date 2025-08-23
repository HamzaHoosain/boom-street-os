// frontend/src/pages/MyTasksPage.js

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './MyTasksPage.css'; // We will create this new CSS file

const MyTasksPage = () => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchTasks = async () => {
            setLoading(true);
            try {
                // This route gets tasks specifically for the authenticated user (via token)
                const response = await api.get('/tasks/my-tasks');
                setTasks(response.data);
            } catch (err) {
                console.error("Failed to fetch tasks", err);
                setError('Could not load your assigned tasks.');
            } finally {
                setLoading(false);
            }
        };

        fetchTasks();
    }, []);

    const renderTaskLink = (task) => {
        // Now, all clickable task types go to the SAME page.
        if (task.source_type === 'sale_item' || task.source_type === 'sales_order') {
            return <Link to={`/task/${task.id}`} className="task-link">{task.title}</Link>;
        }
        // ... any future clickable types
        return <span>{task.title}</span>; // Default for non-actionable tasks
    };

    if (loading) return <p>Loading your tasks...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div>
            <h1>My Assigned Tasks</h1>
            
            <div className="task-list-container">
                {tasks.length > 0 ? (
                    <ul className="task-list">
                        {tasks.map(task => (
                            <li key={task.id} className={`task-item status-${task.status.toLowerCase()}`}>
                                <div className="task-item-header">
                                    {renderTaskLink(task)}
                                    <span className="task-status-badge">{task.status}</span>
                                </div>
                                <p className="task-description">{task.description}</p>
                                <div className="task-meta">
                                    <span>For Business: <strong>{task.business_unit_name}</strong></span>
                                    <span>Created: {new Date(task.created_at).toLocaleString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>You have no pending tasks. Great job!</p>
                )}
            </div>
        </div>
    );
};

export default MyTasksPage;