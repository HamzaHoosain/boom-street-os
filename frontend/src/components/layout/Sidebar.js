// frontend/src/components/layout/Sidebar.js - UPGRADED
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth'; // Import our new hook
import './Sidebar.css';

// Define which roles can see which pages
const pagePermissions = {
    '/pos': ['Admin', 'Manager', 'POS Clerk', 'Salesperson'],
    '/sales-history': ['Admin', 'Manager'],
    '/inventory': ['Admin', 'Manager', 'Buyer'],
    '/customers': ['Admin', 'Manager', 'POS Clerk', 'Salesperson'],
    '/suppliers': ['Admin', 'Manager', 'Buyer'],
    '/scrapyard': ['Admin', 'Manager', 'Buyer'],
    '/logistics': ['Admin', 'Manager'],
    '/reports': ['Admin', 'Manager']
};

const Sidebar = () => {
    const { currentRole, isSuperAdmin } = useAuth();

    const canView = (path) => {
        // A super admin can see everything
        if (isSuperAdmin) return true;
        // Check if the user's current role is in the allowed list for this page
        if (!pagePermissions[path]) return true; // Default to visible if no permissions are set
        return pagePermissions[path].includes(currentRole);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Boom Street OS</h3>
            </div>
            <ul className="sidebar-menu">
                {/* Always show the dashboard */}
                <li><Link to="/">Dashboard</Link></li>

                {/* Conditionally render links based on permissions */}
                {canView('/pos') && <li><Link to="/pos">Point of Sale</Link></li>}
                {canView('/sales-history') && <li><Link to="/sales-history">Sales History</Link></li>}
                {canView('/inventory') && <li><Link to="/inventory">Inventory</Link></li>}
                {canView('/scrapyard') && <li><Link to="/scrapyard">Scrapyard</Link></li>}
                {canView('/customers') && <li><Link to="/customers">Customers</Link></li>}
                {canView('/suppliers') && <li><Link to="/suppliers">Suppliers</Link></li>}
                {canView('/logistics') && <li><Link to="/logistics">Logistics</Link></li>}
                {canView('/reports') && <li><Link to="/reports">Reports</Link></li>}
            </ul>
        </div>
    );
};

export default Sidebar;