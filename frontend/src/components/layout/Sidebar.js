// frontend/src/components/layout/Sidebar.js - FINAL WITH TRANSACTION HISTORY
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import './Sidebar.css';

// Define which roles can see which pages
const pagePermissions = {
    '/pos': ['Admin', 'Manager', 'POS Clerk', 'Salesperson'],
    '/transactions': ['Admin', 'Manager'], // <-- 1. RENAMED FROM '/sales-history'
    // '/expenses' has been removed
     '/expenses': ['Admin', 'Manager'],
    '/inventory': ['Admin', 'Manager', 'Buyer'],
    '/customers': ['Admin', 'Manager', 'POS Clerk', 'Salesperson'],
    '/panel-beating': ['Admin', 'Manager', 'General Staff'],
    '/suppliers': ['Admin', 'Manager', 'Buyer'],
    '/scrapyard': ['Admin', 'Manager', 'Buyer'],
    '/logistics': ['Admin', 'Manager'],
    '/cash-management': ['Admin', 'Manager'],
    '/reports': ['Admin', 'Manager']
};

const Sidebar = () => {
    const { currentRole, isSuperAdmin } = useAuth();

    const canView = (path) => {
        if (isSuperAdmin) return true;
        if (!pagePermissions[path]) return true;
        return pagePermissions[path].includes(currentRole);
    };

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Boom Street OS</h3>
            </div>
            <ul className="sidebar-menu">
                <li><Link to="/">Dashboard</Link></li>

                {/* --- 2. UPDATE THE LINKS --- */}
                {canView('/pos') && <li><Link to="/pos">Point of Sale</Link></li>}
                {canView('/transactions') && <li><Link to="/transactions">Transaction History</Link></li>}
                {canView('/expenses') && <li><Link to="/expenses">Add Expense</Link></li>} 
                {canView('/inventory') && <li><Link to="/inventory">Inventory</Link></li>}
                {canView('/scrapyard') && <li><Link to="/scrapyard">Bulk Sales</Link></li>}
                {canView('/cash-management') && <li><Link to="/cash-management">Cash Management</Link></li>}
                {canView('/customers') && <li><Link to="/customers">Customers</Link></li>}
                {canView('/suppliers') && <li><Link to="/suppliers">Suppliers</Link></li>}
                {canView('/panel-beating') && <li><Link to="/panel-beating">Panel Beating</Link></li>}
                {canView('/logistics') && <li><Link to="/logistics">Logistics</Link></li>}
                {canView('/cash-management') && <li><Link to="/cash-management">Cash Management</Link></li>}
                {canView('/reports') && <li><Link to="/reports">Reports</Link></li>}
            </ul>
        </div>
    );
};

export default Sidebar;