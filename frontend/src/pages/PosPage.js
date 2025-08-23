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
import PaintMixDetailsModal from '../components/pos/PaintMixDetailsModal';
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
    const [lastQuoteId, setLastQuoteId] = useState(null);
    const [lastPurchaseOrderId, setLastPurchaseOrderId] = useState(null);
    const [lastSalesOrderId, setLastSalesOrderId] = useState(null);
    const [lastPurchaseId, setLastPurchaseId] = useState(null);
    const [customerDetails, setCustomerDetails] = useState({ favourites: [], customPrices: {} });
    const [showMixModal, setShowMixModal] = useState(false);
    const [activeCartItem, setActiveCartItem] = useState(null);

    const VAT_RATE = 0.15;

    const availableModes = [];
    if (selectedBusiness?.type?.includes('Retail')) {
        availableModes.push('sell');
    }
    if (selectedBusiness?.type === 'Bulk Inventory') {
        availableModes.push('buy');
    }
    if (selectedBusiness) {
        availableModes.push('quote', 'sales_order', 'purchase_order', 'expense');
    }
    const resetState = () => {
        setError(''); setSuccess(''); setCartItems([]); setProducts([]);
        setFilteredProducts([]); setCategories([]); setSuppliers([]);
        setSelectedCategoryId(null); setLastSaleId(null); setLastPurchaseId(null);
        setLastQuoteId(null); setLastPurchaseOrderId(null); setLastSalesOrderId(null);
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
                        
                        // --- THIS IS THE CRITICAL FIX ---
                        // OLD, incorrect line:
                        // const suppliersRes = await api.get(`/suppliers/by-business/${selectedBusiness.business_unit_id}`);
                        
                        // NEW, correct line that matches your backend route:
                        const suppliersRes = await api.get(`/suppliers?businessUnitId=${selectedBusiness.business_unit_id}`);
                        // --- END OF FIX ---
                        
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


    useEffect(() => {
        if (selectedBusiness?.type === 'Bulk Inventory' && safes.length > 0 && suppliers.length > 0) {
            const scrapFloat = safes.find(s => s.name.toLowerCase().includes('scrapyard float'));
            if (scrapFloat) { setPayoutSafeId(scrapFloat.id); }
            
            const walkInSupplier = suppliers.find(s => s.name.toLowerCase().includes('walk-in'));
            if (walkInSupplier) { setSelectedSupplier(walkInSupplier); }
        }
    }, [selectedBusiness, safes, suppliers]);
    
    useEffect(() => {
        let tempProducts = [...products];
        if (['sell', 'quote', 'sales_order'].includes(mode)) {
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
                const res = await api.get(`/customers/${customer.id}/details`).catch(() => ({ data: {} }));
                const pricesMap = (res.data.customPrices || []).reduce((acc, priceRule) => {
                    acc[priceRule.product_id] = priceRule.custom_price;
                    return acc;
                }, {});
                setCustomerDetails({
                    favourites: res.data.favouriteProductIds || [],
                    customPrices: pricesMap
                });
            } catch (err) {
                console.error("Could not load customer-specific data:", err);
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
        // **IMPORTANT**: You must find the `id` of your "Mixed Paint - Custom" product in your database
        // and put that number here. I am using 1494 as a placeholder.
        const MIXED_PAINT_PRODUCT_ID = 1495;
        
        const isMixedPaint = product.id === MIXED_PAINT_PRODUCT_ID;

        // Clear any previous success/error messages
        setSuccess('');
        setLastSaleId(null);
        // Reset all other document IDs as well
        setLastPurchaseId(null);
        setLastQuoteId(null);
        setLastPurchaseOrderId(null);
        setLastSalesOrderId(null);

        // --- NEW, ROBUST LOGIC ---
        if (isMixedPaint) {
            // For a mixed paint, we prepare the item but DON'T add it to the cart yet.
            // We set it as the active item and open the modal first.
            const newCartItem = {
                ...product,
                cartId: Date.now(), // Generate a temporary ID
                quantity: 1, // Default, will be updated by modal
                selling_price: parseFloat(product.selling_price) || 0,
                mixDetails: {}
            };
            setActiveCartItem(newCartItem);
            setShowMixModal(true); // Open the modal
        } else {
            // For all standard products, use the original, working logic.
            const newCartItem = {
                ...product,
                cartId: Date.now(),
                quantity: 1,
                selling_price: parseFloat(product.selling_price) || 0
            };

            const customPrice = customerDetails.customPrices[product.id];
            if (customPrice !== undefined) {
                newCartItem.selling_price = parseFloat(customPrice);
            }

            const isQuantityBasedDoc = mode === 'sell' || mode === 'sales_order';

            setCartItems(prev => {
                const exists = prev.find(item => item.id === product.id);
                if (exists && isQuantityBasedDoc) {
                    return prev.map(item => {
                        if (item.id !== product.id) return item;
                        const newQuantity = item.quantity + 1;
                        const lowStockWarning = mode === 'sales_order' && product.quantity_on_hand < newQuantity;
                        return { ...item, quantity: newQuantity, lowStockWarning };
                    });
                }
                return [...prev, newCartItem];
            });
        }
    };
    
    const handleRemoveFromCart = (itemToRemove) => {
        setCartItems(prev => prev.filter(item => item.cartId !== itemToRemove.cartId));
    };

    const handleUpdatePrice = (cartId, newPrice) => {
        const price = parseFloat(newPrice);
        setCartItems(prev => prev.map(item => item.cartId === cartId ? { ...item, selling_price: isNaN(price) ? 0 : price } : item ));
    };

    const handleQuantityChange = (cartId, newQuantityStr) => {
        const newQuantity = parseFloat(newQuantityStr);
        setCartItems(prev => prev.map(item => {
            if (item.cartId !== cartId) return item;
            const lowStockWarning = mode === 'sales_order' && item.quantity_on_hand < newQuantity;
            return { ...item, quantity: isNaN(newQuantity) ? '' : newQuantity, lowStockWarning };
        }));
    };
    
    const handleProcess = async () => {
        if (cartItems.length === 0) { setError("Cart is empty."); return; }
        setError(''); setSuccess('');

        try {
            switch(mode) {
                case 'sell': setShowPaymentModal(true); break;
                case 'buy': await handleProcessPayout(); break;
                case 'quote': await handleSaveQuote(); break;
                case 'purchase_order': await handleSavePurchaseOrder(); break;
                case 'sales_order': await handleSaveSalesOrder(); break;
                default: throw new Error("Invalid POS mode.");
            }
        } catch (err) {
            setError(err.response?.data?.msg || `Failed to process ${mode.replace('_', ' ')}.`);
        }
    };

    const handleProcessSale = async (paymentData) => {
        setShowPaymentModal(false);
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
        } catch (err) {
            setError((err.response?.data?.msg) || 'Payout failed to process.');
        }
    };
    
    const handleLogExpense = async (expenseData) => {
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

      const handleSaveMixDetails = (mixDetails, newPrice) => {
        // Find the original item that was being worked on
        const itemToUpdate = activeCartItem;
        
        // Create the updated item
        const finalCartItem = {
            ...itemToUpdate,
            quantity: parseFloat(mixDetails.quantity),
            mixDetails: mixDetails,
        };

        // If a new total price was entered, calculate the new price per unit
        if (newPrice !== null && newPrice > 0) {
            finalCartItem.selling_price = newPrice / parseFloat(mixDetails.quantity);
        }

        // Add the fully formed item to the cart (this logic is correct)
        // Note: this assumes you add one mixed item at a time, not update existing ones
        setCartItems(prev => [...prev.filter(item => item.cartId !== activeCartItem.cartId), finalCartItem]);

        setShowMixModal(false);
        setActiveCartItem(null);
    };

    const handleSaveQuote = async () => {
        const payload = {
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            business_unit_id: selectedBusiness.business_unit_id,
            items: cartItems.map(item => ({ product_id: item.id, quantity: item.quantity, price_at_quote: item.selling_price }))
        };
        const res = await api.post('/quotes', payload);
        setSuccess(`Quote #${res.data.id} created successfully!`);
        setLastQuoteId(res.data.id);
        setCartItems([]);
        handleClearCustomer();
    };

    const handleSavePurchaseOrder = async () => {
        if (!selectedSupplier) { throw new Error("A supplier must be selected for a Purchase Order."); }
        const payload = {
            supplier_id: selectedSupplier.id,
            business_unit_id: selectedBusiness.business_unit_id,
            items: cartItems.map(item => ({ product_id: item.id, quantity: item.quantity, cost_at_order: item.cost_price }))
        };
        const res = await api.post('/purchase-orders', payload);
        setSuccess(`Purchase Order #${res.data.id} created successfully!`);
        setLastPurchaseOrderId(res.data.id);
        setCartItems([]);
    };

    const handleSaveSalesOrder = async () => {
        const payload = {
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            business_unit_id: selectedBusiness.business_unit_id,
            items: cartItems.map(item => ({ product_id: item.id, quantity: item.quantity, price_at_order: item.selling_price }))
        };
        const res = await api.post('/sales-orders', payload);
        setSuccess(`Sales Order #${res.data.id} created successfully!`);
        setLastSalesOrderId(res.data.id);
        setCartItems([]);
        handleClearCustomer();
    };

    const grandTotal = cartItems.reduce((total, item) => total + (parseFloat(item.selling_price) || 0) * (parseFloat(item.quantity) || 0), 0);
    const subtotalPreVat = grandTotal / (1 + VAT_RATE);
    const totalVatAmount = grandTotal - subtotalPreVat;
    
    // Calculation for cost-based modes (buy, purchase_order)
    const costSubtotal = cartItems.reduce((total, item) => total + (parseFloat(item.cost_price) || 0) * (parseFloat(item.quantity) || 0), 0);
    const costVatAmount = costSubtotal * VAT_RATE;
    const costGrandTotal = costSubtotal + costVatAmount;
    const isBuyMode = mode === 'buy';
    const isCostMode = mode === 'purchase_order' || mode === 'buy';

    if (!selectedBusiness || !selectedBusiness.business_unit_id) {
        return ( <div><h1>Terminal</h1><p>Please select a specific business unit.</p></div> );
    }

    const mainContentPanel = (
        <div className="pos-panel main-product-panel">
            <div className="pos-controls-wrapper">
                <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} placeholder={isBuyMode ? "Search materials..." : "Search products..."}/>
                {['sell', 'quote', 'sales_order'].includes(mode) && <PosCategoryDropdown categories={categories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} customerHasFavourites={customerDetails.favourites.length > 0} />}
            </div>
            <ProductList 
                products={filteredProducts} 
                onAddToCart={handleAddToCart} 
                isCostMode={isCostMode} 
                customPrices={customerDetails.customPrices}
            />
        </div>
    );

    const rightPanelContent = (
        <div className="pos-panel cart-customer-panel">
            {['sell', 'quote', 'sales_order'].includes(mode) && 
                <CustomerSelect 
                    selectedCustomer={selectedCustomer} 
                    onSelectCustomer={() => setShowCustomerModal(true)} 
                    onClearCustomer={handleClearCustomer}
                    onViewCustomer={handleViewCustomer}
                />
            }
            {['buy', 'purchase_order'].includes(mode) && 
                <SupplierSelect 
                    selectedSupplier={selectedSupplier} 
                    onSelectSupplier={() => setShowSupplierModal(true)} 
                    onClearSupplier={() => setSelectedSupplier(null)}
                    onViewSupplier={handleViewSupplier}
                />
            }
            {mode === 'buy' && (
                <div className="payout-source-selector">
                    <h4>Payout Source</h4>
                    <select value={payoutSafeId} onChange={e => setPayoutSafeId(e.target.value)} className="form-control" required>
                        <option value="">-- Select a Till/Float --</option>
                        {safes.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
            )}
            <Cart 
                cartItems={cartItems} 
                onRemoveFromCart={handleRemoveFromCart} 
                onProcess={handleProcess} 
                onQuantityChange={handleQuantityChange} 
                onUpdatePrice={handleUpdatePrice} 
                mode={mode}
                isCostMode={isCostMode}
                subtotalPreVat={isCostMode ? costSubtotal : subtotalPreVat} 
                totalVatAmount={isCostMode ? costVatAmount : totalVatAmount} 
                grandTotal={isCostMode ? costGrandTotal : grandTotal} 
                vatRate={VAT_RATE} 
            
            /> 
        </div>
    );

    return (
        <div className="pos-page-wrapper">
            <div className="pos-page-header-row">
                <h1>{selectedBusiness.business_unit_name} Terminal</h1>
                <div className="mode-selector">
                    {availableModes.map(m => (
                        <button key={m} onClick={() => { setMode(m); setCartItems([]) }} className={mode === m ? 'active' : ''}>
                            {m.replace('_', ' ')}
                        </button>
                    ))}
                </div>
            </div>
            {error && <p className="alert-error">{error}</p>}
            {success && (
                <div className="alert-success">
                    <span>{success}</span>
                    {lastSaleId && ( <a href={`/invoice/${lastSaleId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print Invoice</a> )}
                    {lastPurchaseId && ( <a href={`/remittance/${lastPurchaseId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print Remittance</a> )}
                    {lastQuoteId && ( <a href={`/quote/${lastQuoteId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print Quote</a> )}
                    {lastPurchaseOrderId && ( <a href={`/purchase-order/${lastPurchaseOrderId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print PO</a> )}
                    {lastSalesOrderId && ( <a href={`/sales-order/${lastSalesOrderId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print SO</a> )}
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
             <Modal show={showMixModal} onClose={() => setShowMixModal(false)} title="Enter Mixed Paint Details">
                <PaintMixDetailsModal 
                    onSave={handleSaveMixDetails}
                    onClose={() => setShowMixModal(false)}
                    initialDetails={activeCartItem?.mixDetails}
                    // --- ADD THIS NEW PROP ---
                    initialPrice={activeCartItem ? parseFloat(activeCartItem.selling_price) * parseFloat(activeCartItem.quantity) : 0}
                />
            </Modal>
            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
                <PaymentModal 
                    totalAmount={grandTotal} 
                    onProcessPayment={handleProcessSale} 
                    onProcessAccountCharge={() => setShowAccountChargeModal(true)} 
                    onClose={() => setShowPaymentModal(false)} 
                    selectedCustomer={selectedCustomer}
                    safes={safes}
                />
            </Modal>
            <Modal show={showAccountChargeModal} onClose={() => setShowAccountChargeModal(false)} title="Charge to Business Account">
                <ChargeToAccountModal onCharge={handleProcessAccountCharge} onClose={() => setShowAccountChargeModal(false)} />
            </Modal>
        </div>
    );
};

export default PosPage;