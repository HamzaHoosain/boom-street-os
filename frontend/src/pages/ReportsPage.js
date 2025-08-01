// frontend/src/pages/ReportsPage.js

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import './ReportsPage.css';

const ReportsPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    const [showAllItems, setShowAllItems] = useState(false);
    const [showAllCustomers, setShowAllCustomers] = useState(false);
    const [showAllPurchases, setShowAllPurchases] = useState(false); // New state for purchases

    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

    const generateReport = async () => {
        if (!selectedBusiness) {
            setError("Please select a business unit first.");
            return;
        }
        setLoading(true);
        setError('');
        setReportData(null);
        
        // When showing all, we send 0 for 'no limit'. Otherwise, send 10.
        const itemsLimit = showAllItems ? 0 : 10;
        const customersLimit = showAllCustomers ? 0 : 10;
        const purchasesLimit = showAllPurchases ? 0 : 10;

        try {
            // Updated to send different limits for each list
            const response = await api.get(`/reporting/dashboard-report?business_unit_id=${selectedBusiness.business_unit_id}&start_date=${startDate}&end_date=${endDate}&itemsLimit=${itemsLimit}&customersLimit=${customersLimit}&purchasesLimit=${purchasesLimit}`);
            setReportData(response.data);
        } catch (err) {
            setError('Failed to generate report.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        if(selectedBusiness) {
            generateReport();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBusiness]);

    // This effect re-fetches data when a "show all" button is clicked
    useEffect(() => {
        if (reportData) { // only refetch if a report already exists
            generateReport();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showAllItems, showAllCustomers, showAllPurchases]);

    const formatCurrency = (num) => `R ${parseFloat(num || 0).toFixed(2)}`;
    
    if (!selectedBusiness) {
        return ( <div><h1>Business Reports</h1><p>Please select a business unit to generate a report.</p></div> );
    }

    // Determine which list to display based on state
    const itemsToShow = showAllItems ? reportData?.detailedLists?.top_selling_products : reportData?.detailedLists?.top_selling_products.slice(0, 10);
    const customersToShow = showAllCustomers ? reportData?.detailedLists?.top_customers_by_revenue : reportData?.detailedLists?.top_customers_by_revenue.slice(0, 10);

    return (
        <div className="reports-page">
            <header className="reports-header">
                <h1>BI Report: {selectedBusiness.business_unit_name}</h1>
                <div className="report-controls">
                    <div className="form-group"><label>Start Date</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="form-control" /></div>
                    <div className="form-group"><label>End Date</label><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="form-control" /></div>
                    <button onClick={generateReport} disabled={loading} className="btn-login">{loading ? 'Generating...' : 'Generate Report'}</button>
                </div>
            </header>

            {error && <p className="alert-error">{error}</p>}
            {loading && <p>Crunching the numbers...</p>}

            {reportData && (
                <main className="report-content">
                    <section className="kpi-summary-grid">
                        <div className="summary-item"><span>Gross Revenue</span><strong>{formatCurrency(reportData.profitAndLoss.gross_revenue)}</strong></div>
                        <div className="summary-item expense"><span>Cost of Goods Sold</span><strong>{formatCurrency(reportData.profitAndLoss.cost_of_goods_sold)}</strong></div>
                        <div className="summary-item profit"><span>Gross Profit</span><strong>{formatCurrency(reportData.profitAndLoss.gross_profit)}</strong></div>
                        <div className="summary-item expense"><span>Operating Expenses</span><strong>{formatCurrency(reportData.profitAndLoss.operating_expenses)}</strong></div>
                        <div className="summary-item profit final"><span>Net Profit</span><strong>{formatCurrency(reportData.profitAndLoss.net_profit)}</strong></div>
                        
                        {/* --- THIS IS THE CRITICAL FIX FOR THE REPORT PAGE --- */}
                        <div className="summary-item receivable">
                            <span>Expected Income (Receivables)</span>
                            <strong title="Total currently owed by all customers">{formatCurrency(reportData.keyMetrics.accounts_receivable)}</strong>
                        </div>
                         <div className="summary-item tax"><span>Net Profit Margin</span><strong>{parseFloat(reportData.keyMetrics.profit_margin).toFixed(2)}%</strong></div>
                    </section>

                    {/* --- Detailed Lists Section --- */}
                    <section className="details-section">
                        <div className="details-card">
                            <header className="card-header">
                                <h3>Product Performance</h3>
                                <button onClick={() => setShowAllItems(!showAllItems)}>{showAllItems ? 'Show Top 10' : 'Show All'}</button>
                            </header>
                            <div className="table-wrapper">
                                <table className="details-table">
                                    <thead><tr><th>Product</th><th>Units Sold</th><th>Revenue</th><th>Profit</th></tr></thead>
                                    <tbody>
                                        {itemsToShow && itemsToShow.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.product_name}</td>
                                                <td>{item.units_sold}</td>
                                                <td>{formatCurrency(item.revenue)}</td>
                                                <td className={parseFloat(item.profit) >= 0 ? 'profit-amount' : 'loss-amount'}>{formatCurrency(item.profit)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* --- NEW: Items Purchased Card --- */}
                        {/* This card will only render if the business has purchased items (e.g., Scrapyard) */}
                        {reportData.detailedLists.top_purchased_products && reportData.detailedLists.top_purchased_products.length > 0 && (
                            <div className="details-card">
                                <header className="card-header">
                                    <h3>Product Performance (Purchases)</h3>
                                    <button onClick={() => setShowAllPurchases(!showAllPurchases)}>{showAllPurchases ? 'Show Top 10' : 'Show All'}</button>
                                </header>
                                <div className="table-wrapper">
                                    <table className="details-table">
                                        <thead><tr><th>Material</th><th>Total Weight (kg)</th><th>Total Payout</th></tr></thead>
                                        <tbody>
                                            {reportData.detailedLists.top_purchased_products.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{item.product_name}</td>
                                                    <td>{parseFloat(item.total_weight).toFixed(2)}</td>
                                                    <td className="expense-amount">{formatCurrency(item.total_payout)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="details-card">
                             <header className="card-header">
                                <h3>Customer Breakdown</h3>
                                <button onClick={() => setShowAllCustomers(!showAllCustomers)}>{showAllCustomers ? 'Show Top 10' : 'Show All'}</button>
                            </header>
                            <div className="table-wrapper">
                                 <table className="details-table">
                                     <thead><tr><th>Customer</th><th>Total Revenue</th><th>Current Balance</th></tr></thead>
                                    <tbody>
                                         {customersToShow && customersToShow.map((cust, index) => (
                                            <tr key={index}>
                                                <td>{cust.customer_name}</td>
                                                <td>{formatCurrency(cust.total_revenue)}</td>
                                                <td className={parseFloat(cust.account_balance) > 0 ? 'loss-amount' : ''}>{formatCurrency(cust.account_balance)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </main>
            )}
        </div>
    );
};

export default ReportsPage;