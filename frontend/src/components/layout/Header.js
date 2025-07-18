// frontend/src/components/layout/Header.js - CORRECTED
import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import './Header.css';

const Header = () => {
    const { user, selectedBusiness, selectBusiness, logout } = useContext(AuthContext);

    // This check is important for the initial render
    if (!user || !selectedBusiness) return null;

    // --- NEW LOGIC ---
    // First, determine if the user fundamentally HAS an Admin role anywhere in their assignments.
    const hasAdminRole = user.assignments.some(a => a.role_name === 'Admin');
    // --- END OF NEW LOGIC ---

    const userBusinesses = user?.assignments?.filter(a => a.business_unit_id) || [];

    const handleSwitch = (e) => {
        const selectedId = parseInt(e.target.value);
        if (!selectedId) {
            // User selected the "Company Overview" option
            selectBusiness({ role_name: 'Admin', business_unit_name: 'Company Overview' });
        } else {
            const assignment = user.assignments.find(a => a.business_unit_id === selectedId);
            if (assignment) {
                selectBusiness(assignment);
            }
        }
    };
    
    // The value for the dropdown should be the currently selected business_unit_id, or an empty string for the overview
    const currentSelectionValue = selectedBusiness.business_unit_id || "";

    return (
        <header className="app-header">
            <div className="header-context">
                {/* --- RENDER LOGIC CHANGE --- */}
                {/* If the user is an Admin, ALWAYS show the dropdown. Otherwise, show static text. */}
                {hasAdminRole ? (
                    <select onChange={handleSwitch} value={currentSelectionValue}>
                        <option value="">Company Overview</option>
                        {userBusinesses.map(b => (
                            <option key={b.business_unit_id} value={b.business_unit_id}>
                                {b.business_unit_name}
                            </option>
                        ))}
                    </select>
                ) : (
                    <h2>{selectedBusiness.business_unit_name}</h2>
                )}
                {/* --- END OF RENDER LOGIC CHANGE --- */}

                <span className="role-tag-header">{selectedBusiness.role_name}</span>
            </div>
            <div className="header-actions">
                <button onClick={logout}>Logout</button>
            </div>
        </header>
    );
};

export default Header;