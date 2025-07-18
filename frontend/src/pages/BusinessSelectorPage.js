// File: frontend/src/pages/BusinessSelectorPage.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './BusinessSelectorPage.css';

const BusinessSelectorPage = () => {
    const { user, selectBusiness, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!user || !user.assignments) {
        // This is a safeguard
        return <p>Loading user data or redirecting...</p>;
    }

    const handleSelect = (assignment) => {
        selectBusiness(assignment);
        navigate('/'); // Go to dashboard after selection
    };

    const isAdmin = user.assignments.some(a => a.role_name === 'Admin' && !a.business_unit_id);

    return (
        <div className="selector-container">
            <div className="selector-header">
                <h2>Welcome, {user.firstName || 'User'}!</h2>
                <p>Please select a business unit to manage.</p>
            </div>
            <div className="selector-grid">
                {isAdmin && (
                    <div className="selector-card" onClick={() => handleSelect({ role_name: 'Admin', business_unit_name: 'Company Overview' })}>
                        <h3>Company Overview</h3>
                        <p>Access all business units</p>
                        <span className="role-tag">Admin</span>
                    </div>
                )}
                {user.assignments.map((assignment, index) => {
                    if (!assignment.business_unit_id) return null;
                    return (
                        <div key={index} className="selector-card" onClick={() => handleSelect(assignment)}>
                            <h3>{assignment.business_unit_name}</h3>
                            <p>Continue as a {assignment.role_name}</p>
                            <span className="role-tag">{assignment.role_name}</span>
                        </div>
                    );
                })}
            </div>
            <div className="selector-footer">
                <button onClick={() => { logout(); navigate('/login'); }}>Logout</button>
            </div>
        </div>
    );
};
export default BusinessSelectorPage;