// frontend/src/components/pos/PaymentModal.js - FINAL VERIFIED CODE
import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import './PaymentModal.css';

const PaymentModal = ({ totalAmount, onProcessPayment, onClose }) => {
    const [terminals, setTerminals] = useState([]);
    const [safes, setSafes] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [terminalsRes, safesRes] = await Promise.all([
                    api.get('/terminals'),
                    api.get('/cash/safes')
                ]);
                setTerminals(terminalsRes.data);
                setSafes(safesRes.data);
            } catch (error) {
                console.error("Failed to fetch payment options", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handlePayment = (method, options = {}) => {
        const paymentData = {
            method,
            ...options
        };
        onProcessPayment(paymentData);
    };
    
    // Find specific safes and terminals by their exact name for reliable mapping
    const mainTill = safes.find(s => s.name === 'Main Paintshop Till');
    const nedbankAccount = safes.find(s => s.name === 'Nedbank Account');
    const capitecAccount = safes.find(s => s.name === 'Capitec Account');
    
    const nedbankTerminal = terminals.find(t => t.name === 'Nedbank Speedpoint');
    const capitecTerminal = terminals.find(t => t.name === 'Capitec Speedpoint');

    if (loading) {
        return <p>Loading payment options...</p>;
    }

    return (
        <div className="payment-modal">
            <h2>Finalize Sale</h2>
            <div className="payment-total">
                Total Due: <strong>R {totalAmount.toFixed(2)}</strong>
            </div>
            <div className="payment-options">
                <h4>Select Payment Method:</h4>

                {mainTill && (
                    <button className="btn-payment cash" onClick={() => handlePayment('CASH', { safe_id: mainTill.id })}>
                        Cash (to Main Till)
                    </button>
                )}
                
                {nedbankAccount && nedbankTerminal && (
                    <button 
                        className="btn-payment card-nedbank"
                        onClick={() => handlePayment('CARD', { 
                            safe_id: nedbankAccount.id, 
                            terminal_name: nedbankTerminal.name 
                        })}
                    >
                        Nedbank Speedpoint
                    </button>
                )}
                {nedbankAccount && (
                     <button 
                        className="btn-payment eft-nedbank"
                        onClick={() => handlePayment('EFT', { safe_id: nedbankAccount.id, terminal_name: 'Nedbank EFT' })}
                    >
                        EFT (to Nedbank)
                    </button>
                )}

                {capitecAccount && capitecTerminal && (
                    <button 
                        className="btn-payment card-capitec"
                        onClick={() => handlePayment('CARD', { 
                            safe_id: capitecAccount.id, 
                            terminal_name: capitecTerminal.name 
                        })}
                    >
                        Capitec Speedpoint
                    </button>
                )}
                {capitecAccount && (
                     <button 
                        className="btn-payment eft-capitec"
                        onClick={() => handlePayment('EFT', { safe_id: capitecAccount.id, terminal_name: 'Capitec EFT' })}
                    >
                        EFT (to Capitec)
                    </button>
                )}
            </div>
            <button onClick={onClose} className="btn-close-modal">Cancel</button>
        </div>
    );
};

export default PaymentModal;