import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

import ProductList from '../components/pos/ProductList';
import Cart from '../components/pos/Cart';
import CategorySidebar from '../components/pos/CategorySidebar';
import CustomerSelect from '../components/pos/CustomerSelect';
import CustomerSearchModal from '../components/pos/CustomerSearchModal';
import Modal from '../components/layout/Modal';
import PaymentModal from '../components/pos/PaymentModal';
import ChargeToAccountModal from '../components/pos/ChargeToAccountModal';
import SearchBar from '../components/common/SearchBar';
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
        api.get('/cash/safes').then(res => setSafes(res.data));
        api.get('/expenses/categories').then(res => setExpenseCategories(res.data));
    }, []);

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
    const [mode, setMode] = useState('sell');

    // State
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [safes, setSafes] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cartItems, setCartItems] = useState([]);
    const [payoutSafeId, setPayoutSafeId] = useState('');
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showAccountChargeModal, setShowAccountChargeModal] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastSaleId, setLastSaleId] = useState(null);

    // Determine available modes
    const availableModes = [];
    if (selectedBusiness?.type?.includes('Retail')) availableModes.push('sell');
    if (selectedBusiness?.type === 'Bulk Inventory') availableModes.push('buy');
    if (selectedBusiness) availableModes.push('expense');

    useEffect(() => {
        let defaultMode = 'sell';
        if (selectedBusiness?.type === 'Bulk Inventory') defaultMode = 'buy';
        setMode(defaultMode);

        if (selectedBusiness?.business_unit_id) {
            setError(''); setSuccess(''); setCartItems([]); setProducts([]);
            setFilteredProducts([]); setCategories([]); setLastSaleId(null);
            setSelectedCustomer(null); setPayoutSafeId(''); setSearchTerm('');

            const fetchData = async () => {
                try {
                    const productsRes = await api.get(`/products/${selectedBusiness.business_unit_id}`);
                    setProducts(productsRes.data);
                    
                    if (defaultMode === 'sell') {
                        const categoriesRes = await api.get(`/categories/${selectedBusiness.business_unit_id}`);
                        setCategories(categoriesRes.data);
                    } else if (defaultMode === 'buy') {
                        const safesRes = await api.get('/cash/safes');
                        setSafes(safesRes.data);
                        const scrapyardFloat = safesRes.data.find(s => s.name === 'Scrapyard Float');
    if (scrapyardFloat) {
        setPayoutSafeId(scrapyardFloat.id);
    }
                    }
                } catch (err) {
                    setError('Failed to fetch initial data for this terminal mode.');
                }
            };
            fetchData();
        }
    }, [selectedBusiness]);
    
    // Master filtering effect for both category and search
    useEffect(() => {
        let tempProducts = [...products];

        if (selectedCategoryId) {
            tempProducts = tempProducts.filter(p => p.category_id === selectedCategoryId);
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tempProducts = tempProducts.filter(p =>
                p.name.toLowerCase().includes(lowercasedTerm) ||
                (p.sku && p.sku.toLowerCase().includes(lowercasedTerm))
            );
        }
        setFilteredProducts(tempProducts);
    }, [searchTerm, selectedCategoryId, products]);

    const handleAddToCart = (product) => {
        setSuccess(''); setLastSaleId(null);
        if (mode === 'buy') {
            setCartItems(prev => [...prev, { ...product, quantity: 1, cartId: Date.now() }]);
    return;
}
        setCartItems(prev => {
            const exists = prev.find(item => item.id === product.id);
            if (exists) {
                return prev.map(item => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
            }
            return [...prev, { ...product, quantity: 1, cartId: Date.now() }];
        });
    };

    const handleRemoveFromCart = (itemToRemove) => {
        setCartItems(prev => prev.filter(item => item.cartId !== itemToRemove.cartId));
    };
    
    const handleUpdatePrice = (cartId, newPrice) => {
        setCartItems(prev => prev.map(item => 
            item.cartId === cartId ? { ...item, selling_price: newPrice } : item
        ));
        
};
const handleQuantityChange = (cartId, newQuantity) => {
    // Convert the input to a number, defaulting to 0 if it's not a valid number
    const quantity = parseFloat(newQuantity);
    setCartItems(prev => prev.map(item =>
        item.cartId === cartId ? { ...item, quantity: isNaN(quantity) ? 0 : quantity } : item
    ));
    };

    const handleProcess = () => {
        if (cartItems.length === 0) {
            setError("Cart is empty.");
            return;
        }
        if (mode === 'buy') {
            handleProcessPayout();
        } else {
            setShowPaymentModal(true);
        }
    };

    const handleProcessSale = async (paymentData) => {
        setShowPaymentModal(false);
        setError(''); setSuccess('');
        const total_amount = cartItems.reduce((total, item) => total + (parseFloat(item.selling_price) * item.quantity), 0);
        const saleData = {
            business_unit_id: selectedBusiness.business_unit_id,
            total_amount,
            cart_items: cartItems.map(item => ({ id: item.id, quantity: item.quantity, selling_price: item.selling_price })),
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            payment: paymentData
        };
        try {
            const response = await api.post('/sales', saleData);
            setSuccess(`Sale #${response.data.saleId} processed successfully!`);
            setLastSaleId(response.data.saleId);
            setCartItems([]);
            setSelectedCustomer(null);
        } catch (err) {
            setError((err.response?.data?.msg) || 'Sale failed to process.');
        }
    };

    const handleProcessPayout = async () => {
        setError(''); setSuccess('');
        if (!payoutSafeId) {
            setError('A payout source must be selected.');
            return;
        }
        const payload = {
            business_unit_id: selectedBusiness.business_unit_id,
            purchase_items: cartItems.map(item => ({ product_id: item.id, weight_kg: item.quantity })),
            safe_id: parseInt(payoutSafeId)
        };
        try {
            const response = await api.post('/scrapyard/buy', payload);
            setSuccess(`Payout of R ${response.data.total_payout.toFixed(2)} processed successfully!`);
            setCartItems([]);
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
            setError('Failed to log expense.');
            console.error(err);
        }
    };

    const handleProcessAccountCharge = async (receivingUnitId) => {
        setShowAccountChargeModal(false);
        setShowPaymentModal(false);
        setError('');
        setSuccess('');
        for (const item of cartItems) {
            const transferData = {
                requesting_unit_id: receivingUnitId,
                providing_unit_id: selectedBusiness.business_unit_id,
                product_id: item.id,
                quantity_requested: item.quantity
            };
            try {
                const requestResponse = await api.post('/transfers/request', transferData);
                await api.post(`/transfers/${requestResponse.data.id}/fulfill`);
            } catch (err) {
                setError(`Failed to transfer ${item.name}. Please check stock and try again.`);
                return;
            }
        }
        setSuccess('All items successfully charged to the business account.');
        setCartItems([]);
        setSelectedCustomer(null);
    };

    const cartTotal = cartItems.reduce((total, item) => {
        const price = mode === 'buy' ? parseFloat(item.cost_price) : parseFloat(item.selling_price);
        return total + price * item.quantity;
    }, 0);

    if (!selectedBusiness || !selectedBusiness.business_unit_id) {
        return ( <div><h1>Terminal</h1><p>Please select a specific business unit from the header.</p></div> );
    }

    return (
        <div>
            <h1>{selectedBusiness.business_unit_name} Terminal</h1>
            <div className="mode-selector">
                {availableModes.map(m => <button key={m} onClick={() => {setCartItems([]); setSuccess(''); setError(''); setMode(m);}} className={mode === m ? 'active' : ''}>{m.charAt(0).toUpperCase() + m.slice(1)}</button>)}
            </div>

            {error && <p className="alert-error" style={{marginTop: '1rem'}}>{error}</p>}
            {success && (
                <div className="alert-success">
                    <span>{success}</span>
                    {lastSaleId && mode === 'sell' && (
                        <a href={`/invoice/${lastSaleId}`} target="_blank" rel="noopener noreferrer" className="btn-print">Print Invoice</a>
                    )}
                </div>
            )}
            
            {mode === 'expense' ? (
                <ExpenseForm onLogExpense={handleLogExpense} />
            ) : (
                <div className="pos-layout">
                    {categories.length > 0 && <CategorySidebar categories={categories} selectedCategoryId={selectedCategoryId} onSelectCategory={setSelectedCategoryId} />}
                    <div className="product-list-container">
                        
                        <SearchBar 
                            searchTerm={searchTerm}
                            setSearchTerm={setSearchTerm}
                            placeholder="Search products by name or SKU..."
                        />

                        <ProductList products={filteredProducts} onAddToCart={handleAddToCart} isBuyMode={mode === 'buy'} />
                    </div>
                    <div className="cart-container">
                        {mode === 'sell' && <CustomerSelect selectedCustomer={selectedCustomer} onSelectCustomer={() => setShowCustomerModal(true)} onClearCustomer={() => setSelectedCustomer(null)} />}
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
                            onProcessSale={handleProcess}
                             onQuantityChange={handleQuantityChange}
                            onUpdatePrice={handleUpdatePrice}
                            isBuyMode={mode === 'buy'}
                        />
                    </div>
                </div>
            )}
            
            <Modal show={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Select a Customer">
                <CustomerSearchModal onSelect={setSelectedCustomer} onClose={() => setShowCustomerModal(false)} />
            </Modal>
            
            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
                <PaymentModal 
                    totalAmount={cartTotal}
                    onProcessPayment={handleProcessSale}
                    onProcessAccountCharge={() => setShowAccountChargeModal(true)}
                    onClose={() => setShowPaymentModal(false)}
                    selectedCustomer={selectedCustomer}
                />
            </Modal>
            
            <Modal show={showAccountChargeModal} onClose={() => setShowAccountChargeModal(false)} title="Charge to Business Account">
                <ChargeToAccountModal
                    onCharge={handleProcessAccountCharge}
                    onClose={() => setShowAccountChargeModal(false)}
                />
            </Modal>
        </div>
    );
};

export default PosPage;