import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();
const AUTH_KEYS = ['authToken', 'user', 'tokenExpiry'];

function clearLegacyLocalAuth() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

function clearSessionAuth() {
  AUTH_KEYS.forEach((key) => sessionStorage.removeItem(key));
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = sessionStorage.getItem('authToken');
    const userData = sessionStorage.getItem('user');
    const tokenExpiry = sessionStorage.getItem('tokenExpiry');
    
    if (token && userData && tokenExpiry) {
      try {
        const expiryTime = parseInt(tokenExpiry, 10);
        const now = Date.now();
        
        // Check if token has expired
        if (now > expiryTime) {
          console.log('Token has expired');
          clearSessionAuth();
        } else {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        clearSessionAuth();
      }
    }
    clearLegacyLocalAuth();
    setIsLoading(false);
  }, []);

  const login = (userData, token, expiresIn) => {
    clearLegacyLocalAuth();
    sessionStorage.setItem('authToken', token);
    sessionStorage.setItem('user', JSON.stringify(userData));
    
    // Calculate expiry time (expiresIn is in hours)
    const expiryTime = Date.now() + (expiresIn * 60 * 60 * 1000);
    sessionStorage.setItem('tokenExpiry', expiryTime.toString());
    
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearSessionAuth();
    clearLegacyLocalAuth();
    setUser(null);
    setIsAuthenticated(false);
  };

  const getToken = () => sessionStorage.getItem('authToken');

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getToken,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
