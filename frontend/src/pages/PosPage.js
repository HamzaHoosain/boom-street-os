// frontend/src/pages/PosPage.js

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

import ProductList from '../components/pos/ProductList';
import Cart from '../components/pos/Cart';
import PosCategoryDropdown from '../components/pos/PosCategoryDropdown';
import CustomerSelect from '../components/pos/CustomerSelect';
import SupplierSelect from '../components/pos/SupplierSelect';
import CustomerSearchModal from '../components/pos/CustomerSearchModal';
import SupplierSearchModal from '../components/pos/SupplierSearchModal';
import Modal from '../components/layout/Modal';
import PaymentModal from '../components/pos/PaymentModal';
import ChargeToAccountModal from '../components/pos/ChargeToAccountModal';
import SearchBar from '../components/common/SearchBar';
import PosLayout from '../components/pos/PosLayout';
import '../components/pos/Pos.css';

// --- Re-usable Form for the Expense Mode ---
const ExpenseForm = ({ onLogExpense }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [safeId, setSafeId] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState('');
    const [safes, setSafes] = useState([]);
    const [expenseCategories, setExpenseCategories] = useState([]);
    const { selectedBusiness } = useContext(AuthContext);

    useEffect(() => {
        if (selectedBusiness?.business_unit_id) {
            api.get('/cash/safes').then(res => setSafes(res.data));
            api.get('/expenses/categories').then(res => setExpenseCategories(res.data));
        }
    }, [selectedBusiness]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const selectedCategory = expenseCategories.find(c => c.id === parseInt(expenseCategoryId));
        const expenseData = {
            business_unit_id: selectedBusiness.business_unit_id,
            amount: parseFloat(amount),
            description: `${selectedCategory?.name || 'Expense'} - ${description}`,
            safe_id: parseInt(safeId)
        };
        await onLogExpense(expenseData);
        setAmount(''); setDescription(''); setSafeId(''); setExpenseCategoryId('');
    };

    return (
        <div className="expense-form-container">
            <h3>Log a New Expense</h3>
            <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Payment Source</label><select value={safeId} onChange={e => setSafeId(e.target.value)} className="form-control" required><option value="">-- Select Source Till/Account --</option>{safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                <div className="form-group"><label>Expense Category</label><select value={expenseCategoryId} onChange={e => setExpenseCategoryId(e.target.value)} className="form-control" required><option value="">-- Select Category --</option>{expenseCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div className="form-group"><label>Amount (R)</label><input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="form-control" required /></div>
                <div className="form-group"><label>More Details / Notes</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} className="form-control" required /></div>
                <button type="submit" className="btn-log-expense">Log Expense</button>
            </form>
        </div>
    );
};


// --- The Main Page Component ---
const PosPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const navigate = useNavigate();
    const [mode, setMode] = useState('sell');

    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
     const [safes, setSafes] = useState([]);
    //const [terminals, setTerminals] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [payoutSafeId, setPayoutSafeId] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedSupplier, setSelectedSupplier] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showSupplierModal, setShowSupplierModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAccountChargeModal, setShowAccountChargeModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastSaleId, setLastSaleId] = useState(null);
    const [lastPurchaseId, setLastPurchaseId] = useState(null);
    const [customerDetails, setCustomerDetails] = useState({ favourites: [], customPrices: {} });

    const VAT_RATE = 0.15;
    const availableModes = [];
    if (selectedBusiness?.type?.includes('Retail')) availableModes.push('sell');
    if (selectedBusiness?.type === 'Bulk Inventory') availableModes.push('buy');
    if (selectedBusiness) availableModes.push('expense');

    const resetState = () => {
        setError(''); setSuccess(''); setCartItems([]); setProducts([]);
        setFilteredProducts([]); setCategories([]); setSuppliers([]);
        setSelectedCategoryId(null); setLastSaleId(null); setLastPurchaseId(null);
        setSelectedCustomer(null); setSelectedSupplier(null);
        setPayoutSafeId(''); setSearchTerm('');
        setCustomerDetails({ favourites: [], customPrices: {} });
    };
    
     useEffect(() => {
        let defaultMode = selectedBusiness?.type === 'Bulk Inventory' ? 'buy' : 'sell';
        setMode(defaultMode);

        if (selectedBusiness?.business_unit_id) {
            resetState();
            const fetchData = async () => {
                setError('');
                try {
                    const productsRes = await api.get(`/products/${selectedBusiness.business_unit_id}`);
                    setProducts(productsRes.data);
                    
                    const safesRes = await api.get('/cash/safes');
                    setSafes(safesRes.data);

                    if (selectedBusiness.type === 'Bulk Inventory') { // Scrapyard
                        const suppliersRes = await api.get(`/suppliers?businessUnitId=${selectedBusiness.business_unit_id}`);
                        setSuppliers(suppliersRes.data);
                    } else { // Retail
                        const categoriesRes = await api.get(`/categories/${selectedBusiness.business_unit_id}`);
                        setCategories(categoriesRes.data);
                    }
                } catch (err) {
                    setError('Failed to fetch initial data. Check network and API routes.');
                    console.error("Fetch Data Error:", err);
                }
            };
            fetchData();
        }
    }, [selectedBusiness]);

    // Effect 2 (NEW): Sets the default values for the Scrapyard.
    // This effect runs ONLY when the business changes OR when the safes/suppliers lists are populated.
    useEffect(() => {
        if (selectedBusiness?.type === 'Bulk Inventory' && safes.length > 0 && suppliers.length > 0) {
            const scrapFloat = safes.find(s => s.name.toLowerCase().includes('scrapyard float'));
            if (scrapFloat) {
                setPayoutSafeId(scrapFloat.id);
            }
            
            const walkInSupplier = suppliers.find(s => s.name.toLowerCase().includes('walk-in'));
            if (walkInSupplier) {
                setSelectedSupplier(walkInSupplier);
            }
        }
    }, [selectedBusiness, safes, suppliers]);

    
    useEffect(() => {
        let tempProducts = [...products];
        if (mode === 'sell') {
            if (selectedCategoryId === 'favourites') {
                tempProducts = tempProducts.filter(p => customerDetails.favourites.includes(p.id));
            } else if (selectedCategoryId) {
                tempProducts = tempProducts.filter(p => p.category_id === selectedCategoryId);
            }
        }
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempProducts = tempProducts.filter(p => p.name.toLowerCase().includes(lowercasedTerm));
        }
        setFilteredProducts(tempProducts);
    }, [searchTerm, selectedCategoryId, products, customerDetails.favourites, mode]);

    const handleSelectCustomer = async (customer) => {
        setSelectedCustomer(customer);
        setShowCustomerModal(false);
        if (customer) {
            try {
                const res = await api.get(`/customers/${customer.id}/details`);
                const pricesMap = res.data.customPrices.reduce((acc, priceRule) => {
                    acc[priceRule.product_id] = priceRule.custom_price;
                    return acc;
                }, {});
                setCustomerDetails({
                    favourites: res.data.favouriteProductIds || [],
                    customPrices: pricesMap
                });
            } catch (err) {
                console.error("Failed to fetch customer details:", err);
                setError('Could not load customer-specific data.');
                setCustomerDetails({ favourites: [], customPrices: {} });
            }
        }
    };
    
    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerDetails({ favourites: [], customPrices: {} });
        if (selectedCategoryId === 'favourites') {
            setSelectedCategoryId(null);
        }
    };
    
    const handleSelectSupplier = (supplier) => {
        setSelectedSupplier(supplier);
        setShowSupplierModal(false);
    };

    const handleViewCustomer = () => {
        if (selectedCustomer && selectedCustomer.id) {
            navigate(`/customers/${selectedCustomer.id}`);
        }
    };

    const handleViewSupplier = () => {
        if (selectedSupplier && selectedSupplier.id) {
            navigate(`/suppliers/${selectedSupplier.id}`);
        }
    };

    const handleAddToCart = (product) => {
        setSuccess(''); setLastSaleId(null);
        if (mode === 'buy') { 
            setCartItems(prev => [...prev, { ...product, quantity: 1, cartId: Date.now() }]); 
            return; 
        }
        const customPrice = customerDetails.customPrices[product.id];
        const priceToUse = customPrice !== undefined ? customPrice : product.selling_price;
        setCartItems(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) { 
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item); 
            }
            return [...prev, { ...product, quantity: 1, selling_price: parseFloat(priceToUse) || 0, cartId: Date.now() }];
        });
    };
    
    const handleRemoveFromCart = (itemToRemove) => {
        setCartItems(prev => prev.filter(item => item.cartId !== itemToRemove.cartId));
    };

    const handleUpdatePrice = (cartId, newPrice) => {
        const price = parseFloat(newPrice);
        setCartItems(prev => prev.map(item => item.cartId === cartId ? { ...item, selling_price: isNaN(price) ? 0 : price } : item ));
    };

    const handleQuantityChange = (cartId, newQuantity) => {
        const quantity = parseFloat(newQuantity);
        setCartItems(prev => prev.map(item => item.cartId === cartId ? { ...item, quantity: isNaN(quantity) ? 0 : quantity } : item ));
    };
    
    const handleProcess = () => {
        if (cartItems.length === 0) { setError("Cart is empty."); return; }
        if (mode === 'buy') { handleProcessPayout(); } 
        else { setShowPaymentModal(true); }
    };

    const handleProcessSale = async (paymentData) => {
        setShowPaymentModal(false);
        setError(''); setSuccess('');
        const saleData = {
            business_unit_id: selectedBusiness.business_unit_id,
            cart_items: cartItems.map(item => ({ id: item.id, quantity: item.quantity, selling_price: parseFloat(item.selling_price) || 0 })),
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            payment: paymentData
        };
        try {
            const response = await api.post('/sales', saleData);
            setSuccess(`Sale #${response.data.saleId} processed successfully!`);
            setLastSaleId(response.data.saleId);
            setCartItems([]);
            handleClearCustomer();
        } catch (err) {
            setError((err.response?.data?.msg) || 'Sale failed to process.');
        }
    };

    const handleProcessPayout = async () => {
        setError(''); setSuccess('');
        setLastSaleId(null); setLastPurchaseId(null);
        if (!payoutSafeId) { setError('A payout source must be selected.'); return; }
        const payload = {
            supplier_id: selectedSupplier ? selectedSupplier.id : null,
            business_unit_id: selectedBusiness.business_unit_id,
            purchase_items: cartItems.map(item => ({ product_id: item.id, weight_kg: item.quantity })),
            safe_id: parseInt(payoutSafeId)
        };
        try {
            const response = await api.post('/scrapyard/buy', payload);
            setSuccess(`Payout of R ${response.data.total_payout.toFixed(2)} processed successfully!`);
            setLastPurchaseId(response.data.purchaseId);
            setCartItems([]);
            setSelectedSupplier(null);
        } catch (err) {
            setError((err.response?.data?.msg) || 'Payout failed to process.');
        }
    };
    
    const handleLogExpense = async (expenseData) => {
        setError(''); setSuccess('');
        try {
            await api.post('/expenses', expenseData);
            setSuccess(`Expense of R ${expenseData.amount.toFixed(2)} logged successfully.`);
        } catch (err) {
            setError((err.response?.data?.msg) || 'Failed to log expense.');
        }
    };

    const handleProcessAccountCharge = async (receivingUnitId) => {
        setShowAccountChargeModal(false);
        setShowPaymentModal(false);
        setError(''); setSuccess('');
        try {
            const chargeData = {
                business_unit_id: selectedBusiness.business_unit_id,
                cart_items: cartItems.map(item => ({ id: item.id, quantity: item.quantity, selling_price: parseFloat(item.selling_price) || 0 })),
                payment: { method: 'INTERNAL_CHARGE', receiving_unit_id: receivingUnitId }
            };
            const response = await api.post('/sales', chargeData);
            setSuccess(`Successfully charged out items for Sale #${response.data.saleId}.`);
            setCartItems([]);
            handleClearCustomer();
        } catch (err) {
            setError((err.response?.data?.msg) || `Failed to process charge out.`);
        }
    };

    const grandTotal = cartItems.reduce((total, item) => total + (parseFloat(item.selling_price) || 0) * (parseFloat(item.quantity) || 0), 0);
    const subtotalPreVat = grandTotal / (1 + VAT_RATE);
    const totalVatAmount = grandTotal - subtotalPreVat;
    const buyModeTotal = cartItems.reduce((total, item) => total + (parseFloat(item.cost_price) || 0) * (parseFloat(item.quantity) || 0), 0);
    const isBuyMode = mode === 'buy';

    if (!selectedBusiness || !selectedBusiness.business_unit_id) {
        return ( <div><h1>Terminal</h1><p>Please select a specific business unit.</p></div> );
    }

    const mainContentPanel = (
        <div className="pos-panel main-product-panel">
            <div className="pos-controls-wrapper">
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder={isBuyMode ? "Search materials..." : "Search products..."}/>
                {!isBuyMode && <PosCategoryDropdown categories={categories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} customerHasFavourites={customerDetails.favourites.length > 0} />}
            </div>
            <ProductList products={filteredProducts} onAddToCart={handleAddToCart} isBuyMode={isBuyMode} customPrices={customerDetails.customPrices}/>
        </div>
    );

    const rightPanelContent = (
        <div className="pos-panel cart-customer-panel">
            {!isBuyMode && 
                <CustomerSelect 
                    selectedCustomer={selectedCustomer} 
                    onSelectCustomer={() => setShowCustomerModal(true)} 
                    onClearCustomer={handleClearCustomer}
                    onViewCustomer={handleViewCustomer}
                />
            }
            {isBuyMode && (
                <>
                    <SupplierSelect 
                        selectedSupplier={selectedSupplier} 
                        onSelectSupplier={() => setShowSupplierModal(true)} 
                        onClearSupplier={() => setSelectedSupplier(null)}
                        onViewSupplier={handleViewSupplier}
                    />
                    <div className="payout-source-selector">
                        <h4>Payout Source</h4>
                        <select value={payoutSafeId} onChange={e => setPayoutSafeId(e.target.value)} className="form-control" required>
                            <option value="">-- Select a Till/Float --</option>
                            {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                </>
            )}
            <Cart cartItems={cartItems} onRemoveFromCart={handleRemoveFromCart} onProcessSale={handleProcess} onQuantityChange={handleQuantityChange} onUpdatePrice={handleUpdatePrice} isBuyMode={isBuyMode} subtotalPreVat={isBuyMode ? buyModeTotal : subtotalPreVat} totalVatAmount={totalVatAmount} grandTotal={grandTotal} vatRate={VAT_RATE} />
        </div>
    );

    return (
        <div className="pos-page-wrapper">
            <div className="pos-page-header-row">
                <h1>{selectedBusiness.business_unit_name} Terminal</h1>
                <div className="mode-selector">
                    {availableModes.map(m => ( <button key={m} onClick={() => setMode(m)} className={mode === m ? 'active' : ''}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>))}
                </div>
            </div>
            {error && <p className="alert-error">{error}</p>}
            {success && (
                <div className="alert-success">
                    <span>{success}</span>
                    {lastSaleId && mode === 'sell' && (
                        <a href={`/invoice/${lastSaleId}`} target="_blank" rel="noopener noreferrer" className="btn-print">
                            Print Invoice
                        </a>
                    )}
                    {lastPurchaseId && mode === 'buy' && (
                        <a href={`/remittance/${lastPurchaseId}`} target="_blank" rel="noopener noreferrer" className="btn-print">
                            Print Remittance
                        </a>
                    )}
                </div>
            )}
            
            {mode === 'expense' ? ( <ExpenseForm onLogExpense={handleLogExpense} /> ) : ( 
                <PosLayout 
                    leftPanel={null}
                    mainContent={mainContentPanel}
                    rightPanel={rightPanelContent}
                /> 
            )}
            
            <Modal show={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Select a Customer">
                <CustomerSearchModal onSelect={handleSelectCustomer} onClose={() => setShowCustomerModal(false)} selectedBusiness={selectedBusiness} />
            </Modal>
            <Modal show={showSupplierModal} onClose={() => setShowSupplierModal(false)} title="Select a Supplier">
                <SupplierSearchModal onSelect={handleSelectSupplier} onClose={() => setShowSupplierModal(false)} selectedBusiness={selectedBusiness} />
            </Modal>
           <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
                <PaymentModal 
                    totalAmount={grandTotal} 
                    onProcessPayment={handleProcessSale} 
                    onProcessAccountCharge={() => setShowAccountChargeModal(true)} 
                    onClose={() => setShowPaymentModal(false)} 
                    selectedCustomer={selectedCustomer}
                    safes={safes} // Pass safes
                    // terminals={terminals} // REMOVED
                />
            </Modal>
            <Modal show={showAccountChargeModal} onClose={() => setShowAccountChargeModal(false)} title="Charge to Business Account">
                <ChargeToAccountModal onCharge={handleProcessAccountCharge} onClose={() => setShowAccountChargeModal(false)} />
            </Modal>
        </div>
    );
};

export default PosPage;