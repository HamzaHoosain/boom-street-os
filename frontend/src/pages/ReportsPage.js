// frontend/src/pages/ReportsPage.js - FINAL ROBUST VERSION
import React, { useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './ReportsPage.css';

const ReportsPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const generateReport = async () => {
        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const businessId = selectedBusiness.business_unit_id || 'overview';
            const response = await api.get(`/reporting/profit-and-loss?business_unit_id=${businessId}&start_date=${startDate}&end_date=${endDate}`);
            setReportData(response.data);
        } catch (err) {
            setError('Failed to generate report.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Reports for {selectedBusiness.business_unit_name}</h1>
            <div className="report-controls">
                <div className="form-group">
                    <label>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-control" />
                </div>
                <div className="form-group">
                    <label>End Date</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-control" />
                </div>
                <button onClick={generateReport} disabled={loading} className="btn-login">
                    {loading ? 'Generating...' : 'Generate Report'}
                </button>
            </div>

            {error && <p className="alert-error">{error}</p>}
            
            {reportData && (
                <div className="report-container">
                    <h2>Profit & Loss</h2>
                    <div className="report-summary">
                        <div className="summary-item income">
                            <span>Total Income</span>
                            {/* --- DEFENSIVE FIX --- */}
                            <strong>R {(reportData.summary?.total_income ?? 0).toFixed(2)}</strong>
                        </div>
                        <div className="summary-item expense">
                            <span>Total Expenses</span>
                            {/* --- DEFENSIVE FIX --- */}
                            <strong>R {(reportData.summary?.total_expenses ?? 0).toFixed(2)}</strong>
                        </div>
                        <div className="summary-item profit">
                            <span>Net Profit</span>
                            {/* --- DEFENSIVE FIX --- */}
                            <strong>R {(reportData.summary?.net_profit ?? 0).toFixed(2)}</strong>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;