// frontend/src/App.js

import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import './index.css';

// Layout
import Layout from './components/layout/Layout';

// All Page Components
import BulkBuyersPage from './pages/BulkBuyersPage';
import BusinessSelectorPage from './pages/BusinessSelectorPage';
import CashManagementPage from './pages/CashManagementPage';
import CustomerDetailsPage from './pages/CustomerDetailsPage';
import CustomersPage from './pages/CustomersPage';
import StockTakePage from './pages/StockTakePage';
import DashboardPage from './pages/DashboardPage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import EmployeesPage from './pages/EmployeesPage';
import InvoicePage from './pages/InvoicePage';
import InventoryPage from './pages/InventoryPage';
import LoginPage from './pages/LoginPage';
import PayrollPage from './pages/PayrollPage';
import PosPage from './pages/PosPage';
import RemittancePage from './pages/RemittancePage'; 
import ReportsPage from './pages/ReportsPage';
import SupplierDetailsPage from './pages/SupplierDetailsPage';
import SuppliersPage from './pages/SuppliersPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

const ProtectedRoutes = () => {
    // This component is correct and unchanged
    const { token, selectedBusiness, loading } = useContext(AuthContext);
    if (loading) { return <div>Application Loading...</div>; }
    if (!token) { return <Navigate to="/login" />; }
    if (!selectedBusiness) { return <Navigate to="/select-business" />; }
    return (<Layout><Outlet /></Layout>);
};

function App() {
  return (
    <AuthProvider>
        <Router>
            <Routes>
                {/* Public / Semi-public routes */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/select-business" element={<BusinessSelectorPage />} />
                <Route path="/invoice/:saleId" element={<InvoicePage />} />
                <Route path="/remittance/:purchaseId" element={<RemittancePage />} /> {/* Corrected to be outside */}

                {/* Parent for all main protected routes */}
                <Route element={<ProtectedRoutes />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/pos" element={<PosPage />} />
                    <Route path="/transactions" element={<TransactionHistoryPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/stocktake" element={<StockTakePage />} />
                    
                    {/* Cleaned up and corrected routes */}
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailsPage />} />
                    <Route path="/bulk-buyers" element={<BulkBuyersPage />} />
                    
                    {/* The Suppliers routes were duplicated. This is the correct, single block. */}
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/suppliers/:supplierId" element={<SupplierDetailsPage />} /> 
                    
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
                    <Route path="/payroll" element={<PayrollPage />} />
                    <Route path="/cash-management" element={<CashManagementPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                </Route>
                
                {/* Catch-all to redirect to the dashboard or login screen */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    </AuthProvider>
  );
}

export default App;