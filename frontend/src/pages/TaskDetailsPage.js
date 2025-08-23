import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

// --- NEW: We will import our specialized action modals here ---
import PaintMixingModal from '../components/tasks/PaintMixingModal';
import PickingChecklist from '../components/tasks/PickingChecklist';

import Modal from '../components/layout/Modal';
import './TaskDetailsPage.css';

const TaskDetailsPage = () => {
    const { taskId } = useParams();
    const navigate = useNavigate();

    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // --- State to control which, if any, action modal is open ---
    const [activeModal, setActiveModal] = useState(null); // e.g., 'mixing', 'delivery'

    // This fetching logic is simple and correct
    useEffect(() => {
        const fetchTask = async () => {
            setLoading(true);
            try {
                const response = await api.get(`/tasks/${taskId}`);
                setTask(response.data);
            } catch (err) { setError("Failed to load task details."); }
            finally { setLoading(false); }
        };
        fetchTask();
    }, [taskId]);
    
    // --- NEW: Handler to mark the main task as "Completed" ---
    // This is for simple tasks or the final step in a multi-part workflow.
    const handleCompleteTask = async () => {
        if (!window.confirm("Are you sure you want to mark this task as complete?")) return;
        
        try {
            // Using a simple endpoint for now. It can be made more complex later.
            await api.put(`/tasks/${task.id}/status`, { status: 'Completed' });
            alert("Task completed!");
            navigate('/tasks');
        } catch(err) {
            alert("Error updating task status.");
        }
    };
    
    // --- This function renders the context-specific action UI ---
    const renderActionSection = () => {
        if (!task) return null;

        switch (task.source_type) {
            case 'sale_item': // This is our paint mixing task
                return (
                    <div className="task-actions">
                        <button onClick={() => setActiveModal('mixing')} className="btn-action primary">
                            Log Ingredients & Complete
                        </button>
                    </div>
                );
            
            case 'sales_order': // This is our picking ticket task
                return (
                    <div className="task-actions">
                        {/* We embed the checklist component directly */}
                        <PickingChecklist taskId={task.id} businessUnitId={task.business_unit_id} />
                    </div>
                );
            
            // Add cases for 'delivery_run', etc. here in the future
                
            default:
                return (
                    <div className="task-actions">
                        <button onClick={handleCompleteTask} className="btn-action">
                            Mark as Complete
                        </button>
                    </div>
                );
        }
    };

    if (loading) return <p>Loading task...</p>;
    if (error) return <p className="alert-error">{error}</p>;

    return (
        <div className="task-details-page">
            <Link to="/tasks" className="back-link">← Back to My Tasks</Link>
            <h1>{task?.title}</h1>
            <p className="task-page-description">{task?.description}</p>
            
            {/* The main action area is now dynamic */}
            {renderActionSection()}
            
            {/* --- Modals for specialized actions --- */}
            {activeModal === 'mixing' && task &&
                <Modal show={true} onClose={() => setActiveModal(null)} title={`Log Ingredients for ${task.title}`}>
                    <PaintMixingModal 
                        task={task}
                        onClose={() => setActiveModal(null)}
                    />
                </Modal>
            }
        </div>
    );
};

export default TaskDetailsPage;