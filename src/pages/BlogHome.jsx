import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import './BlogHome.css';

export default function BlogHome() {
  const backendBase = '/datnt/blog/server';
  const authBase = `${backendBase}/auth`;
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = async () => {
    const token = localStorage.getItem('authToken');
    const requestBody = { username: user?.username || '', token: token || '' };
    console.log('[BlogHome] logout request body:', requestBody);
    try {
      const res = await authenticatedFetch(`${authBase}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      let responseBody = null;
      try {
        const text = await res.clone().text();
        responseBody = text ? JSON.parse(text) : text;
      } catch (err) {
        responseBody = null;
      }
      console.log('[BlogHome] logout response:', {
        status: res.status,
        ok: res.ok,
        body: responseBody,
      });
      if (!res.ok) {
        console.warn(`[BlogHome] logout endpoint returned ${res.status}`);
      }
    } catch (err) {
      console.warn(`[BlogHome] logout request failed: ${err && err.message}`);
    } finally {
      logout();
      window.location.href = '/';
    }
  };

  const handleNavigate = (route) => {
    setShowMenu(false);
    if (route === 'logout') {
      handleLogout();
    } else {
      window.location.href = `/${route}`;
    }
  };

  return (
    <div className="blog-home">
      {/* Header */}
      <header className="blog-header">
        <button
          type="button"
          className="brand-logo"
          title="DatNT Blog"
          onClick={() => handleNavigate('home')}
        >
          DatNT Blog
        </button>
        <div className="header-actions">
          <button type="button" className="header-btn">Feeds</button>
          <button type="button" className="header-btn primary">Create Post</button>
        </div>

        {/* Profile Button with Dropdown */}
        <div className="profile-menu-container">
          <button
            className="profile-button"
            onClick={() => setShowMenu(!showMenu)}
            title={user?.username || 'Profile'}
          >
            {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
          </button>

          {showMenu && (
            <div className="profile-dropdown">
              <a
                href="#profile"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('profile');
                }}
                className="dropdown-item"
              >
                Profile
              </a>
              <a
                href="#personal"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('personal');
                }}
                className="dropdown-item"
              >
                Home
              </a>
              <hr className="dropdown-divider" />
              <a
                href="#logout"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavigate('logout');
                }}
                className="dropdown-item logout-item"
              >
                Logout
              </a>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="blog-content">
        <h1>Welcome, {user?.username || 'User'}!</h1>
        <p>This is your blog home page.</p>
      </div>
    </div>
  );
}
