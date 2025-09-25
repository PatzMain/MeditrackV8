import React, { useState, useEffect, useCallback } from 'react';
import {
  patientMonitoringService,
  type PatientMonitoringLog,
  type Patient
} from '../../../services/supabaseService';
import './PatientModals.css';

interface PatientMonitoringLogsModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
}

const PatientMonitoringLogsModal: React.FC<PatientMonitoringLogsModalProps> = ({
  isOpen,
  patient,
  onClose
}) => {
  const [logs, setLogs] = useState<PatientMonitoringLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'patient' | 'consultation'>('all');
  const [limit, setLimit] = useState(50);

  const fetchLogs = useCallback(async () => {
    if (!patient) return;

    try {
      setLoading(true);
      setError(null);

      let logsData: PatientMonitoringLog[];

      if (filter === 'patient') {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(patient.id, undefined, limit);
      } else if (filter === 'consultation') {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(undefined, undefined, limit);
        // Filter to only show logs that are related to consultations for this patient
        logsData = logsData.filter(log =>
          log.patient_id === patient.id ||
          (log.details && typeof log.details === 'object' && 'patient_id' in log.details && log.details.patient_id === patient.id)
        );
      } else {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(patient.id, undefined, limit);
      }

      setLogs(logsData);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      setError(`Failed to load monitoring logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [patient, filter, limit]);

  useEffect(() => {
    if (patient && isOpen) {
      fetchLogs();
    }
  }, [patient, isOpen, fetchLogs]);

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  const getActivityIcon = (action: string) => {
    const iconProps = {
      width: 16,
      height: 16,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2
    };

    if (action.includes('create') || action.includes('add') || action.includes('start')) {
      return (
        <svg {...iconProps} className="activity-icon create">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      );
    }

    if (action.includes('update') || action.includes('edit') || action.includes('record')) {
      return (
        <svg {...iconProps} className="activity-icon update">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
          <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
        </svg>
      );
    }

    if (action.includes('delete') || action.includes('remove')) {
      return (
        <svg {...iconProps} className="activity-icon delete">
          <polyline points="3,6 5,6 21,6"/>
          <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
        </svg>
      );
    }

    if (action.includes('view') || action.includes('access')) {
      return (
        <svg {...iconProps} className="activity-icon view">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      );
    }

    if (action.includes('upload') || action.includes('attach')) {
      return (
        <svg {...iconProps} className="activity-icon upload">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17,8 12,3 7,8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
        </svg>
      );
    }

    if (action.includes('complete') || action.includes('finish')) {
      return (
        <svg {...iconProps} className="activity-icon complete">
          <path d="M9 12l2 2 4-4"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
    }

    // Default icon for other actions
    return (
      <svg {...iconProps} className="activity-icon default">
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 6v6l4 2"/>
      </svg>
    );
  };

  const getActivityColor = (action: string) => {
    if (action.includes('create') || action.includes('add') || action.includes('start')) {
      return 'var(--color-success)';
    }
    if (action.includes('update') || action.includes('edit') || action.includes('record')) {
      return 'var(--color-warning)';
    }
    if (action.includes('delete') || action.includes('remove')) {
      return 'var(--color-error)';
    }
    if (action.includes('complete') || action.includes('finish')) {
      return 'var(--color-success)';
    }
    return 'var(--color-primary)';
  };

  const formatActionText = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Patient Monitoring Logs</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="patient-info-bar">
            <span className="patient-name">{patient.first_name} {patient.last_name}</span>
            <span className="patient-id">ID: {patient.patient_id}</span>
          </div>

          {error && (
            <div className="error-message">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="logs-filters">
            <div className="filter-group">
              <label>Filter by:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'patient' | 'consultation')}
              >
                <option value="all">All Activities</option>
                <option value="patient">Patient Activities</option>
                <option value="consultation">Consultation Activities</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Show:</label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
              >
                <option value={25}>Last 25 activities</option>
                <option value={50}>Last 50 activities</option>
                <option value={100}>Last 100 activities</option>
                <option value={200}>Last 200 activities</option>
              </select>
            </div>

            <button
              className="btn-secondary btn-sm"
              onClick={fetchLogs}
              disabled={loading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1,4 1,10 7,10"/>
                <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
              </svg>
              Refresh
            </button>
          </div>

          {/* Logs List */}
          <div className="logs-section">
            {loading ? (
              <div className="loading-message">Loading monitoring logs...</div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6v6l4 2"/>
                </svg>
                <p>No monitoring logs found for this patient</p>
              </div>
            ) : (
              <div className="logs-timeline">
                {logs.map((log, index) => (
                  <div key={log.id} className="log-entry">
                    <div className="log-icon" style={{ color: getActivityColor(log.action) }}>
                      {getActivityIcon(log.action)}
                    </div>

                    <div className="log-content">
                      <div className="log-header">
                        <div className="log-action">
                          {formatActionText(log.action)}
                        </div>
                        <div className="log-time">
                          {formatDateTime(log.performed_at)}
                        </div>
                      </div>

                      <div className="log-description">
                        {log.description}
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="log-details">
                          <button
                            className="details-toggle"
                            onClick={(e) => {
                              const target = e.currentTarget;
                              const details = target.nextElementSibling as HTMLElement;
                              if (details) {
                                details.style.display = details.style.display === 'none' ? 'block' : 'none';
                                target.textContent = details.style.display === 'none' ? 'Show details' : 'Hide details';
                              }
                            }}
                          >
                            Show details
                          </button>
                          <div className="details-content" style={{ display: 'none' }}>
                            <pre>{JSON.stringify(log.details, null, 2)}</pre>
                          </div>
                        </div>
                      )}
                    </div>

                    {index < logs.length - 1 && <div className="log-connector" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientMonitoringLogsModal;