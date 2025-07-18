// File: frontend/src/context/AuthContext.js
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
    const [selectedBusiness, setSelectedBusiness] = useState(JSON.parse(localStorage.getItem('selectedBusiness')));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(false);
    }, []);

    const login = (userData) => {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('user', JSON.stringify(userData.user));
        setToken(userData.token);
        setUser(userData.user);
    };

    const selectBusiness = (assignment) => {
        localStorage.setItem('selectedBusiness', JSON.stringify(assignment));
        setSelectedBusiness(assignment);
    };

    const logout = () => {
        localStorage.clear();
        setToken(null);
        setUser(null);
        setSelectedBusiness(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, selectedBusiness, loading, login, logout, selectBusiness }}>
            {children}
        </AuthContext.Provider>
    );
};