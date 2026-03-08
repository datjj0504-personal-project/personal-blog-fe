import React from 'react';
import { useAuth } from '../context/AuthContext';
import HomePage from '../pages/HomePage';

export function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontSize: '18px',
      }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <HomePage />;
  }

  return children;
}
