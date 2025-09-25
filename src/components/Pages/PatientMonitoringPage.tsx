import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './PatientMonitoringPage.css';
import './PagesStyles.css';
import {
  patientMonitoringService,
  type Patient,
  type Consultation,
  type PatientStats,
  type VitalSigns
} from '../../services/supabaseService';
import AddPatientModal from '../Modals/PatientModals/AddPatientModal';
import ViewPatientModal from '../Modals/PatientModals/ViewPatientModal';
import ArchivePatientModal from '../Modals/PatientModals/ArchivePatientModal';
import StartConsultationModal from '../Modals/ConsultationModals/StartConsultationModal';
import ConsultationModal from '../Modals/ConsultationModals/ConsultationModal';
import VitalSignsModal from '../Modals/ConsultationModals/VitalSignsModal';
import GlasgowComaScaleModal from '../Modals/ConsultationModals/GlasgowComaScaleModal';
import ConsultationAttachmentsModal from '../Modals/ConsultationModals/ConsultationAttachmentsModal';

const PatientMonitoringPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [vitalSignsData, setVitalSignsData] = useState<(VitalSigns & { consultation: Consultation; patient?: Patient })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [vitalsSearchQuery, setVitalsSearchQuery] = useState('');
  const [vitalsDateFilter, setVitalsDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);

  // Modal state management
  const [isAddPatientModalOpen, setIsAddPatientModalOpen] = useState(false);
  const [isViewPatientModalOpen, setIsViewPatientModalOpen] = useState(false);
  const [isArchivePatientModalOpen, setIsArchivePatientModalOpen] = useState(false);
  const [isStartConsultationModalOpen, setIsStartConsultationModalOpen] = useState(false);
  const [isConsultationModalOpen, setIsConsultationModalOpen] = useState(false);
  const [isVitalSignsModalOpen, setIsVitalSignsModalOpen] = useState(false);
  const [isGlasgowComaScaleModalOpen, setIsGlasgowComaScaleModalOpen] = useState(false);
  const [isAttachmentsModalOpen, setIsAttachmentsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientMonitoringService.getActivePatients();
      setPatients(data);
    } catch (error: any) {
      console.error('Error fetching patients:', error);
      setError(`Failed to load patients: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchConsultations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await patientMonitoringService.getConsultations(true);
      setConsultations(data);
    } catch (error: any) {
      console.error('Error fetching consultations:', error);
      setError(`Failed to load consultations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVitalSigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all consultations first
      const consultationsData = await patientMonitoringService.getConsultations(true);

      // For each consultation, get vital signs
      const vitalsPromises = consultationsData.map(async (consultation) => {
        const vitals = await patientMonitoringService.getVitalSignsByConsultationId(consultation.id);
        return vitals.map(vital => ({
          ...vital,
          consultation,
          patient: consultation.patient
        }));
      });

      const allVitalsArrays = await Promise.all(vitalsPromises);
      const flattenedVitals = allVitalsArrays.flat();

      // Sort by recorded_at date (most recent first)
      flattenedVitals.sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

      setVitalSignsData(flattenedVitals);
    } catch (error: any) {
      console.error('Error fetching vital signs:', error);
      setError(`Failed to load vital signs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    fetchConsultations();
    if (activeTab === 'vitals') {
      fetchVitalSigns();
    }
  }, [fetchPatients, fetchConsultations, fetchVitalSigns, activeTab]);

  const stats = useMemo((): PatientStats => {
    const today = new Date().toISOString().split('T')[0];
    return {
      totalPatients: patients.filter(p => p.status === 'active').length,
      activeConsultations: consultations.filter(c => c.status === 'active').length,
      todayConsultations: consultations.filter(c => c.consultation_date === today).length,
      studentsCount: patients.filter(p => p.patient_type === 'Student' && p.status === 'active').length,
      employeesCount: patients.filter(p => p.patient_type === 'Employee' && p.status === 'active').length,
      opdCount: patients.filter(p => p.patient_type === 'OPD' && p.status === 'active').length
    };
  }, [patients, consultations]);

  const filteredPatients = useMemo(() => {
    return patients.filter(patient => {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch =
        patient.first_name.toLowerCase().includes(searchLower) ||
        patient.last_name.toLowerCase().includes(searchLower) ||
        patient.patient_id.toLowerCase().includes(searchLower);
      const statusMatch = statusFilter === 'all' || patient.status === statusFilter;
      const typeMatch = typeFilter === 'all' || patient.patient_type === typeFilter;
      return nameMatch && statusMatch && typeMatch;
    });
  }, [patients, searchQuery, statusFilter, typeFilter]);

  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  const filteredVitalSigns = useMemo(() => {
    return vitalSignsData.filter(vital => {
      if (!vital.patient) return false;

      const searchLower = vitalsSearchQuery.toLowerCase();
      const patientNameMatch =
        vital.patient.first_name.toLowerCase().includes(searchLower) ||
        vital.patient.last_name.toLowerCase().includes(searchLower) ||
        vital.patient.patient_id.toLowerCase().includes(searchLower);

      const dateMatch = !vitalsDateFilter ||
        vital.recorded_at.split('T')[0] === vitalsDateFilter;

      return patientNameMatch && dateMatch;
    });
  }, [vitalSignsData, vitalsSearchQuery, vitalsDateFilter]);

  const paginatedVitalSigns = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVitalSigns.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVitalSigns, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(
    activeTab === 'vitals' ? filteredVitalSigns.length / itemsPerPage :
    filteredPatients.length / itemsPerPage
  );

  const handleAddPatient = () => {
    setIsAddPatientModalOpen(true);
  };

  const handleViewPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewPatientModalOpen(true);
  };

  const handleEditPatient = (patient: Patient) => {
    // This will be implemented when EditPatientModal is created
    console.log('Edit patient:', patient);
  };

  const handleNewConsultation = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsStartConsultationModalOpen(true);
  };

  const handlePatientSaved = (patient: Patient) => {
    // Refresh the patients list
    fetchPatients();
    setIsAddPatientModalOpen(false);
  };

  const handleCloseAddPatientModal = () => {
    setIsAddPatientModalOpen(false);
  };

  const handleCloseViewPatientModal = () => {
    setIsViewPatientModalOpen(false);
    setSelectedPatient(null);
  };

  const handleArchivePatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsArchivePatientModalOpen(true);
  };

  const handlePatientArchived = (patient: Patient) => {
    // Refresh the patients list to remove the archived patient
    fetchPatients();
    setIsArchivePatientModalOpen(false);
    setSelectedPatient(null);
  };

  const handleCloseArchivePatientModal = () => {
    setIsArchivePatientModalOpen(false);
    setSelectedPatient(null);
  };

  // Consultation Modal Handlers
  const handleConsultationStarted = (consultation: Consultation) => {
    fetchConsultations(); // Refresh consultations list
    setIsStartConsultationModalOpen(false);
    setSelectedPatient(null);
    // Optionally open the consultation modal directly
    setSelectedConsultation(consultation);
    setIsConsultationModalOpen(true);
  };

  const handleCloseStartConsultationModal = () => {
    setIsStartConsultationModalOpen(false);
    setSelectedPatient(null);
  };

  const handleContinueConsultation = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsConsultationModalOpen(true);
  };

  const handleViewConsultationDetails = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsConsultationModalOpen(true);
  };

  const handleConsultationUpdated = (consultation: Consultation) => {
    fetchConsultations(); // Refresh consultations list
  };

  const handleConsultationCompleted = (consultation: Consultation) => {
    fetchConsultations(); // Refresh consultations list
    setIsConsultationModalOpen(false);
    setSelectedConsultation(null);
  };

  const handleCloseConsultationModal = () => {
    setIsConsultationModalOpen(false);
    setSelectedConsultation(null);
  };

  // Vital Signs Modal Handlers
  const handleOpenVitalSignsModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsVitalSignsModalOpen(true);
  };

  const handleVitalSignsRecorded = () => {
    fetchConsultations(); // Refresh consultations list to update vital_signs_recorded flag
    setIsVitalSignsModalOpen(false);
    setSelectedConsultation(null);
  };

  const handleCloseVitalSignsModal = () => {
    setIsVitalSignsModalOpen(false);
    setSelectedConsultation(null);
  };

  // Glasgow Coma Scale Modal Handlers
  const handleOpenGlasgowComaScaleModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsGlasgowComaScaleModalOpen(true);
  };

  const handleGlasgowComaScaleRecorded = () => {
    fetchConsultations(); // Refresh consultations list to update glasgow_coma_recorded flag
    setIsGlasgowComaScaleModalOpen(false);
    setSelectedConsultation(null);
  };

  const handleCloseGlasgowComaScaleModal = () => {
    setIsGlasgowComaScaleModalOpen(false);
    setSelectedConsultation(null);
  };

  const handleOpenAttachmentsModal = (consultation: Consultation) => {
    setSelectedConsultation(consultation);
    setIsAttachmentsModalOpen(true);
  };

  const handleCloseAttachmentsModal = () => {
    setIsAttachmentsModalOpen(false);
    setSelectedConsultation(null);
  };

  const renderStatsCards = () => {
    const statCards = [
      {
        title: 'Total Patients',
        value: stats.totalPatients.toString(),
        change: 'Active patients',
        changeType: 'neutral',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        )
      },
      {
        title: 'Active Consultations',
        value: stats.activeConsultations.toString(),
        change: 'Ongoing consultations',
        changeType: stats.activeConsultations > 0 ? 'warning' : 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        )
      },
      {
        title: 'Today\'s Consultations',
        value: stats.todayConsultations.toString(),
        change: 'Consultations today',
        changeType: 'neutral',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8" y1="2" x2="8" y2="6"/>
            <line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        )
      },
      {
        title: 'Students',
        value: stats.studentsCount.toString(),
        change: `${stats.employeesCount} employees`,
        changeType: 'neutral',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        )
      }
    ];

    return (
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className={`stat-card ${stat.changeType}`}>
            <div className="stat-icon">
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPatientCard = (patient: Patient) => (
    <div key={patient.id} className="patient-card">
      <div className="card-header">
        <div className="patient-type">
          <div className="type-icon">
            {patient.patient_type === 'Student' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
                <path d="M6 12v5c3 3 9 3 12 0v-5"/>
              </svg>
            ) : patient.patient_type === 'Employee' ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            )}
          </div>
          <span>{patient.patient_type}</span>
        </div>
        <div className="patient-status">
          <span className={`status-badge ${patient.status}`}>
            {patient.status}
          </span>
        </div>
      </div>

      <div className="card-content">
        <div className="patient-name">
          {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
        </div>
        <div className="patient-id">ID: {patient.patient_id}</div>

        <div className="patient-info">
          <div className="info-row">
            <div className="info-item">
              <span className="info-label">Age</span>
              <span className="info-value">{patient.age || 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sex</span>
              <span className="info-value">{patient.sex}</span>
            </div>
          </div>

          <div className="info-row">
            <div className="info-item">
              <span className="info-label">Type</span>
              <span className="info-value">{patient.patient_type}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Status</span>
              <span className="info-value">{patient.civil_status}</span>
            </div>
          </div>

          {patient.course_department && (
            <div className="info-row">
              <div className="info-item full-width">
                <span className="info-label">Department</span>
                <span className="info-value">{patient.course_department}</span>
              </div>
            </div>
          )}

          {patient.phone && (
            <div className="info-row">
              <div className="info-item full-width">
                <span className="info-label">Phone</span>
                <span className="info-value">{patient.phone}</span>
              </div>
            </div>
          )}
        </div>

        <div className="card-actions">
          <button
            className="btn-primary"
            onClick={() => handleViewPatient(patient)}
          >
            View Details
          </button>
          <button
            className="btn-secondary"
            onClick={() => handleNewConsultation(patient)}
          >
            New Consultation
          </button>
          <button
            className="btn-warning"
            onClick={() => handleArchivePatient(patient)}
            title="Archive Patient"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="5" x="2" y="3" rx="1"/>
              <path d="m4 8 16 0"/>
              <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13"/>
            </svg>
            Archive
          </button>
        </div>
      </div>
    </div>
  );

  const renderPagination = () => (
    <div className="pagination">
      <button
        className="pagination-btn"
        disabled={currentPage === 1}
        onClick={() => setCurrentPage(currentPage - 1)}
      >
        Previous
      </button>

      <div className="pagination-pages">
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const page = i + 1;
          return (
            <button
              key={page}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          );
        })}
      </div>

      <div className="pagination-info">
        Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredPatients.length)} of {filteredPatients.length} patients
      </div>

      <button
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Patient Monitoring</h1>
        <p className="page-subtitle">Comprehensive patient care and consultation management system</p>
      </div>

      {renderStatsCards()}

      {/* Tab Navigation */}
      <div className="tabs-container">
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="9" rx="1"/>
              <rect x="14" y="3" width="7" height="5" rx="1"/>
              <rect x="14" y="12" width="7" height="9" rx="1"/>
              <rect x="3" y="16" width="7" height="5" rx="1"/>
            </svg>
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => setActiveTab('patients')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Patients
          </button>
          <button
            className={`tab-btn ${activeTab === 'consultations' ? 'active' : ''}`}
            onClick={() => setActiveTab('consultations')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Active Consultations
          </button>
          <button
            className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
            onClick={() => setActiveTab('vitals')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
            Vital Signs
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'patients' && (
        <div className="tab-content">
          {/* Filters */}
          <div className="filters-section">
            <div className="filters-row">
              <div className="search-box-large">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by name or patient ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Type:</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="Student">Student</option>
                  <option value="Employee">Employee</option>
                  <option value="Dependent">Dependent</option>
                  <option value="OPD">OPD</option>
                </select>
              </div>

              <div className="action-buttons">
                <button
                  className="btn-primary"
                  onClick={handleAddPatient}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Patient
                </button>
              </div>
            </div>
          </div>

          {/* Patients Grid */}
          {loading ? (
            <div className="loading-message">Loading patients...</div>
          ) : error ? (
            <div className="error-container">
              <div className="error-message">{error}</div>
              <button className="btn-secondary" onClick={() => {
                fetchPatients();
                fetchConsultations();
              }}>
                Retry
              </button>
            </div>
          ) : paginatedPatients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="empty-state-content">
                <h3>No Patients Found</h3>
                <p>
                  {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                    ? 'No patients match your current filters.'
                    : 'There are no patients registered in the system yet.'
                  }
                </p>
                <button className="btn-primary" onClick={handleAddPatient}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add First Patient
                </button>
              </div>
            </div>
          ) : (
            <div className="patients-grid">
              {paginatedPatients.map(renderPatientCard)}
            </div>
          )}

          {totalPages > 1 && !loading && !error && renderPagination()}
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="tab-content">
          <div className="overview-grid">
            <div className="overview-card">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {consultations.slice(0, 5).map(consultation => (
                  <div key={consultation.id} className="activity-item">
                    <div className="activity-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                    </div>
                    <div className="activity-content">
                      <div className="activity-title">
                        New consultation: {consultation.patient?.first_name} {consultation.patient?.last_name}
                      </div>
                      <div className="activity-time">
                        {consultation.consultation_date} at {consultation.time_in}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="overview-card">
              <h3>Quick Stats</h3>
              <div className="quick-stats">
                <div className="quick-stat">
                  <span className="stat-number">{stats.studentsCount}</span>
                  <span className="stat-label">Students</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-number">{stats.employeesCount}</span>
                  <span className="stat-label">Employees</span>
                </div>
                <div className="quick-stat">
                  <span className="stat-number">{stats.opdCount}</span>
                  <span className="stat-label">OPD Patients</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'consultations' && (
        <div className="tab-content">
          <div className="consultations-grid">
            {consultations.filter(c => c.status === 'active').map(consultation => (
              <div key={consultation.id} className="consultation-card">
                <div className="card-header">
                  <div className="consultation-status">
                    <span className="status-badge active">Active</span>
                  </div>
                  <div className="consultation-time">
                    {consultation.consultation_date} - {consultation.time_in}
                  </div>
                </div>
                <div className="card-content">
                  <div className="consultation-case">Case: {consultation.case_number}</div>
                  <div className="consultation-patient">
                    Patient: {consultation.patient?.first_name} {consultation.patient?.last_name}
                  </div>
                  <div className="consultation-complaint">
                    Chief Complaint: {consultation.chief_complaint}
                  </div>
                  {consultation.diagnosis && (
                    <div className="consultation-diagnosis">
                      Diagnosis: {consultation.diagnosis}
                    </div>
                  )}
                  <div className="card-actions">
                    <button
                      className="btn-primary"
                      onClick={() => handleContinueConsultation(consultation)}
                    >
                      Continue
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleViewConsultationDetails(consultation)}
                    >
                      View Details
                    </button>
                    <button
                      className="btn-info"
                      onClick={() => handleOpenVitalSignsModal(consultation)}
                      disabled={consultation.status !== 'active'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                      </svg>
                      Vital Signs
                    </button>
                    <button
                      className="btn-warning"
                      onClick={() => handleOpenGlasgowComaScaleModal(consultation)}
                      disabled={consultation.status !== 'active'}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 12l2 2 4-4"/>
                        <circle cx="12" cy="12" r="10"/>
                      </svg>
                      Glasgow
                    </button>
                    <button
                      className="btn-info"
                      onClick={() => handleOpenAttachmentsModal(consultation)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                      </svg>
                      Files
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'vitals' && (
        <div className="tab-content">
          {/* Vitals Filters */}
          <div className="filters-section">
            <div className="filters-row">
              <div className="search-box-large">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <input
                  type="text"
                  placeholder="Search by patient name or ID..."
                  value={vitalsSearchQuery}
                  onChange={(e) => setVitalsSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={vitalsDateFilter}
                  onChange={(e) => setVitalsDateFilter(e.target.value)}
                />
              </div>

              <div className="action-buttons">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setVitalsSearchQuery('');
                    setVitalsDateFilter('');
                  }}
                >
                  Clear Filters
                </button>
                <button
                  className="btn-primary"
                  onClick={fetchVitalSigns}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 4v6h6"/>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Vitals Grid */}
          {loading ? (
            <div className="loading-message">Loading vital signs...</div>
          ) : error ? (
            <div className="error-container">
              <div className="error-message">{error}</div>
              <button className="btn-secondary" onClick={fetchVitalSigns}>
                Retry
              </button>
            </div>
          ) : paginatedVitalSigns.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
              </div>
              <div className="empty-state-content">
                <h3>No Vital Signs Found</h3>
                <p>
                  {vitalsSearchQuery || vitalsDateFilter
                    ? 'No vital signs match your current filters.'
                    : 'There are no vital signs recorded in the system yet.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="vitals-grid">
              {paginatedVitalSigns.map(vital => (
                <div key={vital.id} className="vital-signs-card">
                  <div className="card-header">
                    <div className="vital-patient">
                      <div className="patient-info">
                        <div className="patient-name">
                          {vital.patient?.first_name} {vital.patient?.last_name}
                        </div>
                        <div className="patient-id">ID: {vital.patient?.patient_id}</div>
                      </div>
                    </div>
                    <div className="vital-date">
                      {new Date(vital.recorded_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="consultation-info">
                      <div className="consultation-case">Case: {vital.consultation?.case_number}</div>
                      <div className="consultation-date">
                        {vital.consultation?.consultation_date} at {vital.consultation?.time_in}
                      </div>
                    </div>

                    <div className="vital-measurements">
                      <div className="measurement-grid">
                        {vital.blood_pressure_systolic && vital.blood_pressure_diastolic && (
                          <div className="measurement-item">
                            <span className="measurement-label">Blood Pressure</span>
                            <span className="measurement-value">
                              {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic} mmHg
                            </span>
                          </div>
                        )}

                        {vital.temperature && (
                          <div className="measurement-item">
                            <span className="measurement-label">Temperature</span>
                            <span className="measurement-value">{vital.temperature}°C</span>
                          </div>
                        )}

                        {vital.pulse_rate && (
                          <div className="measurement-item">
                            <span className="measurement-label">Pulse Rate</span>
                            <span className="measurement-value">{vital.pulse_rate} bpm</span>
                          </div>
                        )}

                        {vital.respiratory_rate && (
                          <div className="measurement-item">
                            <span className="measurement-label">Respiratory Rate</span>
                            <span className="measurement-value">{vital.respiratory_rate} /min</span>
                          </div>
                        )}

                        {vital.oxygen_saturation && (
                          <div className="measurement-item">
                            <span className="measurement-label">Oxygen Saturation</span>
                            <span className="measurement-value">{vital.oxygen_saturation}%</span>
                          </div>
                        )}

                        {vital.height && (
                          <div className="measurement-item">
                            <span className="measurement-label">Height</span>
                            <span className="measurement-value">{vital.height} cm</span>
                          </div>
                        )}

                        {vital.weight && (
                          <div className="measurement-item">
                            <span className="measurement-label">Weight</span>
                            <span className="measurement-value">{vital.weight} kg</span>
                          </div>
                        )}

                        {vital.mode_of_arrival && (
                          <div className="measurement-item">
                            <span className="measurement-label">Mode of Arrival</span>
                            <span className="measurement-value">{vital.mode_of_arrival}</span>
                          </div>
                        )}
                      </div>

                      {vital.patient_in_pain && (
                        <div className="pain-info">
                          <div className="measurement-item">
                            <span className="measurement-label">Pain Scale</span>
                            <span className="measurement-value pain-scale">
                              {vital.pain_scale}/10
                            </span>
                          </div>
                        </div>
                      )}

                      {vital.patient_has_injuries && (
                        <div className="injury-info">
                          <div className="injury-label">Injuries Reported:</div>
                          <div className="injury-types">
                            {vital.injury_abrasion && <span className="injury-badge">Abrasion</span>}
                            {vital.injury_contusion && <span className="injury-badge">Contusion</span>}
                            {vital.injury_fracture && <span className="injury-badge">Fracture</span>}
                            {vital.injury_laceration && <span className="injury-badge">Laceration</span>}
                            {vital.injury_puncture && <span className="injury-badge">Puncture</span>}
                            {vital.injury_sprain && <span className="injury-badge">Sprain</span>}
                            {vital.injury_other && <span className="injury-badge">Other: {vital.injury_other}</span>}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="vital-actions">
                      <button
                        className="btn-primary"
                        onClick={() => handleViewConsultationDetails(vital.consultation)}
                      >
                        View Consultation
                      </button>
                      <button
                        className="btn-info"
                        onClick={() => handleOpenVitalSignsModal(vital.consultation)}
                        disabled={vital.consultation?.status !== 'active'}
                      >
                        Update Vitals
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && !loading && !error && activeTab === 'vitals' && (
            <div className="pagination">
              <button
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>

              <div className="pagination-pages">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>

              <div className="pagination-info">
                Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredVitalSigns.length)} of {filteredVitalSigns.length} vital signs
              </div>

              <button
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <AddPatientModal
        isOpen={isAddPatientModalOpen}
        onClose={handleCloseAddPatientModal}
        onSave={handlePatientSaved}
      />

      <ViewPatientModal
        isOpen={isViewPatientModalOpen}
        patient={selectedPatient}
        onClose={handleCloseViewPatientModal}
        onEdit={handleEditPatient}
        onNewConsultation={handleNewConsultation}
      />

      <ArchivePatientModal
        isOpen={isArchivePatientModalOpen}
        patient={selectedPatient}
        onClose={handleCloseArchivePatientModal}
        onPatientArchived={handlePatientArchived}
      />

      <StartConsultationModal
        isOpen={isStartConsultationModalOpen}
        patient={selectedPatient}
        onClose={handleCloseStartConsultationModal}
        onConsultationStarted={handleConsultationStarted}
      />

      <ConsultationModal
        isOpen={isConsultationModalOpen}
        consultation={selectedConsultation}
        onClose={handleCloseConsultationModal}
        onConsultationUpdated={handleConsultationUpdated}
        onConsultationCompleted={handleConsultationCompleted}
      />

      <VitalSignsModal
        isOpen={isVitalSignsModalOpen}
        consultation={selectedConsultation}
        onClose={handleCloseVitalSignsModal}
        onVitalSignsRecorded={handleVitalSignsRecorded}
      />

      <GlasgowComaScaleModal
        isOpen={isGlasgowComaScaleModalOpen}
        consultation={selectedConsultation}
        onClose={handleCloseGlasgowComaScaleModal}
        onGlasgowComaScaleRecorded={handleGlasgowComaScaleRecorded}
      />

      <ConsultationAttachmentsModal
        isOpen={isAttachmentsModalOpen}
        consultation={selectedConsultation}
        onClose={handleCloseAttachmentsModal}
      />
    </div>
  );
};

export default PatientMonitoringPage;