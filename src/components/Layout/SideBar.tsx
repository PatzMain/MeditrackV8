import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User } from '../../services/supabaseService';
import './SideBar.css';

interface SideBarProps {
  collapsed: boolean;
  userRole: string;
  onToggleSidebar: () => void;
  user: User | null;
  onLogout: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  shortLabel?: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'danger';
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  group?: string;
}


const SideBar: React.FC<SideBarProps> = ({ collapsed, userRole, onToggleSidebar, user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      shortLabel: 'Dashboard',
      path: '/dashboard',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="9" rx="1"/>
          <rect x="14" y="3" width="7" height="5" rx="1"/>
          <rect x="14" y="12" width="7" height="9" rx="1"/>
          <rect x="3" y="16" width="7" height="5" rx="1"/>
        </svg>
      )
    },
    {
      id: 'patient-monitoring',
      label: 'Patient Monitoring',
      shortLabel: 'Patients',
      path: '/patient-monitoring',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      )
    },
    {
      id: 'inventory',
      label: 'Inventory Management',
      shortLabel: 'Inventory',
      path: '/inventory',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <rect x="3" y="9" width="18" height="1"/>
          <rect x="9" y="9" width="1" height="12"/>
        </svg>
      )
    },
    {
      id: 'archives',
      label: 'Archives',
      shortLabel: 'Archives',
      path: '/archives',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="3" width="20" height="5" rx="1"/>
          <rect x="4" y="8" width="16" height="13" rx="1"/>
          <path d="M10 12h4"/>
        </svg>
      )
    },
    {
      id: 'logs',
      label: 'Activity Logs',
      shortLabel: 'Logs',
      path: '/logs',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
      )
    },
    ...(userRole === 'superadmin' ? [{
      id: 'admin-management',
      label: 'Admin Management',
      shortLabel: 'Admin',
      path: '/admin-management',
      group: 'main',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 5.16-1 9-5.45 9-11V7l-10-5z"/>
          <path d="M9 12l2 2 4-4"/>
        </svg>
      )
    }] : [])
  ];

  // Simply filter menu items - no complex grouping
  const filteredMenuItems = menuItems;

  const handleMenuClick = (path: string) => {
    navigate(path);
    setShowProfileMenu(false);
  };

  const handleProfileMenuToggle = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleLogout = () => {
    setShowProfileMenu(false);
    onLogout();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    setShowProfileMenu(false);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Header Section - Logo and Toggle */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <div className="logo-icon">
            <svg width="40" height="40" viewBox="0 0 100 100" fill="none">
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0f172a"/>
                  <stop offset="50%" stopColor="#1e40af"/>
                  <stop offset="100%" stopColor="#3730a3"/>
                </linearGradient>
              </defs>
              <circle cx="50" cy="50" r="45" fill="url(#logoGradient)"/>
              <rect x="44" y="25" width="12" height="50" fill="#ffffff" rx="3"/>
              <rect x="25" y="44" width="50" height="12" fill="#ffffff" rx="3"/>
            </svg>
          </div>

          {!collapsed && (
            <div className="brand-text">
              <h1 className="brand-name">MEDITRACK</h1>
              <p className="brand-tagline">Healthcare Management</p>
            </div>
          )}
        </div>

        <button
          className="sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed ? (
              <path d="M9 18L15 12L9 6" strokeLinecap="round" strokeLinejoin="round"/>
            ) : (
              <path d="M15 18L9 12L15 6" strokeLinecap="round" strokeLinejoin="round"/>
            )}
          </svg>
        </button>
      </div>

      {/* Navigation Section - Simple List */}
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {filteredMenuItems.map((item) => (
            <li key={item.id} className="nav-item">
              <button
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMenuClick(item.path)}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
              >
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span className="nav-label">{item.label}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Profile Section - Bottom */}
      <div className="sidebar-user">
        <button
          className="profile-trigger"
          onClick={handleProfileMenuToggle}
          aria-expanded={showProfileMenu}
          aria-label="User menu"
        >
          <div className="user-avatar">
            <img
              src={
                user?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  user?.first_name && user?.last_name
                    ? `${user.first_name}+${user.last_name}`
                    : user?.username || 'User'
                )}&background=1e40af&color=ffffff&size=40`
              }
              alt={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User'}
              onError={(e) => {
                // If custom avatar fails, try fallback to ui-avatars
                const img = e.currentTarget as HTMLImageElement;
                if (user?.avatar_url && img.src === user.avatar_url) {
                  img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.first_name && user?.last_name
                      ? `${user.first_name}+${user.last_name}`
                      : user?.username || 'User'
                  )}&background=1e40af&color=ffffff&size=40`;
                } else {
                  // If both fail, show text fallback
                  img.style.display = 'none';
                  (img.nextElementSibling as HTMLElement)!.style.display = 'flex';
                }
              }}
            />
            <div className="avatar-fallback" style={{ display: 'none' }}>
              {user?.first_name?.charAt(0).toUpperCase() || user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          {!collapsed && (
            <>
              <div className="user-info">
                <span className="user-name">{user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User'}</span>
                <span className="user-role">{user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1) || 'User'}</span>
              </div>
              <svg
                className={`chevron ${showProfileMenu ? 'expanded' : ''}`}
                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="M6 9L12 15L18 9"/>
              </svg>
            </>
          )}
        </button>

        {/* Profile Menu */}
        {showProfileMenu && !collapsed && (
          <div className="profile-menu">
            <button className="menu-item" onClick={handleProfileClick}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>Profile Settings</span>
            </button>

            <button className="menu-item logout" onClick={handleLogout}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16,17 21,12 16,7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SideBar;