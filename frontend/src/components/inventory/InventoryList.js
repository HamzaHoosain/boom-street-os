// frontend/src/components/inventory/InventoryList.js

import React from 'react';

const InventoryList = ({ products, onEdit, onDelete, categories = [] }) => {
    const categoryMap = categories.reduce((acc, cat) => {
        acc[cat.id] = cat.name;
        return acc;
    }, {});

    return (
        <table className="inventory-table">
            <thead>
                <tr>
                    <th>SKU</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Qty on Hand</th>
                    <th>Cost Price</th>
                    <th>Selling Price</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                {products.map(product => (
                    <tr key={product.id}>
                        <td>{product.sku || 'N/A'}</td>
                        <td>{product.name}</td>
                        <td>
                            {product.category_id 
                                ? <span className="type-badge">{categoryMap[product.category_id] || 'Unknown'}</span> 
                                : 'N/A'}
                        </td>
                        <td>{product.quantity_on_hand}</td>
                        <td>R {parseFloat(product.cost_price).toFixed(2)}</td>
                        <td>R {parseFloat(product.selling_price).toFixed(2)}</td>
                        <td className="actions-cell">
                            <button onClick={() => onEdit(product)} className="btn-edit">Edit</button>
                            <button onClick={() => onDelete(product.id)} className="btn-delete">Delete</button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default InventoryList;