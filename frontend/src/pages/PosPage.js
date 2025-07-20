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
import '../components/pos/Pos.css';

const PosPage = () => {
    const { selectedBusiness } = useContext(AuthContext);
    const isBuyMode = selectedBusiness?.type === 'Bulk Inventory';

    // State for data
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    
    // State for UI control and filtering
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [cartItems, setCartItems] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // State for feedback messages
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [lastSaleId, setLastSaleId] = useState(null);

    // --- NEW STATE FOR PAYOUT SOURCE ---
    const [safes, setSafes] = useState([]);
    const [payoutSafeId, setPayoutSafeId] = useState('');

    useEffect(() => {
        if (selectedBusiness && selectedBusiness.business_unit_id) {
            // Reset all state when the business context changes
            setError(''); setSuccess(''); setCartItems([]); setProducts([]);
            setFilteredProducts([]); setCategories([]); setLastSaleId(null);
            setSelectedCustomer(null); setPayoutSafeId('');

            const fetchData = async () => {
                try {
                    const [productsResponse, categoriesResponse] = await Promise.all([
                        api.get(`/products/${selectedBusiness.business_unit_id}`),
                        api.get(`/categories/${selectedBusiness.business_unit_id}`)
                    ]);
                    setProducts(productsResponse.data);
                    setFilteredProducts(productsResponse.data);
                    setCategories(categoriesResponse.data);
                } catch (err) {
                    setError('Failed to fetch page data for this business unit.');
                    console.error(err);
                }
            };

            // If in buy mode, also fetch the list of physical cash safes
            if (isBuyMode) {
                api.get('/cash/safes').then(res => {
                    const physicalSafes = res.data.filter(s => s.is_physical_cash);
                    setSafes(physicalSafes);
                    // --- AUTO-SELECT LOGIC ---
                    // Find the 'Scrapyard Float' and set it as the default
                    const scrapyardFloat = physicalSafes.find(s => s.name === 'Scrapyard Float');
                    if (scrapyardFloat) {
                        setPayoutSafeId(scrapyardFloat.id);
                    }
                });
            }
            fetchData();
        }
    }, [selectedBusiness, isBuyMode]);
    
    useEffect(() => {
        if (selectedCategoryId === null) {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(products.filter(p => p.category_id === selectedCategoryId));
        }
    }, [selectedCategoryId, products]);

    const handleAddToCart = (product) => {
        setSuccess(''); setLastSaleId(null);
        if (isBuyMode) {
            const weightStr = prompt(`Enter weight for ${product.name} (kg):`);
            const weight = parseFloat(weightStr);
            if (weight && !isNaN(weight) && weight > 0) {
                setCartItems(prev => [...prev, { ...product, quantity: weight, cartId: Date.now() }]);
            }
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

    const handleProcess = () => {
        if (cartItems.length === 0) {
            setError("Cart is empty.");
            return;
        }
        if (isBuyMode) {
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
        setError('');
        setSuccess('');
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
    
    const cartTotal = cartItems.reduce((total, item) => {
        const price = isBuyMode ? parseFloat(item.cost_price) : parseFloat(item.selling_price);
        return total + price * item.quantity;
    }, 0);

    if (!selectedBusiness || !selectedBusiness.business_unit_id) {
        return ( <div><h1>Point of Sale/Purchase</h1><p>Please select a specific business unit from the header to use this feature.</p></div> );
    }

    return (
        <div>
            <h1>{isBuyMode ? 'Point of Purchase' : 'Point of Sale'} for {selectedBusiness.business_unit_name}</h1>
            {error && <p className="alert-error">{error}</p>}
            {success && (
                <div className="alert-success">
                    <span>{success}</span>
                    {lastSaleId && !isBuyMode && (
                        <a href={`/invoice/${lastSaleId}`} target="_blank" rel="noopener noreferrer" className="btn-print">
                            Print Invoice
                        </a>
                    )}
                </div>
            )}
            
            <div className="pos-layout">
                {categories.length > 0 && 
                    <CategorySidebar
                        categories={categories}
                        selectedCategoryId={selectedCategoryId}
                        onSelectCategory={setSelectedCategoryId}
                    />
                }
                <div className="product-list-container">
                    <ProductList products={filteredProducts} onAddToCart={handleAddToCart} isBuyMode={isBuyMode} />
                </div>
                <div className="cart-container">
                    {!isBuyMode && 
                        <CustomerSelect 
                            selectedCustomer={selectedCustomer}
                            onSelectCustomer={() => setShowCustomerModal(true)}
                            onClearCustomer={() => setSelectedCustomer(null)}
                        />
                    }

                    {/* --- NEW UI FOR PAYOUT SOURCE --- */}
                    {isBuyMode && (
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
                        onUpdatePrice={handleUpdatePrice}
                        isBuyMode={isBuyMode}
                    />
                </div>
            </div>

            <Modal show={showCustomerModal} onClose={() => setShowCustomerModal(false)} title="Select a Customer">
                <CustomerSearchModal 
                    onSelect={setSelectedCustomer}
                    onClose={() => setShowCustomerModal(false)}
                />
            </Modal>
            
            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Payment">
                <PaymentModal 
                    totalAmount={cartTotal}
                    onProcessPayment={handleProcessSale}
                    onClose={() => setShowPaymentModal(false)}
                />
            </Modal>
        </div>
    );
};

export default PosPage;