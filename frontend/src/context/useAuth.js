// frontend/src/context/useAuth.js
import { useContext } from 'react';
import { AuthContext } from './AuthContext';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    const { user, selectedBusiness } = context;

    // Is the user a system-wide admin?
    const isSuperAdmin = user?.assignments?.some(a => a.role_name === 'Admin' && !a.business_unit_id);

    // What is the user's role in the currently selected business?
    const currentRole = selectedBusiness?.role_name;

    return {
        ...context, // Return all original context values
        isSuperAdmin,
        currentRole
    };
};