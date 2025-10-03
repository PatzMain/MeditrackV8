import React, { useState, useEffect, useCallback } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Consultation,
  type VitalSigns,
  type GlasgowComaScale,
  type ConsultationAttachment
} from '../../../services/supabaseService';
import VitalSignsModal from './VitalSignsModal';
import GlasgowComaScaleModal from './GlasgowComaScaleModal';
import ConsultationAttachmentsModal from './ConsultationAttachmentsModal';
import '../PatientModals/PatientModals.css';

interface ConsultationModalProps {
  isOpen: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onConsultationUpdated: (consultation: Consultation) => void;
  onConsultationCompleted: (consultation: Consultation) => void;
}

const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  consultation,
  onClose,
  onConsultationUpdated,
  onConsultationCompleted
}) => {
  const [activeTab, setActiveTab] = useState('soap');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // SOAP Notes state
  const [soapNotes, setSoapNotes] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });

  // Consultation data state
  const [consultationData, setConsultationData] = useState({
    chief_complaint: '',
    status: 'active' as 'active' | 'completed' | 'cancelled',
    diagnosis: '',
    interventions: '',
    notes: ''
  });

  // Save state tracking
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Vital signs and Glasgow Coma Scale data
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [glasgowComaScale, setGlasgowComaScale] = useState<GlasgowComaScale[]>([]);
  const [attachments, setAttachments] = useState<ConsultationAttachment[]>([]);

  // Modal states
  const [vitalSignsModalOpen, setVitalSignsModalOpen] = useState(false);
  const [glasgowModalOpen, setGlasgowModalOpen] = useState(false);
  const [attachmentsModalOpen, setAttachmentsModalOpen] = useState(false);

  // Edit states
  const [editingVitalSigns, setEditingVitalSigns] = useState<VitalSigns | null>(null);
  const [editingGlasgow, setEditingGlasgow] = useState<GlasgowComaScale | null>(null);

  // Load consultation data when modal opens
  const loadConsultationData = useCallback(async () => {
    if (!consultation) return;

    try {
      setLoading(true);
      setError(null);

      // Load vital signs, Glasgow Coma Scale, and attachments data
      const [vitalSignsData, glasgowData, attachmentsData] = await Promise.all([
        patientMonitoringService.getVitalSignsByConsultationId(consultation.id),
        patientMonitoringService.getGlasgowComaScalesByConsultationId(consultation.id),
        patientMonitoringService.getConsultationAttachments(consultation.id)
      ]);

      setVitalSigns(vitalSignsData);
      setGlasgowComaScale(glasgowData);
      setAttachments(attachmentsData);

      // Initialize SOAP notes from consultation data
      setSoapNotes({
        subjective: consultation.subjective_notes || '',
        objective: consultation.objective_notes || '',
        assessment: consultation.assessment_notes || '',
        plan: consultation.plan_notes || ''
      });

      // Initialize consultation form data
      setConsultationData({
        chief_complaint: consultation.chief_complaint || '',
        status: consultation.status || 'active',
        diagnosis: consultation.diagnosis || '',
        interventions: consultation.interventions || '',
        notes: consultation.assessment_notes || ''
      });

    } catch (error: any) {
      console.error('Error loading consultation data:', error);
      setError('Failed to load consultation data');
    } finally {
      setLoading(false);
    }
  }, [consultation]);

  useEffect(() => {
    if (isOpen && consultation) {
      loadConsultationData();
    }
  }, [isOpen, consultation, loadConsultationData]);

  const handleSoapNotesChange = (field: keyof typeof soapNotes, value: string) => {
    setSoapNotes(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConsultationDataChange = (field: string, value: any) => {
    setConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveProgress = async () => {
    if (!consultation) return;

    try {
      setIsSaving(true);
      setError(null);

      const updatedConsultation: Partial<Consultation> = {
        chief_complaint: consultationData.chief_complaint,
        subjective_notes: soapNotes.subjective,
        objective_notes: soapNotes.objective,
        assessment_notes: soapNotes.assessment,
        plan_notes: soapNotes.plan,
        diagnosis: consultationData.diagnosis,
        interventions: consultationData.interventions
      };

      const updated = await patientMonitoringService.updateConsultation(consultation.id, updatedConsultation);

      // Update last saved timestamp
      setLastSaved(new Date());

      // Log activity
      await activityService.logActivity({
        action: 'update_consultation',
        description: `Updated consultation progress for case ${consultation.case_number}`,
        details: {
          consultation_id: consultation.id,
          case_number: consultation.case_number,
          patient_id: consultation.patient_id
        }
      });

      onConsultationUpdated(updated);

      // Show success feedback briefly
      setTimeout(() => setIsSaving(false), 500);
    } catch (error: any) {
      console.error('Error saving consultation progress:', error);
      setError('Failed to save consultation progress');
      setIsSaving(false);
    }
  };

  const handleCompleteConsultation = async () => {
    if (!consultation) return;

    if (!soapNotes.assessment.trim() || !soapNotes.plan.trim()) {
      setError('Assessment and Plan are required to complete the consultation');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentTime = new Date();
      const timeOut = currentTime.toTimeString().split(' ')[0].slice(0, 5);

      const completedConsultation: Partial<Consultation> = {
        chief_complaint: consultationData.chief_complaint,
        subjective_notes: soapNotes.subjective,
        objective_notes: soapNotes.objective,
        assessment_notes: soapNotes.assessment,
        plan_notes: soapNotes.plan,
        diagnosis: consultationData.diagnosis,
        interventions: consultationData.interventions,
        time_out: timeOut,
        status: 'completed'
      };

      const updated = await patientMonitoringService.updateConsultation(consultation.id, completedConsultation);

      // Log activity
      await activityService.logActivity({
        action: 'complete_consultation',
        description: `Completed consultation for case ${consultation.case_number}`,
        details: {
          consultation_id: consultation.id,
          case_number: consultation.case_number,
          patient_id: consultation.patient_id,
          diagnosis: consultationData.diagnosis
        }
      });

      onConsultationCompleted(updated);
      handleClose();
    } catch (error: any) {
      console.error('Error completing consultation:', error);
      setError('Failed to complete consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveTab('soap');
    setSoapNotes({
      subjective: '',
      objective: '',
      assessment: '',
      plan: ''
    });
    setConsultationData({
      chief_complaint: '',
      status: 'active',
      diagnosis: '',
      interventions: '',
      notes: ''
    });
    setError(null);
    setIsSaving(false);
    setLastSaved(null);
    onClose();
  };

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return 'N/A';
    const formattedDate = new Date(date).toLocaleDateString();
    return time ? `${formattedDate} at ${time}` : formattedDate;
  };

  const handleVitalSignsRecorded = async (vitalSigns: VitalSigns) => {
    // Reload all vital signs to ensure we have the latest data
    await loadConsultationData();
    setVitalSignsModalOpen(false);
    setEditingVitalSigns(null);
  };

  const handleGlasgowComaScaleRecorded = async (glasgow: GlasgowComaScale) => {
    // Reload all Glasgow assessments to ensure we have the latest data
    await loadConsultationData();
    setGlasgowModalOpen(false);
    setEditingGlasgow(null);
  };

  const handleEditVitalSigns = (vital: VitalSigns) => {
    setEditingVitalSigns(vital);
    setVitalSignsModalOpen(true);
  };

  const handleEditGlasgow = (glasgow: GlasgowComaScale) => {
    setEditingGlasgow(glasgow);
    setGlasgowModalOpen(true);
  };

  const handleDeleteVitalSigns = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vital signs record?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from Supabase
      await patientMonitoringService.deleteVitalSigns(id);

      // Log activity
      await activityService.logActivity({
        action: 'delete_vital_signs',
        description: `Deleted vital signs record for case ${consultation?.case_number}`,
        details: {
          consultation_id: consultation?.id,
          vital_signs_id: id
        }
      });

      // Reload data
      await loadConsultationData();
    } catch (error: any) {
      console.error('Error deleting vital signs:', error);
      setError('Failed to delete vital signs record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGlasgow = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this Glasgow Coma Scale assessment?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Delete from Supabase
      await patientMonitoringService.deleteGlasgowComaScale(id);

      // Log activity
      await activityService.logActivity({
        action: 'delete_glasgow_coma_scale',
        description: `Deleted Glasgow Coma Scale assessment for case ${consultation?.case_number}`,
        details: {
          consultation_id: consultation?.id,
          glasgow_id: id
        }
      });

      // Reload data
      await loadConsultationData();
    } catch (error: any) {
      console.error('Error deleting Glasgow Coma Scale:', error);
      setError('Failed to delete Glasgow Coma Scale assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleAttachmentAdded = async (attachment: ConsultationAttachment) => {
    // Reload consultation data to get latest attachments
    await loadConsultationData();
    setAttachmentsModalOpen(false);
  };

  if (!isOpen || !consultation) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container extra-large">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Consultation Management</h2>
            <p className="modal-subtitle">
              Case: {consultation.case_number} | Patient: {consultation.patient?.first_name} {consultation.patient?.last_name}
            </p>
            <div className="consultation-meta">
              <span className={`status-badge ${consultation.status}`}>{consultation.status}</span>
              <span className="consultation-date">
                {formatDateTime(consultation.consultation_date, consultation.time_in)}
              </span>
              {consultation.time_out && (
                <span className="consultation-time-out">
                  Completed: {consultation.time_out}
                </span>
              )}
            </div>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}

          {/* Tab Navigation */}
          <div className="tabs-container">
            <div className="tab-navigation">
              <button
                className={`tab-btn ${activeTab === 'soap' ? 'active' : ''}`}
                onClick={() => setActiveTab('soap')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14,2 14,8 20,8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10,9 9,9 8,9"/>
                </svg>
                SOAP Notes
              </button>
              <button
                className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveTab('details')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 11H5a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h4m6-6h4a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-4m-6 0V9a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/>
                </svg>
                Details
              </button>
              <button
                className={`tab-btn ${activeTab === 'vitals' ? 'active' : ''}`}
                onClick={() => setActiveTab('vitals')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Vitals ({vitalSigns.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'glasgow' ? 'active' : ''}`}
                onClick={() => setActiveTab('glasgow')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Glasgow Coma ({glasgowComaScale.length})
              </button>
              <button
                className={`tab-btn ${activeTab === 'attachments' ? 'active' : ''}`}
                onClick={() => setActiveTab('attachments')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                </svg>
                Attachments ({attachments.length})
              </button>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'soap' && (
            <div className="tab-content">
              <div className="soap-notes-header">
                <div className="soap-header-content">
                  <h3>SOAP Notes Documentation</h3>
                  <p className="soap-subtitle">Comprehensive clinical documentation following the SOAP methodology</p>
                </div>
                {lastSaved && (
                  <div className="last-saved-indicator">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              <div className="soap-notes-container">
                <div className="soap-note-card">
                  <div className="soap-note-header">
                    <div className="soap-letter-badge subjective">S</div>
                    <div className="soap-note-title">
                      <h4>Subjective</h4>
                      <p>Patient's reported symptoms, concerns, and medical history</p>
                    </div>
                  </div>
                  <textarea
                    className="soap-textarea"
                    placeholder="Document the patient's complaints, symptoms, and subjective experiences. Include:
- Chief complaint and onset
- Description of symptoms (location, quality, severity, timing)
- Patient's medical history relevant to current complaint
- Review of systems
- Patient's concerns and expectations"
                    value={soapNotes.subjective}
                    onChange={(e) => handleSoapNotesChange('subjective', e.target.value)}
                    rows={6}
                    disabled={consultation.status === 'completed'}
                  />
                  <div className="character-count">
                    {soapNotes.subjective.length} characters
                  </div>
                </div>

                <div className="soap-note-card">
                  <div className="soap-note-header">
                    <div className="soap-letter-badge objective">O</div>
                    <div className="soap-note-title">
                      <h4>Objective</h4>
                      <p>Observable clinical findings and measurable data</p>
                    </div>
                  </div>
                  <textarea
                    className="soap-textarea"
                    placeholder="Record objective clinical findings and examination results. Include:
- Vital signs (BP, HR, RR, Temp, O2 sat)
- Physical examination findings
- Laboratory and diagnostic test results
- Clinical observations
- Mental status examination"
                    value={soapNotes.objective}
                    onChange={(e) => handleSoapNotesChange('objective', e.target.value)}
                    rows={6}
                    disabled={consultation.status === 'completed'}
                  />
                  <div className="character-count">
                    {soapNotes.objective.length} characters
                  </div>
                </div>

                <div className="soap-note-card">
                  <div className="soap-note-header">
                    <div className="soap-letter-badge assessment">A</div>
                    <div className="soap-note-title">
                      <h4>Assessment</h4>
                      <p>Clinical judgment, diagnosis, and interpretation</p>
                    </div>
                  </div>
                  <textarea
                    className="soap-textarea"
                    placeholder="Provide clinical assessment and diagnosis. Include:
- Primary diagnosis (ICD code if applicable)
- Differential diagnoses
- Clinical reasoning and interpretation
- Disease severity and prognosis
- Risk factors and complications
- Progress notes for ongoing conditions"
                    value={soapNotes.assessment}
                    onChange={(e) => handleSoapNotesChange('assessment', e.target.value)}
                    rows={6}
                    disabled={consultation.status === 'completed'}
                  />
                  <div className="character-count">
                    {soapNotes.assessment.length} characters
                    {!soapNotes.assessment.trim() && consultation.status === 'active' && (
                      <span className="required-indicator">Required for completion</span>
                    )}
                  </div>
                </div>

                <div className="soap-note-card">
                  <div className="soap-note-header">
                    <div className="soap-letter-badge plan">P</div>
                    <div className="soap-note-title">
                      <h4>Plan</h4>
                      <p>Treatment plan, interventions, and follow-up instructions</p>
                    </div>
                  </div>
                  <textarea
                    className="soap-textarea"
                    placeholder="Document treatment plan and next steps. Include:
- Medications prescribed (name, dose, frequency, duration)
- Procedures or interventions performed
- Patient education and counseling
- Follow-up appointments and referrals
- Additional diagnostic tests ordered
- Discharge instructions and precautions"
                    value={soapNotes.plan}
                    onChange={(e) => handleSoapNotesChange('plan', e.target.value)}
                    rows={6}
                    disabled={consultation.status === 'completed'}
                  />
                  <div className="character-count">
                    {soapNotes.plan.length} characters
                    {!soapNotes.plan.trim() && consultation.status === 'active' && (
                      <span className="required-indicator">Required for completion</span>
                    )}
                  </div>
                </div>
              </div>

              {consultation.status !== 'completed' && (
                <div className="soap-actions">
                  <button
                    className="btn-primary"
                    onClick={handleSaveProgress}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" opacity="0.25"/>
                          <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round"/>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Save SOAP Notes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'details' && (
            <div className="tab-content">
              <div className="details-header">
                <div className="details-header-content">
                  <h3>Consultation Details</h3>
                  <p className="details-subtitle">Additional consultation information and administrative details</p>
                </div>
                {lastSaved && (
                  <div className="last-saved-indicator">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
                  </div>
                )}
              </div>

              <div className="consultation-details-form">
                <div className="details-section">
                  <h4 className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    Primary Information
                  </h4>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="chief-complaint">
                        Chief Complaint
                        <span className="required-mark">*</span>
                      </label>
                      <textarea
                        id="chief-complaint"
                        className="form-textarea"
                        placeholder="Main reason for the patient's visit or primary symptom..."
                        value={consultationData.chief_complaint}
                        onChange={(e) => handleConsultationDataChange('chief_complaint', e.target.value)}
                        rows={3}
                        disabled={consultation.status === 'completed'}
                      />
                      <small className="field-hint">Brief description of the patient's primary concern</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="consultation-status">
                        Consultation Status
                      </label>
                      <select
                        id="consultation-status"
                        className="form-select"
                        value={consultationData.status}
                        onChange={(e) => handleConsultationDataChange('status', e.target.value as 'active' | 'completed' | 'cancelled')}
                        disabled={consultation.status === 'completed'}
                      >
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <small className="field-hint">Current status of this consultation</small>
                    </div>

                    <div className="status-indicator-card">
                      <div className={`status-badge-large ${consultationData.status}`}>
                        {consultationData.status === 'active' && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                          </svg>
                        )}
                        {consultationData.status === 'completed' && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                          </svg>
                        )}
                        {consultationData.status === 'cancelled' && (
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="15" y1="9" x2="9" y2="15"/>
                            <line x1="9" y1="9" x2="15" y2="15"/>
                          </svg>
                        )}
                        <span>{consultationData.status.charAt(0).toUpperCase() + consultationData.status.slice(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="details-section">
                  <h4 className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                    </svg>
                    Clinical Information
                  </h4>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="diagnosis">
                        Diagnosis
                        <span className="info-icon" title="Final or working diagnosis">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"/>
                            <line x1="12" y1="16" x2="12" y2="12"/>
                            <line x1="12" y1="8" x2="12.01" y2="8"/>
                          </svg>
                        </span>
                      </label>
                      <textarea
                        id="diagnosis"
                        className="form-textarea"
                        placeholder="Primary diagnosis, ICD codes, differential diagnoses..."
                        value={consultationData.diagnosis}
                        onChange={(e) => handleConsultationDataChange('diagnosis', e.target.value)}
                        rows={4}
                        disabled={consultation.status === 'completed'}
                      />
                      <small className="field-hint">Include ICD-10 codes when applicable</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="interventions">
                        Interventions & Prescriptions
                      </label>
                      <textarea
                        id="interventions"
                        className="form-textarea"
                        placeholder="Medications prescribed, procedures performed, treatments administered...

Format:
- Medication name | Dosage | Frequency | Duration
- Procedure name | Details

Example:
- Amoxicillin 500mg | 3 times daily | 7 days
- Wound cleaning and dressing | Sterile technique applied"
                        value={consultationData.interventions}
                        onChange={(e) => handleConsultationDataChange('interventions', e.target.value)}
                        rows={6}
                        disabled={consultation.status === 'completed'}
                      />
                      <small className="field-hint">List all medications, procedures, and interventions</small>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="notes">
                        Additional Notes & Observations
                      </label>
                      <textarea
                        id="notes"
                        className="form-textarea"
                        placeholder="Additional clinical observations, patient education provided, special considerations, coordination of care..."
                        value={consultationData.notes}
                        onChange={(e) => handleConsultationDataChange('notes', e.target.value)}
                        rows={4}
                        disabled={consultation.status === 'completed'}
                      />
                      <small className="field-hint">Any other relevant information not covered above</small>
                    </div>
                  </div>
                </div>

                <div className="details-section metadata-section">
                  <h4 className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                      <line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/>
                      <line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    Consultation Metadata
                  </h4>

                  <div className="metadata-grid">
                    <div className="metadata-item">
                      <span className="metadata-label">Case Number</span>
                      <span className="metadata-value">{consultation.case_number}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Date</span>
                      <span className="metadata-value">
                        {new Date(consultation.consultation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Time In</span>
                      <span className="metadata-value">{consultation.time_in || 'N/A'}</span>
                    </div>
                    <div className="metadata-item">
                      <span className="metadata-label">Time Out</span>
                      <span className="metadata-value">{consultation.time_out || 'N/A'}</span>
                    </div>
                    {consultation.attending_physician_name && (
                      <div className="metadata-item">
                        <span className="metadata-label">Attending Physician</span>
                        <span className="metadata-value">{consultation.attending_physician_name}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {consultation.status !== 'completed' && (
                <div className="details-actions">
                  <button
                    className="btn-primary"
                    onClick={handleSaveProgress}
                    disabled={isSaving || !consultationData.chief_complaint.trim()}
                  >
                    {isSaving ? (
                      <>
                        <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" opacity="0.25"/>
                          <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round"/>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                          <polyline points="17 21 17 13 7 13 7 21"/>
                          <polyline points="7 3 7 8 15 8"/>
                        </svg>
                        Save Details
                      </>
                    )}
                  </button>
                  {!consultationData.chief_complaint.trim() && (
                    <span className="validation-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                      </svg>
                      Chief complaint is required
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="tab-content">
              <div className="section-header">
                <h3>Vital Signs Records</h3>
                <button
                  className="btn-primary"
                  onClick={() => setVitalSignsModalOpen(true)}
                  disabled={consultation.status === 'completed'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Vital Signs
                </button>
              </div>
              <div className="vitals-list">
                {vitalSigns.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <h3>No Vital Signs Recorded</h3>
                    <p>Record vital signs during this consultation to track patient's condition.</p>
                    <button
                      className="btn-primary"
                      onClick={() => setVitalSignsModalOpen(true)}
                      disabled={consultation.status === 'completed'}
                    >
                      Add First Vital Signs
                    </button>
                  </div>
                ) : (
                  vitalSigns.map((vital, index) => (
                    <div key={vital.id} className="vital-signs-card">
                      <div className="vital-header">
                        <div className="vital-header-left">
                          <h4>Vital Signs #{index + 1}</h4>
                          <span className="vital-time">
                            {formatDateTime(vital.recorded_at?.split('T')[0], vital.recorded_at?.split('T')[1]?.split('.')[0])}
                          </span>
                        </div>
                        {consultation.status !== 'completed' && (
                          <div className="vital-actions">
                            <button
                              className="btn-icon btn-edit"
                              onClick={() => handleEditVitalSigns(vital)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteVitalSigns(vital.id)}
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="vital-details">
                        <div className="vital-row">
                          <div className="vital-item">
                            <span className="vital-label">Blood Pressure:</span>
                            <span className="vital-value">
                              {vital.blood_pressure_systolic}/{vital.blood_pressure_diastolic} mmHg
                            </span>
                          </div>
                          <div className="vital-item">
                            <span className="vital-label">Heart Rate:</span>
                            <span className="vital-value">{vital.pulse_rate} bpm</span>
                          </div>
                        </div>
                        <div className="vital-row">
                          <div className="vital-item">
                            <span className="vital-label">Temperature:</span>
                            <span className="vital-value">{vital.temperature}°C</span>
                          </div>
                          <div className="vital-item">
                            <span className="vital-label">Respiratory Rate:</span>
                            <span className="vital-value">{vital.respiratory_rate}/min</span>
                          </div>
                        </div>
                        <div className="vital-row">
                          {vital.oxygen_saturation && (
                            <div className="vital-item">
                              <span className="vital-label">O2 Saturation:</span>
                              <span className="vital-value">{vital.oxygen_saturation}%</span>
                            </div>
                          )}
                          {vital.pain_scale !== undefined && vital.pain_scale !== null && (
                            <div className="vital-item">
                              <span className="vital-label">Pain Level:</span>
                              <span className={`vital-value pain-badge pain-${vital.pain_scale <= 3 ? 'low' : vital.pain_scale <= 6 ? 'moderate' : vital.pain_scale <= 8 ? 'severe' : 'critical'}`}>
                                {vital.pain_scale}/10
                              </span>
                            </div>
                          )}
                        </div>
                        {(vital.height || vital.weight) && (
                          <div className="vital-row">
                            {vital.height && (
                              <div className="vital-item">
                                <span className="vital-label">Height:</span>
                                <span className="vital-value">{vital.height} cm</span>
                              </div>
                            )}
                            {vital.weight && (
                              <div className="vital-item">
                                <span className="vital-label">Weight:</span>
                                <span className="vital-value">{vital.weight} kg</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'glasgow' && (
            <div className="tab-content">
              <div className="section-header">
                <h3>Glasgow Coma Scale Assessments</h3>
                <button
                  className="btn-primary"
                  onClick={() => setGlasgowModalOpen(true)}
                  disabled={consultation.status === 'completed'}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Assessment
                </button>
              </div>
              <div className="glasgow-list">
                {glasgowComaScale.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <h3>No Glasgow Coma Scale Assessment</h3>
                    <p>Record Glasgow Coma Scale assessment for neurological evaluation.</p>
                    <button
                      className="btn-primary"
                      onClick={() => setGlasgowModalOpen(true)}
                      disabled={consultation.status === 'completed'}
                    >
                      Add First Assessment
                    </button>
                  </div>
                ) : (
                  glasgowComaScale.map((glasgow, index) => (
                    <div key={glasgow.id} className="glasgow-card">
                      <div className="glasgow-header">
                        <div className="glasgow-header-left">
                          <h4>Glasgow Coma Scale #{index + 1}</h4>
                          <span className="glasgow-time">
                            {formatDateTime(glasgow.assessed_at?.split('T')[0], glasgow.assessed_at?.split('T')[1]?.split('.')[0])}
                          </span>
                          <span className={`glasgow-total ${glasgow.total_score <= 8 ? 'severe' : glasgow.total_score <= 12 ? 'moderate' : 'mild'}`}>
                            Total: {glasgow.total_score}/15
                          </span>
                        </div>
                        {consultation.status !== 'completed' && (
                          <div className="glasgow-actions">
                            <button
                              className="btn-icon btn-edit"
                              onClick={() => handleEditGlasgow(glasgow)}
                              title="Edit"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                            </button>
                            <button
                              className="btn-icon btn-delete"
                              onClick={() => handleDeleteGlasgow(glasgow.id)}
                              title="Delete"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="glasgow-details">
                        <div className="glasgow-row">
                          <div className="glasgow-item">
                            <span className="glasgow-label">Eye Response:</span>
                            <span className="glasgow-value">{glasgow.eye_response}/4</span>
                          </div>
                          <div className="glasgow-item">
                            <span className="glasgow-label">Verbal Response:</span>
                            <span className="glasgow-value">{glasgow.verbal_response}/5</span>
                          </div>
                          <div className="glasgow-item">
                            <span className="glasgow-label">Motor Response:</span>
                            <span className="glasgow-value">{glasgow.motor_response}/6</span>
                          </div>
                        </div>
                        {(glasgow.eye_response_description || glasgow.verbal_response_description || glasgow.motor_response_description) && (
                          <div className="glasgow-descriptions">
                            {glasgow.eye_response_description && (
                              <p><strong>Eye:</strong> {glasgow.eye_response_description}</p>
                            )}
                            {glasgow.verbal_response_description && (
                              <p><strong>Verbal:</strong> {glasgow.verbal_response_description}</p>
                            )}
                            {glasgow.motor_response_description && (
                              <p><strong>Motor:</strong> {glasgow.motor_response_description}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="tab-content">
              <div className="section-header">
                <h3>Consultation Attachments</h3>
                <button
                  className="btn-primary"
                  onClick={() => setAttachmentsModalOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Attachment
                </button>
              </div>
              <div className="attachments-list">
                {attachments.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                    </svg>
                    <h3>No Attachments</h3>
                    <p>Attach files, images, or documents related to this consultation.</p>
                    <button
                      className="btn-primary"
                      onClick={() => setAttachmentsModalOpen(true)}
                    >
                      Add First Attachment
                    </button>
                  </div>
                ) : (
                  <div className="attachments-grid">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="attachment-card">
                        <div className="attachment-icon">
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                            <polyline points="13 2 13 9 20 9"/>
                          </svg>
                        </div>
                        <div className="attachment-details">
                          <h4 className="attachment-title">{attachment.file_name}</h4>
                          <p className="attachment-description">{attachment.description || 'No description'}</p>
                          <div className="attachment-meta">
                            <span className="attachment-size">
                              {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(2)} KB` : 'Unknown size'}
                            </span>
                            <span className="attachment-date">
                              {new Date(attachment.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <a
                          href={attachment.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary btn-sm"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose} disabled={loading}>
            Close
          </button>
          <div className="footer-actions">
            <button
              className="btn-info"
              onClick={handleSaveProgress}
              disabled={loading || consultation.status === 'completed'}
            >
              Save Progress
            </button>
            {consultation.status === 'active' && (
              <button
                className="btn-success"
                onClick={handleCompleteConsultation}
                disabled={loading}
              >
                Complete Consultation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      <VitalSignsModal
        isOpen={vitalSignsModalOpen}
        consultation={consultation}
        editingVitalSigns={editingVitalSigns}
        onClose={() => {
          setVitalSignsModalOpen(false);
          setEditingVitalSigns(null);
        }}
        onVitalSignsRecorded={handleVitalSignsRecorded}
      />

      <GlasgowComaScaleModal
        isOpen={glasgowModalOpen}
        consultation={consultation}
        editingGlasgow={editingGlasgow}
        onClose={() => {
          setGlasgowModalOpen(false);
          setEditingGlasgow(null);
        }}
        onGlasgowComaScaleRecorded={handleGlasgowComaScaleRecorded}
      />

      <ConsultationAttachmentsModal
        isOpen={attachmentsModalOpen}
        consultation={consultation}
        onClose={() => setAttachmentsModalOpen(false)}
        onAttachmentAdded={handleAttachmentAdded}
      />
    </div>
  );
};

export default ConsultationModal;