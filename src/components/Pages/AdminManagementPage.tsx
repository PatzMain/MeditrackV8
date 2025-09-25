import React, { useState, useEffect } from 'react';
import { userService, authService, activityService, inventoryService } from '../../services/supabaseService';
import AddUserModal from '../Modals/AddUserModal';
import EditUserModal from '../Modals/EditUserModal';
import './AdminManagementPage.css';
import './PagesStyles.css';

interface SystemStats {
  totalUsers: number;
  roleCounts: { [key: string]: number };
  chartData: any[];
  totalInventoryItems?: number;
  lowStockItems?: number;
  totalActivities?: number;
  recentActivities?: number;
}

const AdminManagementPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);

  useEffect(() => {
    // Check if user is superadmin
    const user = authService.getCurrentUser();
    setCurrentUser(user);

    if (user?.role !== 'superadmin') {
      setError('Access denied. Only superadmin users can access this page.');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersData, stats, inventoryData, logsData] = await Promise.all([
        userService.getAllUsers(),
        userService.getUserStats(),
        inventoryService.getAllItems(),
        activityService.getLogs()
      ]);
      setUsers(usersData);

      // Enhanced stats with real data
      const enhancedStats = {
        ...stats,
        totalInventoryItems: inventoryData.length,
        lowStockItems: inventoryData.filter(item => item.status === 'low_stock').length,
        totalActivities: logsData.length,
        recentActivities: logsData.filter(log =>
          new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length
      };

      setSystemStats(enhancedStats);
      setError(null);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    await fetchData();
    setIsAddUserModalOpen(false);
  };

  const handleEditUser = async () => {
    await fetchData();
    setIsEditUserModalOpen(false);
    setSelectedUser(null);
  };

  const handleDeleteUser = async (userId: number, username: string) => {
    if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
      try {
        await userService.deleteUser(userId);
        await activityService.logActivity({
          action: 'delete',
          description: `Deleted user: ${username}`,
          category: 'user_management'
        });
        await fetchData();
      } catch (error) {
        console.error('Error deleting user:', error);
        setError('Failed to delete user');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.first_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (user.last_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Don't render anything if not superadmin
  if (currentUser && currentUser.role !== 'superadmin') {
    return (
      <div className="page-container">
        <div className="error-container">
          <div className="error-message">Access denied. Only superadmin users can access this page.</div>
        </div>
      </div>
    );
  }


  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Admin Management</h1>
        <p className="page-subtitle">Comprehensive system administration and user management</p>
      </div>

      {loading ? (
        <div className="loading-message">Loading admin data...</div>
      ) : error ? (
        <div className="error-container">
          <div className="error-message">{error}</div>
          <button className="btn-secondary" onClick={fetchData}>Retry</button>
        </div>
      ) : (
        <>
          {/* Analytics Section */}
          <div className="analytics-grid">
            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
                  <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{systemStats?.totalUsers || 0}</div>
                <div className="stat-title">Total Users</div>
                <div className="stat-change positive">Active accounts</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
                  <rect x="7" y="7" width="3" height="9" stroke="currentColor" strokeWidth="2"/>
                  <rect x="14" y="7" width="3" height="5" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{systemStats?.totalInventoryItems || 0}</div>
                <div className="stat-title">Total Inventory Items</div>
                <div className="stat-change positive">All departments</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{systemStats?.lowStockItems || 0}</div>
                <div className="stat-title">Low Stock Items</div>
                <div className={`stat-change ${(systemStats?.lowStockItems || 0) > 0 ? 'warning' : 'positive'}`}>
                  {(systemStats?.lowStockItems || 0) > 0 ? 'Needs attention' : 'All sufficient'}
                </div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 20h9" stroke="currentColor" strokeWidth="2"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </div>
              <div className="stat-content">
                <div className="stat-value">{systemStats?.totalActivities || 0}</div>
                <div className="stat-title">Total Activities</div>
                <div className="stat-change positive">All time</div>
              </div>
            </div>
          </div>

          {/* Chart Section */}
          <div className="chart-section">
            <div className="chart-card">
              <h3>User Roles Distribution</h3>
              <div className="role-distribution">
                {systemStats?.chartData?.map((role, index) => (
                  <div key={index} className="role-item">
                    <span className="role-name">{role.name}</span>
                    <div className="role-bar">
                      <div
                        className="role-progress"
                        style={{ width: `${(role.value / (systemStats?.totalUsers || 1)) * 100}%` }}
                      ></div>
                    </div>
                    <span className="role-count">{role.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* User Management Section */}
          <div className="admin-section">
            <div className="section-header">
              <h2>User Management</h2>
              <p>Manage system users and their permissions</p>
            </div>

            <div className="page-controls">
              <div className="search-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <select
                className="filter-select"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
              <button className="btn-primary" onClick={() => setIsAddUserModalOpen(true)}>
                Add User
              </button>
            </div>

            <div className="admin-data-container">
              {/* Admin Header */}
              <div className="admin-header">
                <div className="header-info">
                  <span className="users-count">{filteredUsers.length} users found</span>
                </div>
              </div>

              {/* Users Cards Grid */}
              <div className="users-grid">
                {paginatedUsers.map((user) => (
                  <div
                    key={user.id}
                    className={`user-card ${user.id === currentUser?.id ? 'current-user' : ''}`}
                  >
                    {/* Card Header */}
                    <div className="card-header">
                      <div className="user-avatar">
                        <div className="avatar-circle">
                          <span>{(user.first_name?.[0] || user.username[0] || '?').toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {user.first_name} {user.last_name}
                        </div>
                        <div className="username">@{user.username}</div>
                      </div>
                      <div className="card-actions">
                        <button
                          className="action-btn edit"
                          title="Edit User"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditUserModalOpen(true);
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className="action-btn delete"
                          title="Delete User"
                          onClick={() => handleDeleteUser(user.id, user.username)}
                          disabled={user.id === currentUser?.id}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2,2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="card-content">
                      <div className="card-meta">
                        <div className="meta-row">
                          <div className="meta-item">
                            <span className="meta-label">Role:</span>
                            <span className={`role-badge role-${user.role}`}>
                              {user.role}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">Department:</span>
                            <span className="meta-value">
                              {user.department || <span className="placeholder-text">N/A</span>}
                            </span>
                          </div>
                        </div>

                        <div className="meta-row">
                          <div className="meta-item">
                            <span className="meta-label">Position:</span>
                            <span className="meta-value">
                              {user.position || <span className="placeholder-text">N/A</span>}
                            </span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">Employee ID:</span>
                            <span className="meta-value employee-id">
                              {user.employee_id || <span className="placeholder-text">N/A</span>}
                            </span>
                          </div>
                        </div>

                        <div className="meta-row">
                          <div className="meta-item full-width">
                            <span className="meta-label">Last Login:</span>
                            <span className="meta-value">
                              {user.last_login
                                ? new Date(user.last_login).toLocaleDateString()
                                : <span className="placeholder-text never-logged">Never</span>
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Empty State */}
              {paginatedUsers.length === 0 && (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                  <h3>No users found</h3>
                  <p>There are no users matching your current search and filter criteria.</p>
                </div>
              )}

              {/* Pagination */}
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <div className="pagination-info">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                </div>

                <button
                  className="pagination-btn"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {isAddUserModalOpen && (
        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onSave={handleAddUser}
        />
      )}

      {isEditUserModalOpen && selectedUser && (
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSave={handleEditUser}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default AdminManagementPage;
