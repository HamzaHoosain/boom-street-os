// frontend/src/pages/DashboardPage.js
import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const DashboardPage = () => {
    const { user, logout } = useContext(AuthContext);

    return (
        <div>
            <h1>Dashboard</h1>
            <p>Welcome to the Boom Street OS!</p>
            {user && <p>Your token is: {user.token.substring(0, 30)}...</p>}
            <button onClick={logout}>Logout</button>
        </div>
    );
};

export default DashboardPage;
