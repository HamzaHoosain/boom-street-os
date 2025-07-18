// File: frontend/src/App.js
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import DashboardPage from './pages/DashboardPage';
 import ScrapyardPage from './pages/ScrapyardPage';
import PosPage from './pages/PosPage';
import InventoryPage from './pages/InventoryPage';
import EditProductPage from './pages/EditProductPage';
import SuppliersPage from './pages/SuppliersPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import CustomersPage from './pages/CustomersPage';
import InvoicePage from './pages/InvoicePage';

// This is our new, simplified Gatekeeper component
const ProtectedRoutes = () => {
    const { token, selectedBusiness, loading } = useContext(AuthContext);

    if (loading) return <div>Loading Application...</div>;
    
    if (!token) return <Navigate to="/login" />;
    if (!selectedBusiness) return <Navigate to="/select-business" />;

    // If all checks pass, show the main application layout
    return (
        <Layout>
            <Outlet /> {/* This will render the matched child route */}
        </Layout>
    );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-business" element={<BusinessSelectorPage />} />
        <Route path="/invoice/:saleId" element={<InvoicePage />} />

        {/* This is the parent for all protected routes */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/edit/:productId" element={<EditProductPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/scrapyard" element={<ScrapyardPage />} />
          <Route path="/sales-history" element={<SalesHistoryPage />} />
          {/* Add all other protected routes here */}
        </Route>
        
        {/* Fallback for any other URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;