import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { AuthContext } from './authContextConfig';
import apiService from '../services/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const validateSession = async () => {
      try {
        const session = await apiService.getAdminSession({ signal: controller.signal });
        if (active) setUser(session?.user ?? null);
      } catch (error) {
        if (active && error?.name !== 'AbortError') setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    const expireSession = () => setUser(null);
    window.addEventListener('historiar:session-expired', expireSession);
    validateSession();
    return () => {
      active = false;
      controller.abort();
      window.removeEventListener('historiar:session-expired', expireSession);
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setIsLoading(true);
    try {
      const data = await apiService.adminLogin(email, password);
      setUser(data.user);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.adminLogout();
    } finally {
      setUser(null);
    }
  }, []);

  const hasPermission = useCallback(() => user?.role === 'admin', [user]);

  const contextValue = useMemo(() => ({
    user,
    isLoading,
    login,
    logout,
    hasPermission,
  }), [user, isLoading, login, logout, hasPermission]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
