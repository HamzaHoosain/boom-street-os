// frontend/src/App.js - FINAL CORRECTED VERSION
import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';

import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import DashboardPage from './pages/DashboardPage';
import PosPage from './pages/PosPage';
import CustomerDetailsPage from './pages/CustomerDetailsPage';
import InventoryPage from './pages/InventoryPage';
import EditProductPage from './pages/EditProductPage';
import EmployeesPage from './pages/EmployeesPage';
import PanelBeatingPage from './pages/PanelBeatingPage';
import ScrapyardPage from './pages/ScrapyardPage';
import BulkBuyersPage from './pages/BulkBuyersPage';
import SuppliersPage from './pages/SuppliersPage';
import CustomersPage from './pages/CustomersPage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import InvoicePage from './pages/InvoicePage';
import ReportsPage from './pages/ReportsPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage'; // The new unified page
import CashManagementPage from './pages/CashManagementPage';

// This is our simple Gatekeeper component
const ProtectedRoutes = () => {
    const { token, selectedBusiness } = useContext(AuthContext);

    if (!token) return <Navigate to="/login" />;
    if (!selectedBusiness) return <Navigate to="/select-business" />;

    // If all checks pass, show the main application layout which contains the page
    return (
        <Layout>
            <Outlet /> 
        </Layout>
    );
};

function App() {
  const { loading } = useContext(AuthContext);

  if (loading) {
    return <div>Application is loading...</div>;
  }

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
          <Route path="/scrapyard" element={<ScrapyardPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/bulk-buyers" element={<BulkBuyersPage />} />
          <Route path="/panel-beating" element={<PanelBeatingPage />} />
          <Route path="/customers/:id" element={<CustomerDetailsPage />} />
          <Route path="/transactions" element={<TransactionHistoryPage />} />
          <Route path="/cash-management" element={<CashManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          {/* Add all other protected routes here */}
        </Route>
        
        {/* Fallback for any other URL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;