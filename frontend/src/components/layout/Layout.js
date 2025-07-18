// frontend/src/components/layout/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header'; // Import the new Header
import './Layout.css';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            {/* The main-content now contains the Header and the page content */}
            <div className="main-content">
                <Header />
                <main className="content-area">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;