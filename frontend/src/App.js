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
import DashboardPage from './pages/DashboardPage';
import EmployeeDetailsPage from './pages/EmployeeDetailsPage';
import EmployeesPage from './pages/EmployeesPage';
import InvoicePage from './pages/InvoicePage';
import A4InvoicePage from './pages/A4InvoicePage';
import QuotePage from './pages/QuotePage';
import PurchaseOrderPage from './pages/PurchaseOrderPage';
import SalesOrderPage from './pages/SalesOrderPage';
import InventoryPage from './pages/InventoryPage';
import OrderManagementPage from './pages/OrderManagementPage';
import LoginPage from './pages/LoginPage';
import PayrollPage from './pages/PayrollPage';
import PosPage from './pages/PosPage';
import RemittancePage from './pages/RemittancePage'; 
import ReportsPage from './pages/ReportsPage';
import SupplierDetailsPage from './pages/SupplierDetailsPage';
import SuppliersPage from './pages/SuppliersPage';
import StockTakePage from './pages/StockTakePage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

// --- CRITICAL: Import the new Task Management pages ---
import MyTasksPage from './pages/MyTasksPage';
import TaskDetailsPage from './pages/TaskDetailsPage';
import PaintMixingPage from './pages/PaintMixingPage';
import PaintMixDetailsModal from './components/pos/PaintMixDetailsModal';


const ProtectedRoutes = () => {
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

                {/* Printable Document Routes (do not need full layout) */}
                <Route path="/invoice/:saleId" element={<InvoicePage />} />
                <Route path="/quote/:quoteId" element={<QuotePage />} />
                <Route path="/purchase-order/:poId" element={<PurchaseOrderPage />} /> 
                <Route path="/sales-order/:soId" element={<SalesOrderPage />} /> 
                <Route path="/remittance/:purchaseId" element={<RemittancePage />} /> 
                <Route path="/a4-invoice/:saleId" element={<A4InvoicePage />} />
                
                {/* Parent for all main protected routes with sidebar/navbar */}
                <Route element={<ProtectedRoutes />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/pos" element={<PosPage />} />
                    <Route path="/paint-mix-modal" element={<PaintMixDetailsModal />} />
                    <Route path="/transactions" element={<TransactionHistoryPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/stocktake" element={<StockTakePage />} />
                    <Route path="/customers" element={<CustomersPage />} />
                    <Route path="/customers/:id" element={<CustomerDetailsPage />} />
                    <Route path="/bulk-buyers" element={<BulkBuyersPage />} />
                    <Route path="/suppliers" element={<SuppliersPage />} />
                    <Route path="/suppliers/:supplierId" element={<SupplierDetailsPage />} /> 
                    <Route path="/order-management" element={<OrderManagementPage />} />
                    <Route path="/employees" element={<EmployeesPage />} />
                    <Route path="/employees/:id" element={<EmployeeDetailsPage />} />
                    <Route path="/payroll" element={<PayrollPage />} />
                    <Route path="/cash-management" element={<CashManagementPage />} />
                    <Route path="/reports" element={<ReportsPage />} />

                    {/* --- CRITICAL: ADD THE NEW TASK MANAGEMENT ROUTES HERE --- */}
                    <Route path="/tasks" element={<MyTasksPage />} />
                    <Route path="/task/:taskId" element={<TaskDetailsPage />} />
                    {/* --- END OF CRITICAL ADDITION --- */}
                </Route>
                
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    </AuthProvider>
  );
}

export default App;