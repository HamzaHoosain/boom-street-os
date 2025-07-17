// frontend/src/services/authService.js
import axios from 'axios';

const API_URL = '/api/auth/'; // Note: Using a relative URL because of the proxy we set up

const login = (email, password) => {
    return axios.post(API_URL + 'login', {
        email,
        password,
    });
};

const logout = () => {
    // For JWT, logout is handled on the client side by simply removing the token.
    localStorage.removeItem('user');
};

const authService = {
    login,
    logout,
};

export default authService;