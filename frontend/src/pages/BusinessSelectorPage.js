// frontend/src/pages/BusinessSelectorPage.js - CORRECTED
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import './BusinessSelectorPage.css';

const BusinessSelectorPage = () => {
    const { user, selectBusiness, logout } = useContext(AuthContext);

    // --- THIS IS THE FIX ---
    // If the user object is not yet available, render a loading state
    // or nothing at all. This prevents the component from crashing.
    if (!user || !user.assignments) {
        return <div>Loading user data...</div>;
    }
    // --- END OF FIX ---

    const handleSelect = (assignment) => {
        selectBusiness(assignment);
    };

    // Now it is safe to run this line, because we know 'user.assignments' exists.
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
                <button onClick={logout}>Logout</button>
            </div>
        </div>
    );
};

export default BusinessSelectorPage;