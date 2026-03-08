import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Check if user is authenticated on app load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('user');
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    
    if (token && userData && tokenExpiry) {
      try {
        const expiryTime = parseInt(tokenExpiry, 10);
        const now = Date.now();
        
        // Check if token has expired
        if (now > expiryTime) {
          console.log('Token has expired');
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          localStorage.removeItem('tokenExpiry');
        } else {
          setUser(JSON.parse(userData));
          setIsAuthenticated(true);
        }
      } catch (e) {
        console.error('Failed to parse stored user data:', e);
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tokenExpiry');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (userData, token, expiresIn) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    // Calculate expiry time (expiresIn is in hours)
    const expiryTime = Date.now() + (expiresIn * 60 * 60 * 1000);
    localStorage.setItem('tokenExpiry', expiryTime.toString());
    
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tokenExpiry');
    setUser(null);
    setIsAuthenticated(false);
  };

  const getToken = () => localStorage.getItem('authToken');

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
