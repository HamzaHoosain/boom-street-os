// frontend/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

// Import all pages and layout
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import SuppliersPage from './pages/SuppliersPage';
import './App.css';

function App() {
  const { token, user, selectedBusiness, loading } = useContext(AuthContext);

  if (loading) {
    return <div>Application Loading...</div>; // A persistent loading screen
  }

  return (
    <Router>
      <Routes>
        {/* Public Route: Login */}
        <Route path="/login" element={!token ? <LoginPage /> : <Navigate to="/select-business" />} />
        
        {/* Semi-Private Route: Business Selector */}
        <Route path="/select-business" element={token && !selectedBusiness ? <BusinessSelectorPage /> : <Navigate to={token ? "/" : "/login"} />} />
        
        {/* Fully Private Routes */}
        <Route path="/*" element={token && selectedBusiness ? (
          <Layout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/pos" element={<PosPage />} />
              <Route path="/inventory" element={<InventoryPage />} />
              <Route path="/suppliers" element={<SuppliersPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Layout>
        ) : (
          <Navigate to="/login" />
        )} />
      </Routes>
    </Router>
  );
}

export default App;