// frontend/src/components/layout/Sidebar.js
import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css'; // We'll create this next

const Sidebar = () => {
    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Boom Street OS</h3>
            </div>
            <ul className="sidebar-menu">
                <li><Link to="/dashboard">Dashboard</Link></li>
                {/* We will add more links here later */}
                <li><Link to="/pos">Point of Sale</Link></li>
                <li><Link to="/inventory">Inventory</Link></li>
                 <li><Link to="/suppliers">Suppliers</Link></li>
                <li><Link to="/logistics">Logistics</Link></li>
                <li><Link to="/reports">Reports</Link></li>
            </ul>
        </div>
    );
};

export default Sidebar;