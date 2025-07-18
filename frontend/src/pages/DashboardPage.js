// frontend/src/pages/DashboardPage.js - FINAL ROBUST VERSION
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './DashboardPage.css';

const DashboardPage = () => {
    const { user, selectedBusiness } = useContext(AuthContext);
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!selectedBusiness) return;
            setLoading(true);

            const businessId = selectedBusiness.business_unit_id || 'overview';

            try {
                const response = await api.get(`/dashboard/${businessId}`);
                setDashboardData(response.data);
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [selectedBusiness]);

    return (
        <div>
            <h1>{selectedBusiness?.business_unit_name || 'Dashboard'}</h1>
            <p>Welcome, {user?.firstName || 'User'}!</p>
            
            {loading ? (
                <p>Loading dashboard widgets...</p>
            ) : dashboardData && (
                <div className="widget-grid">
                    <div className="widget">
                        <h3>Total Products</h3>
                        {/* --- DEFENSIVE CHECK --- */}
                        <p className="widget-value">{dashboardData.product_count ?? 0}</p>
                    </div>
                    <div className="widget">
                        <h3>Total Sales</h3>
                        {/* --- DEFENSIVE CHECK --- */}
                        <p className="widget-value">{dashboardData.sales_count ?? 0}</p>
                    </div>
                    <div className="widget">
                        <h3>Total Income</h3>
                        {/* --- DEFENSIVE FIX --- */}
                        {/* Use the nullish coalescing operator '??' to provide a default value if total_income is null/undefined */}
                        <p className="widget-value">R {(dashboardData.total_income ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="widget">
                        <h3>Total Expenses</h3>
                        {/* --- DEFENSIVE FIX --- */}
                        <p className="widget-value">R {(dashboardData.total_expenses ?? 0).toFixed(2)}</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;