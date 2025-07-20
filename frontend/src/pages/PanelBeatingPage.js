// frontend/src/pages/PanelBeatingPage.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css'; // Reuse table style

const AddJobForm = ({ onSave, onClose }) => {
    const [customerName, setCustomerName] = useState('');
    const [vehicleDetails, setVehicleDetails] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await onSave({ customer_name: customerName, vehicle_details: vehicleDetails });
            onClose();
        } catch (error) {
            alert('Failed to create job card.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="form-group">
                <label>Customer Name</label>
                <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Vehicle Details (e.g., White Toyota Hilux - CA 123-456)</label>
                <input type="text" value={vehicleDetails} onChange={e => setVehicleDetails(e.target.value)} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Create Job Card</button>
        </form>
    );
};


const PanelBeatingPage = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const fetchJobs = async () => {
        setLoading(true);
        try {
            // We need to create this backend route next
            const response = await api.get('/panelbeating/jobs');
            setJobs(response.data);
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, []);

    const handleSaveJob = async (jobData) => {
        try {
            await api.post('/panelbeating/jobs', jobData);
            fetchJobs(); // Refresh the list after creating a new job
        } catch (error) {
            console.error("Failed to save job", error);
            throw error;
        }
    };

    if (loading) return <p>Loading job cards...</p>;

    return (
        <div>
            <h1>Panel Beating Workshop</h1>
            <div style={{ margin: '2rem 0' }}>
                <button onClick={() => setShowModal(true)} className="btn-login" style={{maxWidth: '250px'}}>
                    Create New Job Card
                </button>
            </div>

            <Modal show={showModal} onClose={() => setShowModal(false)} title="Create New Job Card">
                <AddJobForm onSave={handleSaveJob} onClose={() => setShowModal(false)} />
            </Modal>

            <table className="inventory-table">
                <thead>
                    <tr>
                        <th>Job ID</th>
                        <th>Customer</th>
                        <th>Vehicle</th>
                        <th>Status</th>
                        <th>Date Created</th>
                    </tr>
                </thead>
                <tbody>
                    {jobs.map(job => (
                        <tr key={job.id} style={{cursor: 'pointer'}}>
                            <td>{job.id}</td>
                            <td>{job.customer_name}</td>
                            <td>{job.vehicle_details}</td>
                            <td><span className={`status-badge ${job.status.replace(/\s+/g, '-').toLowerCase()}`}>{job.status}</span></td>
                            <td>{new Date(job.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PanelBeatingPage;