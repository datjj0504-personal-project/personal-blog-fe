import React from 'react';
import { useAuth } from '../context/AuthContext';
import './WelcomePage.css';

export default function WelcomePage() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="welcome-page">
      <div className="logout-button-container">
        <button onClick={handleLogout} className="btn logout">
          Logout
        </button>
      </div>
      <div className="welcome-inner">
        <h1>Welcome{user?.username ? `, ${user.username}` : ''}</h1>
      </div>
    </div>
  );
}
