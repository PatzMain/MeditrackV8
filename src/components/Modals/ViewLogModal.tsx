import React from 'react';
import './Modal.css';
import './ViewLogModal.css';

interface ViewLogModalProps {
  item: any;
  onClose: () => void;
}

const ViewLogModal: React.FC<ViewLogModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'INFO':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="severity-info-icon">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="8" r="1" fill="currentColor"/>
          </svg>
        );
      case 'WARNING':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="severity-warning-icon">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        );
      case 'ERROR':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="severity-error-icon">
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
      'Authentication': '#3b82f6',
      'User Management': '#8b5cf6',
      'Patient Management': '#10b981',
      'Medical Records': '#06b6d4',
      'Inventory Management': '#f59e0b',
      'System Administration': '#6b7280',
      'Security': '#ef4444',
      'Data Export': '#84cc16',
      'Settings': '#f97316',
      'Audit': '#ec4899',
      'Laboratory': '#14b8a6',
      'Monitoring': '#6366f1'
    };
    return colorMap[category] || '#6b7280';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    let relativeTime = '';
    if (days > 0) {
      relativeTime = `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      relativeTime = `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const minutes = Math.floor(diff / (1000 * 60));
      relativeTime = `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    }

    return {
      absolute: date.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }),
      relative: relativeTime
    };
  };

  const renderDetails = (details: any) => {
    if (!details) return null;

    try {
      const detailsObj = typeof details === 'string' ? JSON.parse(details) : details;
      return (
        <div className="log-details-container">
          <h4>Technical Details</h4>
          <div className="details-grid">
            {Object.entries(detailsObj).map(([key, value]) => (
              <div key={key} className="detail-item">
                <span className="detail-label">{key.replace(/_/g, ' ').toUpperCase()}:</span>
                <span className="detail-value">
                  {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    } catch (e) {
      return (
        <div className="log-details-container">
          <h4>Technical Details</h4>
          <pre className="details-raw">{String(details)}</pre>
        </div>
      );
    }
  };

  const timestamp = formatTimestamp(item.timestamp);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="log-modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="log-modal-header">
          <div className="header-main">
            <div className="log-title-section">
              <h2 className="log-modal-title">Activity Log Details</h2>
              <div className="log-id">ID: #{item.id}</div>
            </div>
            <div className="severity-badge">
              {getSeverityIcon(item.severity)}
              <span className={`severity-text severity-${item.severity?.toLowerCase()}`}>
                {item.severity?.toUpperCase() || 'INFO'}
              </span>
            </div>
          </div>
          <button className="log-modal-close" onClick={onClose} aria-label="Close">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="log-modal-body">
          {/* Primary Information */}
          <div className="info-section primary-info">
            <h3>Primary Information</h3>
            <div className="info-grid">
              <div className="info-card timestamp-card">
                <div className="info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Timestamp
                </div>
                <div className="info-value">
                  <div className="timestamp-primary">{timestamp.absolute}</div>
                  <div className="timestamp-relative">{timestamp.relative}</div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                    <circle cx="12" cy="7" r="4"/>
                  </svg>
                  User
                </div>
                <div className="info-value">
                  <div className="user-name">{item.users?.first_name && item.users?.last_name
                    ? `${item.users.first_name} ${item.users.last_name}`
                    : item.users?.username || 'Unknown'}
                  </div>
                  <div className="user-role">{item.users?.role?.toUpperCase() || 'UNKNOWN'}</div>
                </div>
              </div>

              <div className="info-card">
                <div className="info-label">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 20h9"/>
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                  </svg>
                  Action
                </div>
                <div className="info-value">
                  <code className="action-code">{item.action}</code>
                </div>
              </div>

              {item.category && (
                <div className="info-card">
                  <div className="info-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    Category
                  </div>
                  <div className="info-value">
                    <span
                      className="category-pill"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="info-section description-section">
            <h3>Description</h3>
            <div className="description-content">
              {item.description || 'No description provided'}
            </div>
          </div>

          {/* Technical Information */}
          {(item.ip_address || item.user_agent || item.resource_type) && (
            <div className="info-section technical-info">
              <h3>Technical Information</h3>
              <div className="tech-grid">
                {item.ip_address && (
                  <div className="tech-item">
                    <span className="tech-label">IP Address:</span>
                    <code className="tech-value">{item.ip_address}</code>
                  </div>
                )}
                {item.resource_type && (
                  <div className="tech-item">
                    <span className="tech-label">Resource Type:</span>
                    <span className="tech-value">{item.resource_type}</span>
                  </div>
                )}
                {item.resource_id && (
                  <div className="tech-item">
                    <span className="tech-label">Resource ID:</span>
                    <code className="tech-value">#{item.resource_id}</code>
                  </div>
                )}
                {item.user_agent && (
                  <div className="tech-item user-agent-item">
                    <span className="tech-label">User Agent:</span>
                    <div className="tech-value user-agent-value" title={item.user_agent}>
                      {item.user_agent}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {item.details && renderDetails(item.details)}
        </div>

        {/* Footer */}
        <div className="log-modal-footer">
          <div className="footer-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4M9 11V9a3 3 0 1 1 6 0v2"/>
            </svg>
            This information is logged for security and audit purposes
          </div>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewLogModal;
