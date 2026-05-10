import React from 'react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import './WelcomePage.css';

export default function WelcomePage() {
  const backendBase = '/datnt/blog/server';
  const authBase = `${backendBase}/auth`;
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    const token = sessionStorage.getItem('authToken');
    try {
      const res = await authenticatedFetch(`${authBase}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user?.username || '', token: token || '' }),
      });
      if (!res.ok) {
        console.warn(`[WelcomePage] logout endpoint returned ${res.status}`);
      }
    } catch (err) {
      console.warn(`[WelcomePage] logout request failed: ${err && err.message}`);
    } finally {
      logout();
      window.location.href = '/';
    }
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
