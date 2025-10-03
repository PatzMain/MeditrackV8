import React, { useState, useEffect, useCallback } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Patient,
  type PatientContact,
  type MedicalHistory,
  type Consultation,
  type PatientMonitoringLog
} from '../../../services/supabaseService';
import PatientContactModal from './PatientContactModal';
import MedicalHistoryModal from './MedicalHistoryModal';
import './PatientModals.css';

interface ViewPatientModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onEdit: (patient: Patient) => void;
  onNewConsultation: (patient: Patient) => void;
}

const ViewPatientModal: React.FC<ViewPatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onEdit,
  onNewConsultation
}) => {
  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [medicalHistory, setMedicalHistory] = useState<MedicalHistory | null>(null);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [logs, setLogs] = useState<PatientMonitoringLog[]>([]);
  const [activeTab, setActiveTab] = useState('profile');

  // Modal states
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<PatientContact | null>(null);
  const [medicalHistoryModalOpen, setMedicalHistoryModalOpen] = useState(false);

  // Logs state
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsFilter, setLogsFilter] = useState<'all' | 'patient' | 'consultation'>('all');
  const [logsLimit, setLogsLimit] = useState(50);

  const fetchPatientDetails = useCallback(async () => {
    if (!patient) return;

    try {
      setLoading(true);

      const [contactsData, medicalHistoryData, consultationsData] = await Promise.all([
        patientMonitoringService.getPatientContacts(patient.id),
        patientMonitoringService.getMedicalHistory(patient.id),
        patientMonitoringService.getConsultationsByPatientId(patient.id)
      ]);

      setContacts(contactsData);
      setMedicalHistory(medicalHistoryData);
      setConsultations(consultationsData);

      // Log activity
      await activityService.logActivity({
        action: 'view_patient_details',
        description: `Viewed detailed profile for: ${patient.first_name} ${patient.last_name}`,
        details: { patient_id: patient.id }
      });
    } catch (error) {
      console.error('Error fetching patient details:', error);
    } finally {
      setLoading(false);
    }
  }, [patient]);

  useEffect(() => {
    if (patient && isOpen) {
      fetchPatientDetails();
    }
  }, [patient, isOpen, fetchPatientDetails]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Not provided';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateAge = (birthday?: string) => {
    if (!birthday) return 'Unknown';
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const handleEdit = () => {
    if (patient) {
      onEdit(patient);
    }
  };

  const handleNewConsultation = () => {
    if (patient) {
      onNewConsultation(patient);
    }
  };

  // Modal handlers
  const handleAddContact = () => {
    setSelectedContact(null);
    setContactModalOpen(true);
  };

  const handleEditContact = (contact: PatientContact) => {
    setSelectedContact(contact);
    setContactModalOpen(true);
  };

  const handleContactSaved = (contact: PatientContact) => {
    if (selectedContact) {
      // Update existing contact
      setContacts(prev => prev.map(c => c.id === contact.id ? contact : c));
    } else {
      // Add new contact
      setContacts(prev => [contact, ...prev]);
    }
  };

  const handleDeleteContact = async (contact: PatientContact) => {
    if (!window.confirm(`Are you sure you want to delete the contact for ${contact.contact_name}?`)) {
      return;
    }

    try {
      await patientMonitoringService.deletePatientContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));

      await activityService.logActivity({
        action: 'delete_patient_contact',
        description: `Deleted emergency contact ${contact.contact_name} for patient ${patient?.first_name} ${patient?.last_name}`,
        details: {
          patient_id: patient?.id,
          contact_name: contact.contact_name,
          relationship: contact.relationship
        }
      });
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const handleEditMedicalHistory = () => {
    setMedicalHistoryModalOpen(true);
  };

  const handleMedicalHistorySaved = (history: MedicalHistory) => {
    setMedicalHistory(history);
  };

  const fetchLogs = useCallback(async () => {
    if (!patient) return;

    try {
      setLogsLoading(true);
      setLogsError(null);

      let logsData: PatientMonitoringLog[];

      if (logsFilter === 'patient') {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(patient.id, undefined, logsLimit);
      } else if (logsFilter === 'consultation') {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(undefined, undefined, logsLimit);
        logsData = logsData.filter(log =>
          log.patient_id === patient.id ||
          (log.details && typeof log.details === 'object' && 'patient_id' in log.details && log.details.patient_id === patient.id)
        );
      } else {
        logsData = await patientMonitoringService.getPatientMonitoringLogs(patient.id, undefined, logsLimit);
      }

      setLogs(logsData);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      setLogsError(`Failed to load monitoring logs: ${error.message}`);
    } finally {
      setLogsLoading(false);
    }
  }, [patient, logsFilter, logsLimit]);

  useEffect(() => {
    if (patient && isOpen && activeTab === 'logs') {
      fetchLogs();
    }
  }, [patient, isOpen, activeTab, fetchLogs]);

  const formatLogDateTime = (dateString: string) => {
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
          <div className="patient-avatar">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="patient-header-info">
            <h2>{patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}</h2>
            <div className="patient-header-details">
              <span className="patient-id">ID: {patient.patient_id}</span>
              <span className={`patient-type-badge ${patient.patient_type.toLowerCase()}`}>
                {patient.patient_type}
              </span>
              <span className={`status-badge ${patient.status}`}>
                {patient.status}
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Profile
          </button>
          <button
            className={`tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contacts')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            Contacts
          </button>
          <button
            className={`tab-btn ${activeTab === 'medical' ? 'active' : ''}`}
            onClick={() => setActiveTab('medical')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7 7-7z"/>
            </svg>
            Medical History
          </button>
          <button
            className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Consultations ({consultations.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            Activity Logs
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-message">Loading patient details...</div>
          ) : (
            <>
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="patient-profile">
                  <div className="medical-section">
                    <h4>Personal Information</h4>
                    <div className="allergy-item">
                      <span className="allergy-label">Full Name</span>
                      <span className="allergy-value">
                        {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
                      </span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Age</span>
                      <span className="allergy-value">
                        {patient.birthday ? `${calculateAge(patient.birthday)} years old` : (patient.age || 'Not provided')}
                      </span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Sex</span>
                      <span className="allergy-value">{patient.sex || 'Not provided'}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Civil Status</span>
                      <span className="allergy-value">{patient.civil_status || 'Not provided'}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Birthday</span>
                      <span className="allergy-value">{formatDate(patient.birthday)}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Address</span>
                      <span className="allergy-value">{patient.address || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="medical-section">
                    <h4>Patient Classification</h4>
                    <div className="allergy-item">
                      <span className="allergy-label">Type</span>
                      <span className="allergy-value">{patient.patient_type}</span>
                    </div>
                    {patient.course && (
                      <div className="allergy-item">
                        <span className="allergy-label">Course</span>
                        <span className="allergy-value">{patient.course}</span>
                      </div>
                    )}
                    {patient.department && (
                      <div className="allergy-item">
                        <span className="allergy-label">Department</span>
                        <span className="allergy-value">{patient.department}</span>
                      </div>
                    )}
                    {patient.patient_type === 'Student' && (
                      <>
                        <div className="allergy-item">
                          <span className="allergy-label">Level</span>
                          <span className="allergy-value">
                            {patient.student_level ? patient.student_level.charAt(0).toUpperCase() + patient.student_level.slice(1) : 'Not provided'}
                          </span>
                        </div>
                        <div className="allergy-item">
                          <span className="allergy-label">Year/Grade</span>
                          <span className="allergy-value">
                            {patient.year_level ?
                              (patient.student_level === 'highschool' ? `Grade ${patient.year_level}` : `Year ${patient.year_level}`)
                              : 'Not provided'
                            }
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="medical-section">
                    <h4>Contact Information</h4>
                    <div className="allergy-item">
                      <span className="allergy-label">Phone</span>
                      <span className="allergy-value">{patient.phone || 'Not provided'}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Email</span>
                      <span className="allergy-value">{patient.email || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="medical-section">
                    <h4>System Information</h4>
                    <div className="allergy-item">
                      <span className="allergy-label">Patient ID</span>
                      <span className="allergy-value">{patient.patient_id}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Status</span>
                      <span className="allergy-value">
                        <span className={`status-badge ${patient.status}`}>
                          {patient.status}
                        </span>
                      </span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Created</span>
                      <span className="allergy-value">{formatDateTime(patient.created_at)}</span>
                    </div>
                    <div className="allergy-item">
                      <span className="allergy-label">Last Updated</span>
                      <span className="allergy-value">{formatDateTime(patient.updated_at)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div className="contacts-section">
                  <div className="section-header">
                    <h3>Emergency Contacts</h3>
                    <button className="btn-primary" onClick={handleAddContact}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Add Contact
                    </button>
                  </div>

                  {contacts.length === 0 ? (
                    <div className="empty-state">
                      <p>No emergency contacts registered for this patient.</p>
                      <button className="btn-primary" onClick={handleAddContact}>
                        Add First Contact
                      </button>
                    </div>
                  ) : (
                    <div className="contacts-grid">
                      {contacts.map((contact, index) => (
                        <div key={contact.id} className="contact-card">
                          <div className="contact-header">
                            <h4>Contact {index + 1}</h4>
                            <div className="contact-badges">
                              {contact.is_primary && (
                                <span className="primary-badge">Primary</span>
                              )}
                            </div>
                          </div>
                          <div className="contact-details">
                            <div className="contact-item">
                              <span className="contact-label">Name:</span>
                              <span className="contact-value">{contact.contact_name}</span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">Relationship:</span>
                              <span className="contact-value">{contact.relationship}</span>
                            </div>
                            <div className="contact-item">
                              <span className="contact-label">Phone:</span>
                              <span className="contact-value">{contact.contact_number}</span>
                            </div>
                          </div>
                          <div className="contact-actions">
                            <button
                              className="btn-secondary btn-sm"
                              onClick={() => handleEditContact(contact)}
                              title="Edit contact"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                              </svg>
                              Edit
                            </button>
                            <button
                              className="btn-danger btn-sm"
                              onClick={() => handleDeleteContact(contact)}
                              title="Delete contact"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3,6 5,6 21,6"/>
                                <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                              </svg>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Medical History Tab */}
              {activeTab === 'medical' && (
                <div className="medical-history-section">
                  <div className="section-header">
                    <h3>Medical History</h3>
                    <button className="btn-primary" onClick={handleEditMedicalHistory}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
                      </svg>
                      {medicalHistory ? 'Edit History' : 'Add History'}
                    </button>
                  </div>

                  {!medicalHistory ? (
                    <div className="empty-state">
                      <p>No medical history recorded for this patient.</p>
                      <button className="btn-primary" onClick={handleEditMedicalHistory}>
                        Add Medical History
                      </button>
                    </div>
                  ) : (
                    <div className="medical-history-grid">
                      <div className="medical-section">
                        <h4>Allergies</h4>
                        <div className="allergy-item">
                          <span className="allergy-label">Food Allergies:</span>
                          <span className="allergy-value">{medicalHistory.food_allergies || 'None reported'}</span>
                        </div>
                        <div className="allergy-item">
                          <span className="allergy-label">Drug Allergies:</span>
                          <span className="allergy-value">{medicalHistory.drug_allergies || 'None reported'}</span>
                        </div>
                        <div className="allergy-item">
                          <span className="allergy-label">Other Allergies:</span>
                          <span className="allergy-value">{medicalHistory.other_allergies || 'None reported'}</span>
                        </div>
                      </div>

                      <div className="medical-section">
                        <h4>Family History</h4>
                        <div className="condition-grid">
                          <div className={`condition-item ${medicalHistory.family_ptb ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.family_ptb ? '✓' : '✗'}
                            </span>
                            <span>Pulmonary Tuberculosis (PTB)</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.family_cancer ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.family_cancer ? '✓' : '✗'}
                            </span>
                            <span>Cancer</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.family_dm ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.family_dm ? '✓' : '✗'}
                            </span>
                            <span>Diabetes Mellitus (DM)</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.family_cardiovascular ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.family_cardiovascular ? '✓' : '✗'}
                            </span>
                            <span>Cardiovascular Disease</span>
                          </div>
                        </div>
                        {medicalHistory.family_others && (
                          <div className="other-conditions">
                            <span className="other-label">Other Family History:</span>
                            <p>{medicalHistory.family_others}</p>
                          </div>
                        )}
                      </div>

                      <div className="medical-section">
                        <h4>Personal Medical History</h4>
                        <div className="condition-grid">
                          <div className={`condition-item ${medicalHistory.seizure ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.seizure ? '✓' : '✗'}
                            </span>
                            <span>Seizure</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.asthma ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.asthma ? '✓' : '✗'}
                            </span>
                            <span>Asthma</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.ptb ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.ptb ? '✓' : '✗'}
                            </span>
                            <span>Pulmonary Tuberculosis (PTB)</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.surgery ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.surgery ? '✓' : '✗'}
                            </span>
                            <span>Previous Surgery</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.cardio ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.cardio ? '✓' : '✗'}
                            </span>
                            <span>Cardiovascular Disease</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.neuro ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.neuro ? '✓' : '✗'}
                            </span>
                            <span>Neurological Condition</span>
                          </div>
                          <div className={`condition-item ${medicalHistory.ob_gyne ? 'positive' : 'negative'}`}>
                            <span className="condition-status">
                              {medicalHistory.ob_gyne ? '✓' : '✗'}
                            </span>
                            <span>OB-GYNE Condition</span>
                          </div>
                        </div>
                        {medicalHistory.other_conditions && (
                          <div className="other-conditions">
                            <span className="other-label">Other Medical Conditions:</span>
                            <p>{medicalHistory.other_conditions}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Consultations Tab */}
              {activeTab === 'consultations' && (
                <div className="consultations-section">
                  <div className="section-header">
                    <h3>Consultation History</h3>
                  </div>

                  {consultations.length === 0 ? (
                    <div className="empty-state">
                      <p>No consultations recorded for this patient.</p>
                      <button className="btn-primary" onClick={handleNewConsultation}>
                        Start First Consultation
                      </button>
                    </div>
                  ) : (
                    <div className="consultations-list">
                      {consultations.map((consultation) => (
                        <div key={consultation.id} className="consultation-card">
                          <div className="consultation-header">
                            <div className="consultation-date">
                              {formatDate(consultation.consultation_date)}
                            </div>
                            <div className={`consultation-status ${consultation.status}`}>
                              {consultation.status}
                            </div>
                          </div>
                          <div className="consultation-details">
                            <div className="consultation-item">
                              <span className="consultation-label">Case Number:</span>
                              <span className="consultation-value">{consultation.case_number}</span>
                            </div>
                            <div className="consultation-item">
                              <span className="consultation-label">Time In:</span>
                              <span className="consultation-value">{consultation.time_in}</span>
                            </div>
                            {consultation.time_out && (
                              <div className="consultation-item">
                                <span className="consultation-label">Time Out:</span>
                                <span className="consultation-value">{consultation.time_out}</span>
                              </div>
                            )}
                            <div className="consultation-item">
                              <span className="consultation-label">Chief Complaint:</span>
                              <span className="consultation-value">{consultation.chief_complaint}</span>
                            </div>
                            {consultation.diagnosis && (
                              <div className="consultation-item">
                                <span className="consultation-label">Diagnosis:</span>
                                <span className="consultation-value">{consultation.diagnosis}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Activity Logs Tab */}
              {activeTab === 'logs' && (
                <div className="logs-section">
                  {logsError && (
                    <div className="error-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                      </svg>
                      {logsError}
                    </div>
                  )}

                  <div className="logs-filters">
                    <div className="filter-group">
                      <label>Filter by:</label>
                      <select
                        value={logsFilter}
                        onChange={(e) => setLogsFilter(e.target.value as 'all' | 'patient' | 'consultation')}
                      >
                        <option value="all">All Activities</option>
                        <option value="patient">Patient Activities</option>
                        <option value="consultation">Consultation Activities</option>
                      </select>
                    </div>

                    <div className="filter-group">
                      <label>Show:</label>
                      <select
                        value={logsLimit}
                        onChange={(e) => setLogsLimit(parseInt(e.target.value))}
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
                      disabled={logsLoading}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="1,4 1,10 7,10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                      Refresh
                    </button>
                  </div>

                  {logsLoading ? (
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
                                {formatLogDateTime(log.performed_at)}
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
              )}
            </>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            <button className="btn-secondary" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="footer-right">
            <button className="btn-secondary" onClick={handleEdit}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>
              </svg>
              Edit Patient
            </button>
          </div>
        </div>
      </div>

      {/* Modal Components */}
      <PatientContactModal
        isOpen={contactModalOpen}
        patient={patient}
        contact={selectedContact}
        onClose={() => {
          setContactModalOpen(false);
          setSelectedContact(null);
        }}
        onContactSaved={handleContactSaved}
      />

      <MedicalHistoryModal
        isOpen={medicalHistoryModalOpen}
        patient={patient}
        medicalHistory={medicalHistory}
        onClose={() => setMedicalHistoryModalOpen(false)}
        onMedicalHistorySaved={handleMedicalHistorySaved}
      />
    </div>
  );
};

export default ViewPatientModal;