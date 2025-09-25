import React from 'react';
import UniversalSearch from '../Common/UniversalSearch';
import { useAuth } from '../../contexts/AuthContext';
import './TopBar.css';

interface TopBarProps {
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ onToggleSidebar, isMobile = false }) => {
  const { user } = useAuth();

  return (
    <header className="topbar">
      {/* Mobile Menu Button */}
      <div className="topbar-left">
        {isMobile && onToggleSidebar && (
          <button
            className="mobile-menu-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Universal Search - Priority Width */}
      <div className="topbar-center">
        <UniversalSearch
          placeholder="Search inventory, users, or actions..."
        />
      </div>

      {/* User Role */}
      <div className="topbar-right">
        <div className="user-role-badge">
          {user?.role?.charAt(0).toUpperCase()}{user?.role?.slice(1)}
        </div>
      </div>
    </header>
  );
};

export default TopBar;