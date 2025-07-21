// frontend/src/pages/ReportsPage.js - FINAL ROBUST VERSION
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './ReportsPage.css';

const ReportsPage = () => {
    const { selectedBusiness } = useContext(AuthContext); // This can be null initially
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const generateReport = async () => {
        // --- DEFENSIVE CHECK ---
        // Ensure selectedBusiness exists before trying to use it.
        if (!selectedBusiness) {
            setError("Please select a business unit from the header first.");
            return;
        }
        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const businessId = selectedBusiness.business_unit_id || 'overview';
            const response = await api.get(`/reporting/profit-and-loss?business_unit_id=${businessId}&start_date=${startDate}&end_date=${endDate}`);
            setReportData(response.data);
        } catch (err) {
            setError('Failed to generate report. Please try again.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (num) => `R ${parseFloat(num || 0).toFixed(2)}`;

    // --- ANOTHER DEFENSIVE CHECK ---
    // If the context hasn't loaded the selectedBusiness yet, show a loading message.
    if (!selectedBusiness) {
        return <div>Loading business context...</div>;
    }

    return (
        <div>
            {/* Safely access the business name using optional chaining (?.) */}
            <h1>Financial Report for {selectedBusiness?.business_unit_name || 'Company'}</h1>
            <div className="report-controls">
                <div className="form-group"><label>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-control" /></div>
                <div className="form-group"><label>End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-control" /></div>
                <button onClick={generateReport} disabled={loading} className="btn-login">{loading ? 'Generating...' : 'Generate Report'}</button>
            </div>

            {error && <p className="alert-error" style={{marginTop: '1rem'}}>{error}</p>}
            {loading && <p style={{marginTop: '2rem'}}>Generating report, please wait...</p>}

            {reportData && (
                <div className="report-grid">
                    <div className="report-card primary">
                        <span>Gross Revenue</span>
                        <strong>{formatCurrency(reportData.gross_revenue)}</strong>
                    </div>
                    <div className="report-card secondary">
                        <span>- Cost of Goods Sold (COGS)</span>
                        <strong>{formatCurrency(reportData.cost_of_goods_sold)}</strong>
                    </div>
                    <div className="report-card primary profit">
                        <span>= Gross Profit</span>
                        <strong>{formatCurrency(reportData.gross_profit)}</strong>
                    </div>
                    <div className="report-card secondary">
                        <span>- Operating Expenses</span>
                        <strong>{formatCurrency(reportData.operating_expenses)}</strong>
                    </div>
                    <div className="report-card primary profit final">
                        <span>= Net Profit</span>
                        <strong>{formatCurrency(reportData.net_profit)}</strong>
                    </div>
                    <div className="report-card tax">
                        <span>Estimated Tax (15%)</span>
                        <strong>{formatCurrency(reportData.estimated_tax)}</strong>
                    </div>
                    <div className="report-card receivable">
                        <span>Current Accounts Receivable</span>
                        <strong title="Total outstanding balance from all customers">{formatCurrency(reportData.expected_income_receivable)}</strong>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;