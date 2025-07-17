// frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        const storedBusiness = localStorage.getItem('selectedBusiness');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        if (storedBusiness) {
            setSelectedBusiness(JSON.parse(storedBusiness));
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('user', JSON.stringify(userData.user));
        localStorage.setItem('token', userData.token);
        setUser(userData.user);
        setToken(userData.token);
    };

    const logout = () => {
        localStorage.clear(); // Clears everything
        setUser(null);
        setToken(null);
        setSelectedBusiness(null);
    };

    const selectBusiness = (assignment) => {
        localStorage.setItem('selectedBusiness', JSON.stringify(assignment));
        setSelectedBusiness(assignment);
    };

    return (
        <AuthContext.Provider value={{ user, token, selectedBusiness, loading, login, logout, selectBusiness }}>
            {children}
        </AuthContext.Provider>
    );
};