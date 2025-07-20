// frontend/src/components/pos/JobDetails.js
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const JobDetails = ({ job, onUpdate }) => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        // Fetch the items for this job whenever a new job is selected
        if (job) {
            // We need a new backend endpoint for this
            api.get(`/panelbeating/jobs/${job.id}/items`).then(res => {
                setItems(res.data);
            });
        }
    }, [job]);

    if (!job) {
        return <div className="cart"><h3>Select a Job Card</h3><p>Please select a job from the list on the left to view its details and add parts.</p></div>;
    }

    const totalCost = items.reduce((total, item) => total + (item.quantity_used * item.cost_at_time_of_use), 0);

    return (
        <div className="cart">
            <h3>Details for Job #{job.id}</h3>
            <div className="job-info">
                <p><strong>Customer:</strong> {job.customer_name}</p>
                <p><strong>Vehicle:</strong> {job.vehicle_details}</p>
            </div>
            <h4>Parts Used</h4>
            <ul className="cart-items">
                {items.map(item => (
                    <li key={item.id}>
                        <span>{item.product_name} (x{item.quantity_used})</span>
                        <span>R {(item.quantity_used * item.cost_at_time_of_use).toFixed(2)}</span>
                    </li>
                ))}
            </ul>
            <div className="cart-total">
                <strong>Total Job Cost: R {totalCost.toFixed(2)}</strong>
            </div>
        </div>
    );
};
export default JobDetails;