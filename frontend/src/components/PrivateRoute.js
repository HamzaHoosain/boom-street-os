// frontend/src/App.js - THE FINAL, CORRECTED ROUTER
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Import Pages and Components
import LoginPage from './pages/LoginPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import PrivateRoute from './components/routing/PrivateRoute'; // Our new gatekeeper
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-business" element={<BusinessSelectorPage />} />

        {/* 
          This is the key. We create a "route layout". 
          The <PrivateRoute /> component acts as the parent for all protected routes.
          If the user is authenticated, it will render the correct child page inside the <Outlet />.
          If not, it will handle the redirect.
        */}
        <Route path="/" element={<PrivateRoute />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          {/* Add future private routes here, like <Route path="/reports" ... /> */}
        </Route>
        
        {/* A final catch-all to redirect any unknown URLs */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;