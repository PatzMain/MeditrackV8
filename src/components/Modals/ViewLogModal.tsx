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
    <div className="modal-overlay activity-logs-overlay" onClick={onClose}>
      <div className="log-modal-content modern-log-modal" onClick={e => e.stopPropagation()}>
        {/* Enhanced Header */}
        <div className="log-modal-header enhanced-header">
          <div className="header-main">
            <div className="log-title-section">
              <div className="title-wrapper">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="activity-icon">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2" fill="rgba(30, 60, 114, 0.1)"/>
                  <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <div>
                  <h2 className="log-modal-title">Activity Log Details</h2>
                  <div className="log-metadata">
                    <span className="log-id">ID: #{item.id}</span>
                    <span className="timestamp-badge">{timestamp.relative}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="severity-badge enhanced-severity">
              {getSeverityIcon(item.severity)}
              <span className={`severity-text severity-${item.severity?.toLowerCase()}`}>
                {item.severity?.toUpperCase() || 'INFO'}
              </span>
            </div>
          </div>
          <button className="log-modal-close enhanced-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2"/>
              <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>

        {/* Enhanced Content */}
        <div className="log-modal-body enhanced-body">
          {/* Primary Information */}
          <div className="info-section primary-info enhanced-section">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              Core Details
            </h3>
            <div className="info-grid enhanced-grid">
              <div className="info-card enhanced-card timestamp-card">
                <div className="card-header">
                  <div className="info-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                      <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Timestamp
                  </div>
                  <div className="timestamp-indicator"></div>
                </div>
                <div className="info-value">
                  <div className="timestamp-primary">{timestamp.absolute}</div>
                  <div className="timestamp-relative">{timestamp.relative}</div>
                </div>
              </div>

              <div className="info-card enhanced-card user-card">
                <div className="card-header">
                  <div className="info-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    User
                  </div>
                  <div className="user-indicator"></div>
                </div>
                <div className="info-value">
                  <div className="user-info-wrapper">
                    <div className="user-avatar">
                      {(item.users?.first_name?.[0] || item.users?.username?.[0] || '?').toUpperCase()}
                    </div>
                    <div className="user-details">
                      <div className="user-name">{item.users?.first_name && item.users?.last_name
                        ? `${item.users.first_name} ${item.users.last_name}`
                        : item.users?.username || 'Unknown'}
                      </div>
                      <div className="user-role">{item.users?.role?.toUpperCase() || 'UNKNOWN'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="info-card enhanced-card action-card">
                <div className="card-header">
                  <div className="info-label">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                    Action
                  </div>
                  <div className="action-indicator"></div>
                </div>
                <div className="info-value">
                  <code className="action-code enhanced-action">{item.action}</code>
                </div>
              </div>

              {item.category && (
                <div className="info-card enhanced-card category-card">
                  <div className="card-header">
                    <div className="info-label">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      Category
                    </div>
                    <div className="category-indicator" style={{ backgroundColor: getCategoryColor(item.category) }}></div>
                  </div>
                  <div className="info-value">
                    <span
                      className="category-pill enhanced-pill"
                      style={{ backgroundColor: getCategoryColor(item.category) }}
                    >
                      <span className="category-icon">📂</span>
                      {item.category}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Description */}
          <div className="info-section description-section enhanced-section">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14,2 14,8 20,8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10,9 9,9 8,9"/>
              </svg>
              Activity Description
            </h3>
            <div className="description-content enhanced-description">
              <div className="description-text">
                {item.description || 'No description provided'}
              </div>
              <div className="description-meta">
                <span className="word-count">
                  {item.description ? `${item.description.split(' ').length} words` : '0 words'}
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Technical Information */}
          {(item.ip_address || item.user_agent || item.resource_type) && (
            <div className="info-section technical-info enhanced-section">
              <h3>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
                Technical Information
              </h3>
              <div className="tech-grid enhanced-tech-grid">
                {item.ip_address && (
                  <div className="tech-item enhanced-tech-item">
                    <div className="tech-header">
                      <span className="tech-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="2" y1="12" x2="22" y2="12"/>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        IP Address
                      </span>
                      <div className="ip-indicator"></div>
                    </div>
                    <code className="tech-value ip-value">{item.ip_address}</code>
                  </div>
                )}
                {item.resource_type && (
                  <div className="tech-item enhanced-tech-item">
                    <div className="tech-header">
                      <span className="tech-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M20 6 9 17l-5-5"/>
                        </svg>
                        Resource Type
                      </span>
                      <div className="resource-indicator"></div>
                    </div>
                    <span className="tech-value resource-value">{item.resource_type}</span>
                  </div>
                )}
                {item.resource_id && (
                  <div className="tech-item enhanced-tech-item">
                    <div className="tech-header">
                      <span className="tech-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M9 12l2 2 4-4"/>
                          <path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
                        </svg>
                        Resource ID
                      </span>
                      <div className="id-indicator"></div>
                    </div>
                    <code className="tech-value id-value">#{item.resource_id}</code>
                  </div>
                )}
                {item.user_agent && (
                  <div className="tech-item enhanced-tech-item user-agent-item">
                    <div className="tech-header">
                      <span className="tech-label">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        User Agent
                      </span>
                      <div className="agent-indicator"></div>
                    </div>
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

        {/* Enhanced Footer */}
        <div className="log-modal-footer enhanced-footer">
          <div className="footer-info enhanced-footer-info">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-4M9 11V9a3 3 0 1 1 6 0v2"/>
            </svg>
            <div className="footer-text">
              <span className="security-notice">Secure & Audited</span>
              <span className="security-detail">This information is logged for security and audit purposes</span>
            </div>
          </div>
          <div className="footer-actions">
            <button className="btn-secondary copy-btn" onClick={() => navigator.clipboard?.writeText(JSON.stringify(item, null, 2))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </button>
            <button className="btn-primary enhanced-close-btn" onClick={onClose}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewLogModal;
