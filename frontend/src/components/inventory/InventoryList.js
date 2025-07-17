// frontend/src/components/inventory/InventoryList.js
import React from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const InventoryList = ({ products }) => {
    const navigate = useNavigate(); // Initialize the hook

    const handleRowClick = (productId) => {
        navigate(`/inventory/edit/${productId}`); // Navigate to the edit page
    };

    return (
        <table className="inventory-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Qty on Hand</th>
                    <th>Cost Price (Excl.)</th>
                    <th>Selling Price</th>
                </tr>
            </thead>
            <tbody>
                {products.map((product) => (
                    // Add the onClick handler to each row
                    <tr key={product.id} onClick={() => handleRowClick(product.id)} style={{ cursor: 'pointer' }}>
                        <td>{product.sku}</td>
                        <td>{product.name}</td>
                        <td>{parseFloat(product.quantity_on_hand).toFixed(2)}</td>
                        <td>R {parseFloat(product.cost_price).toFixed(2)}</td>
                        <td>R {parseFloat(product.selling_price).toFixed(2)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default InventoryList;