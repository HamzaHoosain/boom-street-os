// frontend/src/pages/LoginPage.js
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import authService from '../services/authService';
import './LoginPage.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');
        try {
            const response = await authService.login(email, password);
            if (response.data.token) {
                login(response.data);
                // After successful login and context update, go to the selector
                navigate('/select-business');
            }
        } catch (error) {
            const resMessage = (error.response?.data?.msg) || "An error occurred";
            setMessage(resMessage);
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-form">
                <h2>Boom Street OS</h2>
                <form onSubmit={handleLogin}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input type="text" className="form-control" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input type="password" className="form-control" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    <div className="form-group">
                        <button type="submit" className="btn-login" disabled={loading}>Login</button>
                    </div>
                    {message && (<div className="form-group"><div className="alert-error" role="alert">{message}</div></div>)}
                </form>
            </div>
        </div>
    );
};
export default LoginPage;