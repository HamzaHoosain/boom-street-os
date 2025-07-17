// frontend/src/services/supplierService.js
import api from './api'; // We use our pre-configured api instance

const getSuppliers = () => {
    return api.get('/suppliers');
};

const createSupplier = (supplierData) => {
    return api.post('/suppliers', supplierData);
};

const supplierService = {
    getSuppliers,
    createSupplier,
};

export default supplierService;