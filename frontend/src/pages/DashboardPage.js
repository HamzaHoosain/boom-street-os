// frontend/src/pages/DashboardPage.js - CORRECTED
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const DashboardPage = () => {
    // Get both the 'user' object and the 'token' string from the context
    const { user, token, logout } = useContext(AuthContext);

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to the Boom Street OS, {user?.firstName || 'User'}!</p>
            
            {/* Display a snippet of the token directly from the 'token' variable */}
            {token && <p>Your session token is: {token.substring(0, 30)}...</p>}
            
            <button onClick={logout}>Logout</button>
        </div>
    );
};

export default DashboardPage;