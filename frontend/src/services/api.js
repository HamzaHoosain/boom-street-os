import axios from 'axios';

// Create a new instance of axios for our API
const api = axios.create({
    // This correctly points to your backend proxy
    baseURL: '/api', 
    headers: {
        'Content-Type': 'application/json'
    }
});

/*
  ================================================================
  THE CORRECT AXIOS INTERCEPTOR FOR YOUR BACKEND
  ================================================================
  
  This is the corrected interceptor that matches your specific
  authMiddleware implementation. It runs before every request.
  
  It gets the token from localStorage and adds it to the request
  using the EXACT header name your backend is looking for: 'x-auth-token'.
  
  This will resolve the 401 Unauthorized errors.
  ================================================================
*/
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('token');
        if (token) {
            // Use the 'x-auth-token' header, which is correct for your middleware
            config.headers['x-auth-token'] = token;
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

export default api;