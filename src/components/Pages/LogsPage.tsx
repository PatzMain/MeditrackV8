import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { activityService } from '../../services/supabaseService';
import './LogsPage.css';
import './PagesStyles.css';
import ViewLogModal from '../Modals/ViewLogModal';

const LogsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('timestamp');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [highlightedLogId, setHighlightedLogId] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        setLoading(true);
        const logsData = await activityService.getLogs();
        setLogs(logsData);
        setError(null);
      } catch (error) {
        console.error('Error fetching logs:', error);
        setError('Failed to load activity logs');
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, []);

  // Handle URL highlighting from universal search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlightId = searchParams.get('highlightId');
    const page = searchParams.get('page');
    const itemsPerPageParam = searchParams.get('itemsPerPage');

    if (highlightId) {
      setHighlightedLogId(parseInt(highlightId, 10));
    }

    // Set page and items per page from universal search
    if (page) {
      setCurrentPage(parseInt(page));
    }

    if (itemsPerPageParam) {
      const itemsPerPageValue = parseInt(itemsPerPageParam);
      if ([10, 25, 50, 100].includes(itemsPerPageValue)) {
        setItemsPerPage(itemsPerPageValue);
      }
    }

    // Clean up URL after processing
    if (highlightId || page || itemsPerPageParam) {
      const timer = setTimeout(() => {
        navigate('/logs', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate]);

  // Scroll to and highlight log when highlightedLogId changes
  useEffect(() => {
    if (highlightedLogId && logs.length > 0 && !loading) {
      const timer = setTimeout(() => {
        const logElement = document.getElementById(`log-item-${highlightedLogId}`);
        if (logElement) {
          // Scroll to the log
          logElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

          // Clear highlight after 3 seconds
          setTimeout(() => {
            setHighlightedLogId(null);
          }, 3000);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [highlightedLogId, logs, loading]);

  const users = ['all', ...Array.from(new Set(logs.map(log => log.users?.username || 'Unknown')))];
  const actions = ['all', ...Array.from(new Set(logs.map(log => log.action)))];

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle different data types
      if (sortField === 'timestamp') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (sortField === 'user') {
        aVal = (a.users?.username || 'Unknown').toLowerCase();
        bVal = (b.users?.username || 'Unknown').toLowerCase();
      } else if (typeof aVal === 'string') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredLogs = sortData(
    logs.filter(log => {
      const userName = log.users?.username || 'Unknown';
      const matchesSearch = (log.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (log.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesUser = filterUser === 'all' || userName === filterUser;
      const matchesAction = filterAction === 'all' || log.action === filterAction;

      return matchesSearch && matchesUser && matchesAction;
    })
  );

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);


  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'INFO':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="severity-info">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
          </svg>
        );
      case 'WARNING':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="severity-warning">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        );
      case 'ERROR':
        return (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="severity-error">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        );
      default:
        return null;
    }
  };

  const getCategoryColor = (category: string) => {
    const colorMap: { [key: string]: string } = {
      'Authentication': 'blue',
      'User Management': 'indigo',
      'Patient Management': 'green',
      'Medical Records': 'purple',
      'Inventory Management': 'orange',
      'System Administration': 'gray',
      'Security': 'red',
      'Data Export': 'lime',
      'Settings': 'amber',
      'Audit': 'pink',
      'Laboratory': 'teal',
      'Monitoring': 'violet'
    };
    return colorMap[category] || 'gray';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Activity Logs</h1>
        <p className="page-subtitle">Monitor and audit all system activities and user actions</p>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="search-box-large">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Search logs by user, action, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>User:</label>
            <select value={filterUser} onChange={(e) => setFilterUser(e.target.value)}>
              {users.map(user => (
                <option key={user} value={user}>
                  {user === 'all' ? 'All Users' : user}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Action:</label>
            <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              {actions.map(action => (
                <option key={action} value={action}>
                  {action === 'all' ? 'All Actions' : action.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Items per page:</label>
            <select value={itemsPerPage} onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

        </div>
      </div>

      {loading && (
        <div className="loading-message">Loading activity logs...</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Log Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 20h9" stroke="currentColor" strokeWidth="2"/>
              <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{filteredLogs.length}</div>
            <div className="stat-title">Total Activity Logs</div>
            <div className="stat-change neutral">All recorded actions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="17" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{filteredLogs.filter(log => log.severity === 'warning').length}</div>
            <div className="stat-title">Warnings</div>
            <div className={`stat-change ${filteredLogs.filter(log => log.severity === 'warning').length > 0 ? 'warning' : 'positive'}`}>
              {filteredLogs.filter(log => log.severity === 'warning').length > 0 ? 'Needs attention' : 'None found'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{filteredLogs.filter(log => log.severity === 'error').length}</div>
            <div className="stat-title">Errors</div>
            <div className={`stat-change ${filteredLogs.filter(log => log.severity === 'error').length > 0 ? 'danger' : 'positive'}`}>
              {filteredLogs.filter(log => log.severity === 'error').length > 0 ? 'Critical issues' : 'None found'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {logs.filter(log =>
                new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <div className="stat-title">Last 24 Hours</div>
            <div className="stat-change neutral">Recent activity</div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th className="sortable" onClick={() => handleSort('timestamp')}>
                  Timestamp {sortField === 'timestamp' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="sortable" onClick={() => handleSort('user')}>
                  User {sortField === 'user' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="sortable" onClick={() => handleSort('action')}>
                  Action {sortField === 'action' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="sortable" onClick={() => handleSort('category')}>
                  Category {sortField === 'category' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="sortable" onClick={() => handleSort('description')}>
                  Description {sortField === 'description' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th className="sortable" onClick={() => handleSort('severity')}>
                  Severity {sortField === 'severity' && (sortDirection === 'asc' ? '▲' : '▼')}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.map((log) => (
                <tr
                  key={log.id}
                  id={`log-item-${log.id}`}
                  className={`log-row severity-${log.severity} ${highlightedLogId === log.id ? 'highlighted-item' : ''}`}
                >
                  <td className="timestamp-cell">
                    <div className="timestamp">{new Date(log.timestamp).toLocaleString()}</div>
                  </td>
                  <td>
                    <div className="user-info">
                      <div className="user-name">{log.users?.username || 'Unknown'}</div>
                      <div className="user-role">{log.users?.role || 'Unknown'}</div>
                    </div>
                  </td>
                  <td>
                    <span className="action-badge">
                      {log.action.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className={`category-badge ${getCategoryColor(log.category || 'System')}`}>
                      {log.category || 'System'}
                    </span>
                  </td>
                  <td>
                    <div className="log-description">
                      <div className="description-text">{log.description}</div>
                      {log.details && (
                        <div className="description-details">{JSON.stringify(log.details)}</div>
                      )}
                    </div>
                  </td>
                  <td className="severity-cell">
                    <div className="severity-indicator">
                      {getSeverityIcon(log.severity.toUpperCase())}
                      <span className={`severity-text ${log.severity}`}>
                        {log.severity.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      <button className="btn-icon" title="View Details" onClick={() => { setSelectedItem(log); setIsViewModalOpen(true); }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
          Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of {filteredLogs.length} log entries
        </div>

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>

      {isViewModalOpen && (
        <ViewLogModal
          item={selectedItem}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}
    </div>
  );
};

export default LogsPage;