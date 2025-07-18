import React from 'react';
import { useNavigate } from 'react-router-dom';

const InventoryList = ({ products }) => {
    const navigate = useNavigate();

    const handleRowClick = (productId) => {
        // Navigate to the dedicated page for editing this specific product
        navigate(`/inventory/edit/${productId}`);
    };

    // --- NEW LOGIC TO DETECT OVERVIEW MODE ---
    // We check if the first product in the list has the 'business_unit_name' property.
    // Our new overview API endpoint is the only one that adds this property.
    // We also check if there are any products to avoid errors on an empty list.
    const isOverview = products.length > 0 && products[0].business_unit_name;

    return (
        <table className="inventory-table">
            <thead>
                <tr>
                    {/* Conditionally render the "Business Unit" header only in overview mode */}
                    {isOverview && <th>Business Unit</th>}
                    
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Qty on Hand</th>
                    <th>Cost Price (Excl.)</th>
                    <th>Selling Price</th>
                </tr>
            </thead>
            <tbody>
                {products.length > 0 ? (
                    products.map((product) => (
                        <tr key={product.id} onClick={() => handleRowClick(product.id)} style={{ cursor: 'pointer' }}>
                            {/* Conditionally render the business unit name cell for each product */}
                            {isOverview && <td>{product.business_unit_name}</td>}
                            
                            <td>{product.sku}</td>
                            <td>{product.name}</td>
                            <td>{parseFloat(product.quantity_on_hand).toFixed(2)}</td>
                            <td>R {parseFloat(product.cost_price).toFixed(2)}</td>
                            <td>R {parseFloat(product.selling_price).toFixed(2)}</td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        {/* Adjust the column span based on whether we are in overview mode */}
                        <td colSpan={isOverview ? 6 : 5} style={{ textAlign: 'center' }}>
                            No products found.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

export default InventoryList;