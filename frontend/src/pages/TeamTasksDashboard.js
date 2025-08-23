// frontend/src/pages/TeamTasksDashboard.js

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
// Reuse the same CSS as MyTasksPage for consistency
import './MyTasksPage.css'; 

const TeamTasksDashboard = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('pending'); // 'pending' or 'completed'
    
    useEffect(() => {
        if (!selectedBusiness?.business_unit_id) return;
        // You need a new backend route for this: GET /api/tasks/for-team/:businessUnitId?status=...
        api.get(`/tasks/for-team/${selectedBusiness.business_unit_id}?status=${filter}`)
           .then(res => setTasks(res.data));
    }, [selectedBusiness, filter]);

    return (
        <div>
            <h1>Team Task Dashboard for {selectedBusiness?.business_unit_name}</h1>
            <div className="task-filters">
                <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>Pending Tasks</button>
                <button onClick={() => setFilter('completed')} className={filter === 'completed' ? 'active' : ''}>Completed Tasks</button>
            </div>
            
            <div className="task-list-container">
                {/* The list rendering logic is very similar to MyTasksPage */}
                {/* It will show tasks for ALL users in the business unit */}
            </div>
        </div>
    );
};

export default TeamTasksDashboard;