import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import './index.css'; // <-- CHANGE THE IMPORT

// Import Layout
import Layout from './components/layout/Layout';

// Import All Page Components (in alphabetical order for cleanliness)
import BulkBuyersPage from './pages/BulkBuyersPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import CashManagementPage from './pages/CashManagementPage';
import CustomerDetailsPage from './pages/CustomerDetailsPage';
import CustomersPage from './pages/CustomersPage';
import DashboardPage from './pages/DashboardPage';
import EditProductPage from './pages/EditProductPage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import EmployeesPage from './pages/EmployeesPage';
import InvoicePage from './pages/InvoicePage';
import InventoryPage from './pages/InventoryPage';
import LoginPage from './pages/LoginPage';
import PanelBeatingPage from './pages/PanelBeatingPage';
import PayrollPage from './pages/PayrollPage';
import PosPage from './pages/PosPage';
import ReportsPage from './pages/ReportsPage';
import ScrapyardPage from './pages/ScrapyardPage';
import SuppliersPage from './pages/SuppliersPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

// This is our final, robust Gatekeeper component
const ProtectedRoutes = () => {
    const { token, selectedBusiness, loading } = useContext(AuthContext);

    // If the context is still loading data from localStorage, show a loading screen.
    // This prevents redirects before the app knows if the user is logged in.
    if (loading) {
        return <div>Application Loading...</div>;
    }

    // After loading, if there's no token, redirect to login.
    if (!token) {
        return <Navigate to="/login" />;
    }

    // If there's a token but no business selected, redirect to the selector.
    if (!selectedBusiness) {
        return <Navigate to="/select-business" />;
    }

    // If all checks pass, show the main application layout.
    // The <Outlet /> will be replaced by the matched child route (e.g., DashboardPage).
    return (
        <Layout>
            <Outlet /> 
        </Layout>
    );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes that exist outside the main layout */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/select-business" element={<BusinessSelectorPage />} />
        <Route path="/invoice/:saleId" element={<InvoicePage />} />

        {/* This is the parent for all protected routes. Our gatekeeper controls access. */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<PosPage />} />
          <Route path="/transactions" element={<TransactionHistoryPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/inventory/edit/:productId" element={<EditProductPage />} />
          <Route path="/scrapyard" element={<ScrapyardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailsPage />} />
          <Route path="/bulk-buyers" element={<BulkBuyersPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/employees" element={<EmployeesPage />} />
          <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
          <Route path="/payroll" element={<PayrollPage />} />
          <Route path="/panel-beating" element={<PanelBeatingPage />} />
          <Route path="/cash-management" element={<CashManagementPage />} />
          <Route path="/reports" element={<ReportsPage />} />
        </Route>
        
        {/* A final catch-all. If no route matches, it will be handled by ProtectedRoutes. */}
        <Route path="*" element={<ProtectedRoutes />} />
      </Routes>
    </Router>
  );
}

export default App;