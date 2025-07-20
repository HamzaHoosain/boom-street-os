// frontend/src/pages/ExpensesPage.js
import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Modal from '../components/layout/Modal';
import '../components/inventory/Inventory.css'; // We can reuse the table style for consistency

// --- This is the form that will live inside the modal ---
const AddExpenseForm = ({ onSave, onClose, selectedBusiness }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [safeId, setSafeId] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState('');
    const [safes, setSafes] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch the data needed to populate the form's dropdowns
        const fetchDataForForm = async () => {
            try {
                const [safesRes, categoriesRes] = await Promise.all([
                    api.get('/cash/safes'),
                    api.get('/expenses/categories')
                ]);
                setSafes(safesRes.data);
                setExpenseCategories(categoriesRes.data);
            } catch (error) {
                console.error("Could not load data for expense form", error);
                setError("Could not load form options.");
            }
        };
        fetchDataForForm();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const selectedCategory = expenseCategories.find(c => c.id === parseInt(expenseCategoryId));
            const expenseData = {
                business_unit_id: selectedBusiness.business_unit_id,
                amount: parseFloat(amount),
                description: `${selectedCategory?.name || 'Expense'} - ${description}`,
                safe_id: parseInt(safeId)
            };
            await onSave(expenseData); // This calls the function passed down from the parent
        } catch (err) {
            setError('Failed to save expense. Please try again.');
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <p className="alert-error">{error}</p>}
            <div className="form-group">
                <label>Payment Source (Which till/account was used?)</label>
                <select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Source --</option>
                    {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div className="form-group">
                <label>Expense Category</label>
                <select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)} className="form-control" required>
                    <option value="">-- Select Category --</option>
                    {expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div className="form-group">
                <label>Amount (R)</label>
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required />
            </div>
            <div className="form-group">
                <label>More Details / Notes</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="form-control" required />
            </div>
            <button type="submit" className="btn-login" style={{marginTop: '1rem'}}>Save Expense</button>
        </form>
    );
};


// --- This is the main page component ---
const ExpensesPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const [showModal, setShowModal] = useState(false);

    const handleSaveExpense = async (expenseData) => {
        try {
            await api.post('/expenses', expenseData);
            setShowModal(false);
            // We can add a global success message/toast notification here in the future
        } catch (error) {
            alert("Failed to save expense. The server responded with an error.");
            console.error(error);
            // Re-throw the error to allow the form to display a message
            throw error;
        }
    };
    
    // We can only add an expense if a specific business is selected, not in "Overview" mode
    const canAddExpense = selectedBusiness && selectedBusiness.business_unit_id;

    return (
        <div>
            <h1>Expense Management</h1>
            <p>Use this section to log general business expenses like utilities, fuel, or daily staff advances.</p>
            
            {canAddExpense ? (
                <div style={{ margin: '2rem 0' }}>
                    <button onClick={() => setShowModal(true)} className="btn-login" style={{maxWidth: '250px'}}>Add New Expense</button>
                </div>
            ) : (
                <p style={{ marginTop: '2rem' }}>Please select a specific business unit from the header to assign an expense to.</p>
            )}

            <Modal show={showModal} onClose={() => setShowModal(false)} title={`Add Expense for ${selectedBusiness?.business_unit_name}`}>
                <AddExpenseForm
                    onSave={handleSaveExpense}
                    onClose={() => setShowModal(false)}
                    selectedBusiness={selectedBusiness}
                />
            </Modal>
            
            <p style={{marginTop: '2rem'}}>
                A full list of all recorded expenses can be viewed in the <strong>Transaction History</strong> page.
            </p>
        </div>
    );
};

export default ExpensesPage;