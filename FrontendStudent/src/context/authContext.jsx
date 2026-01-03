
import React, { createContext, useState, useContext, useEffect } from 'react';
import { clearAuth, getStoredToken, getStoredUser, persistAuth } from '../utils/authStorage';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = (userData, authToken, rememberMe = true) => {
    setUser(userData);
    setToken(authToken);
    persistAuth(authToken, userData, rememberMe);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    clearAuth();
  };

  const isAuthenticated = () => {
    return !!token && !!user;
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
};