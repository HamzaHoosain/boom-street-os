// frontend/src/components/layout/Sidebar.js

import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { selectedBusiness } = useContext(AuthContext); // Use context to get the active business

    // Determine the type of the active business
    const isRetail = selectedBusiness?.type?.includes('Retail');
    const isScrapyard = selectedBusiness?.type === 'Bulk Inventory';

    // In a real-world scenario, you might get the user's role from the context as well
    // const currentRole = selectedBusiness?.role_name; 
    // For now, we'll assume the user can see all links for their business type

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h3>Boom Street OS</h3>
            </div>
          
            <ul className="sidebar-menu">
                {/* Common Links */}
                <li><NavLink to="/">Dashboard</NavLink></li>
                <li><NavLink to="/pos">POS Terminal</NavLink></li>
                <li><NavLink to="/transactions">Transaction History</NavLink></li>
                
                {/* Inventory Link */}
                <li><NavLink to="/inventory">Inventory</NavLink></li>
                <li><NavLink to="/stocktake">Stock Take</NavLink></li>

                {/* --- CONTEXT-AWARE LINKS --- */}

                {/* Retail-Specific Links */}
                {isRetail && (
                    <>
                        <li><NavLink to="/customers">Customers</NavLink></li>
                          <li><NavLink to="/tasks">My Tasks</NavLink></li>
                        {/* You can add more retail-only links here, like Panel Beating */}
                        {/* <li><NavLink to="/panel-beating">Panel Beating</NavLink></li> */}
                    </>
                )}

                {/* Scrapyard-Specific Links */}
                {isScrapyard && (
                    <>
                        <li><NavLink to="/bulk-buyers">Bulk Buyers</NavLink></li>
                    </>
                )}
                
                {/* --- END OF CONTEXT-AWARE LINKS --- */}
                
                {/* Common Links for both business types */}
                <li><NavLink to="/suppliers">Product Suppliers</NavLink></li>
                <li><NavLink to="/order-management">Order Management</NavLink></li>
                
                {/* Employee Management Links */}
                <li><NavLink to="/employees">Employees</NavLink></li>
                <li><NavLink to="/payroll">Payroll</NavLink></li>
                <li><NavLink to="/cash-management">Cash Management</NavLink></li>
                <li><NavLink to="/reports">Reports</NavLink></li>
            </ul>
        </div>
    );
}

export default Sidebar;