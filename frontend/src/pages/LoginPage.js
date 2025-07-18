// File: frontend/src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await authService.login(email, password);
            if (response.data.token) {
                login(response.data);
                navigate('/select-business'); // Go to selector after login
            }
        } catch (error) {
            setMessage((error.response?.data?.msg) || "Login failed!");
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Boom Street OS</h2>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label>Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-control" required />
                    </div>
                    <div className="form-group">
                        <label>Password</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-control" required />
                    </div>
                    <button type="submit" className="btn-login">Login</button>
                    {message && <p className="alert-error" style={{marginTop: '1rem'}}>{message}</p>}
                </form>
            </div>
        </div>
    );
};
export default LoginPage;