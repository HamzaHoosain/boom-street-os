// frontend/src/components/pos/PaymentModal.js

import React from 'react';
import './PaymentModal.css';

// The component now only receives `safes` as a prop for payment options
const PaymentModal = ({ totalAmount, onProcessPayment, onProcessAccountCharge, onClose, selectedCustomer, safes }) => {

    const handlePayment = (paymentData) => {
        onProcessPayment(paymentData);
    };
    
    // Dynamically separate safes into physical tills and bank accounts
    const physicalTills = safes.filter(s => s.is_physical_cash === true);
    const bankAccounts = safes.filter(s => s.is_physical_cash === false);

    const canChargeToCustomerAccount = selectedCustomer && selectedCustomer.id;

    return (
        <div className="payment-modal">
            <h2>Finalize Sale</h2>
            <div className="payment-total">
                Total Due: <strong>R {totalAmount.toFixed(2)}</strong>
            </div>
            <div className="payment-options">
                <h4>Select Payment Method:</h4>

                <button 
                    className="btn-payment account" 
                    onClick={() => handlePayment({ method: 'ON_ACCOUNT' })}
                    disabled={!canChargeToCustomerAccount}
                    title={!canChargeToCustomerAccount ? "Assign a customer to the sale first" : ""}
                >
                    Charge to Customer Account
                </button>
                <button className="btn-payment account" onClick={onProcessAccountCharge}>
                    Charge to Business Account
                </button>
                <hr className="payment-divider"/>

                <h4>Cash:</h4>
                {physicalTills.map(till => (
                    <button 
                        key={`cash-${till.id}`}
                        className="btn-payment cash" 
                        onClick={() => handlePayment({ method: 'CASH', safe_id: till.id })}
                    >
                        Cash (to {till.name})
                    </button>
                ))}

                {/* Render Card & EFT options for EVERY bank account */}
                {bankAccounts.map(account => (
                    <React.Fragment key={`account-${account.id}`}>
                        <h4>{account.name}:</h4>
                        <button
                            className="btn-payment card-generic"
                            onClick={() => handlePayment({ method: 'CARD', safe_id: account.id, terminal_name: `${account.name} Card` })}
                        >
                            Card (to {account.name})
                        </button>
                        <button
                            className="btn-payment eft-generic"
                            onClick={() => handlePayment({ method: 'EFT', safe_id: account.id, terminal_name: `${account.name} EFT` })}
                        >
                            EFT (to {account.name})
                        </button>
                    </React.Fragment>
                ))}

            </div>
            <button onClick={onClose} className="btn-close-modal">Cancel</button>
        </div>
    );
};

export default PaymentModal;