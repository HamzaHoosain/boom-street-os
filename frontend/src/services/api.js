// frontend/src/services/api.js - CORRECTED
import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// IMPORTANT: Interceptor to add the token to every request
api.interceptors.request.use(
    (config) => {
        // --- THIS IS THE FIX ---
        // Get the token directly from localStorage using the key 'token'.
        const token = localStorage.getItem('token');
        
        // If the token exists, add it to the 'x-auth-token' header.
        if (token) {
            config.headers['x-auth-token'] = token;
        }
        // --- END OF FIX ---
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;