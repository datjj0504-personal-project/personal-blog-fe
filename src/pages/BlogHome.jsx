import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './BlogHome.css';

export default function BlogHome() {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
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

      {/* Main Content Area */}
      <div className="blog-content">
        <h1>Welcome, {user?.username || 'User'}!</h1>
        <p>This is your blog home page.</p>
      </div>
    </div>
  );
}
