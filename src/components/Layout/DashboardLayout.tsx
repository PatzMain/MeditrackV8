import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from './TopBar';
import SideBar from './SideBar';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  return (
    <div
      className={`dashboard-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}
      onClick={closeMobileSidebar}
    >
      <SideBar
        collapsed={isMobile ? false : sidebarCollapsed}
        userRole={user?.role || 'user'}
        onToggleSidebar={toggleSidebar}
        user={user}
        onLogout={logout}
      />
      <div className="main-content" onClick={(e) => e.stopPropagation()}>
        <TopBar onToggleSidebar={toggleSidebar} isMobile={isMobile} />
        <div className="content-wrapper">{children}</div>
      </div>
    </div>
  );
};

export default DashboardLayout;
