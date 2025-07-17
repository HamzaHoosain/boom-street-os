// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // The base URL for all our API calls
    headers: {
        'Content-Type': 'application/json',
    },
});

// IMPORTANT: Interceptor to add the token to every request
api.interceptors.request.use(
    (config) => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.token) {
            config.headers['x-auth-token'] = user.token;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;