// frontend/src/components/layout/Layout.js
import React from 'react';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = ({ children }) => {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="content-area">
                {children}
            </main>
        </div>
    );
};

export default Layout;