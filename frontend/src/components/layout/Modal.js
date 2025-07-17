// frontend/src/components/layout/Modal.js
import React from 'react';
import './Modal.css'; // We'll create this next

const Modal = ({ show, onClose, title, children }) => {
    if (!show) {
        return null;
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-content">
                <div className="modal-header">
                    <h4 className="modal-title">{title}</h4>
                    <button onClick={onClose} className="btn-close">×</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;