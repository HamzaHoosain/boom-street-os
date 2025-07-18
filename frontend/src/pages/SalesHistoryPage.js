// frontend/src/pages/SalesHistoryPage.js - VERIFIED
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../components/inventory/Inventory.css';

const SalesHistoryPage = () => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        const fetchSales = async () => {
            if (!selectedBusiness) return;
            setLoading(true);

            try {
                // If business_unit_id exists, fetch for that specific unit.
                // Otherwise, it's the overview, so we send the special 'overview' keyword.
                const endpoint = selectedBusiness.business_unit_id
                    ? `/sales/${selectedBusiness.business_unit_id}`
                    : '/sales/overview';

                const response = await api.get(endpoint);
                setSales(response.data);
            } catch (err) {
                setError('Failed to fetch sales history.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSales();
    }, [selectedBusiness]);

    const handleViewInvoice = (saleId, saleType) => {
        // We can only view invoices for 'Retail' sales for now.
        if (saleType === 'Retail') {
            window.open(`/invoice/${saleId}`, '_blank');
        } else {
            alert('Invoice preview is not available for this sale type.');
        }
    };

    if (loading) return <p>Loading sales history...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    const isOverview = !selectedBusiness.business_unit_id;

    return (
        <div>
            <h1>Sales History for {selectedBusiness.business_unit_name}</h1>
            <table className="inventory-table">
                <thead>
                    <tr>
                        {isOverview && <th>Business Unit</th>}
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Sale Type</th>
                        <th>Customer</th>
                        <th>Cashier</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    {sales.length > 0 ? sales.map(sale => (
                        <tr key={`${sale.sale_type}-${sale.id}`} onClick={() => handleViewInvoice(sale.id, sale.sale_type)} style={{ cursor: 'pointer' }}>
                            {isOverview && <td>{sale.business_unit_name}</td>}
                            <td>{sale.id}</td>
                            <td>{new Date(sale.sale_date).toLocaleString()}</td>
                            <td><span className={`sale-type-badge ${sale.sale_type}`}>{sale.sale_type}</span></td>
                            <td>{sale.customer_name || 'N/A'}</td>
                            <td>{sale.cashier_name}</td>
                            <td>R {parseFloat(sale.total_amount).toFixed(2)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={isOverview ? 7 : 6} style={{ textAlign: 'center' }}>No sales found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default SalesHistoryPage;