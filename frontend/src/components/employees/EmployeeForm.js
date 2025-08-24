// frontend/src/components/employees/EmployeeForm.js

import React, { useState, useEffect } from 'react';
import api from '../../services/api';

// This is the complete, reusable form component.
const EmployeeForm = ({ onSave, employee, onClose }) => {
    const [formData, setFormData] = useState({
        user_id: employee?.user_id || '',
        business_unit_id: employee?.business_unit_id || '',
        hourly_rate: employee?.hourly_rate || '',
        default_hours_per_period: employee?.default_hours_per_period || ''
    });
    const [availableUsers, setAvailableUsers] = useState([]);
    const [businessUnits, setBusinessUnits] = useState([]);

    useEffect(() => {
        api.get('/business-units').then(res => setBusinessUnits(res.data));
        
        // Only fetch available users if we are CREATING a new employee
        if (!employee) {
            api.get('/payroll/available-users').then(res => setAvailableUsers(res.data));
        }
    }, [employee]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            {!employee && (
                <div className="form-group">
                    <label>Select User Account</label>
                    <select name="user_id" value={formData.user_id} onChange={handleChange} className="form-control" required>
                        <option value="">-- Select a User --</option>
                        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
                    </select>
                </div>
            )}
            <div className="form-group">
                <label>Assign to Business Unit</label>
                <select name="business_unit_id" value={formData.business_unit_id} onChange={handleChange} className="form-control" required>
                    <option value="">-- Select Business --</option>
                    {businessUnits.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Rate (R/hr or Salary)</label>
                <input type="number" step="0.01" name="hourly_rate" value={formData.hourly_rate} onChange={handleChange} className="form-control" required />
            </div>
            <div className="form-group">
                <label>Default Hours/Pay Period</label>
                <input type="number" step="0.01" name="default_hours_per_period" value={formData.default_hours_per_period} onChange={handleChange} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Save Employee</button>
        </form>
    );
};

export default EmployeeForm;