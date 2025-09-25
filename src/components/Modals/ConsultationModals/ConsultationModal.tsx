import React, { useState, useEffect, useCallback } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Consultation,
  type VitalSigns,
  type GlasgowComaScale
} from '../../../services/supabaseService';
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
    physical_examination: '',
    diagnosis: '',
    prescription: '',
    follow_up_instructions: '',
    pain_scale: 0,
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    notes: ''
  });

  // Vital signs and Glasgow Coma Scale data
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [glasgowComaScale, setGlasgowComaScale] = useState<GlasgowComaScale[]>([]);

  // Load consultation data when modal opens
  const loadConsultationData = useCallback(async () => {
    if (!consultation) return;

    try {
      setLoading(true);
      setError(null);

      // Load vital signs and Glasgow Coma Scale data
      const [vitalSignsData, glasgowData] = await Promise.all([
        patientMonitoringService.getVitalSignsByConsultationId(consultation.id),
        patientMonitoringService.getGlasgowComaScalesByConsultationId(consultation.id)
      ]);

      setVitalSigns(vitalSignsData);
      setGlasgowComaScale(glasgowData);

      // Initialize SOAP notes from consultation data
      setSoapNotes({
        subjective: consultation.subjective_notes || '',
        objective: consultation.objective_notes || '',
        assessment: consultation.assessment_notes || '',
        plan: consultation.plan_notes || ''
      });

      // Initialize consultation form data
      setConsultationData({
        physical_examination: consultation.objective_notes || '',
        diagnosis: consultation.diagnosis || '',
        prescription: consultation.interventions || '',
        follow_up_instructions: consultation.plan_notes || '',
        pain_scale: vitalSignsData?.[0]?.pain_scale || 0,
        priority: 'normal',
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
      setLoading(true);
      setError(null);

      const updatedConsultation: Partial<Consultation> = {
        subjective_notes: soapNotes.subjective,
        objective_notes: soapNotes.objective,
        assessment_notes: soapNotes.assessment,
        plan_notes: soapNotes.plan,
        diagnosis: consultationData.diagnosis,
        interventions: consultationData.prescription
      };

      const updated = await patientMonitoringService.updateConsultation(consultation.id, updatedConsultation);

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
    } catch (error: any) {
      console.error('Error saving consultation progress:', error);
      setError('Failed to save consultation progress');
    } finally {
      setLoading(false);
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
        subjective_notes: soapNotes.subjective,
        objective_notes: soapNotes.objective,
        assessment_notes: soapNotes.assessment,
        plan_notes: soapNotes.plan,
        diagnosis: consultationData.diagnosis,
        interventions: consultationData.prescription,
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
      physical_examination: '',
      diagnosis: '',
      prescription: '',
      follow_up_instructions: '',
      pain_scale: 0,
      priority: 'normal',
      notes: ''
    });
    setError(null);
    onClose();
  };

  const formatDateTime = (date?: string, time?: string) => {
    if (!date) return 'N/A';
    const formattedDate = new Date(date).toLocaleDateString();
    return time ? `${formattedDate} at ${time}` : formattedDate;
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
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'soap' && (
            <div className="tab-content">
              <div className="soap-notes-container">
                <div className="soap-note-section">
                  <h4>S - Subjective (Patient's reported symptoms and history)</h4>
                  <textarea
                    placeholder="Patient's reported symptoms, concerns, and subjective experiences..."
                    value={soapNotes.subjective}
                    onChange={(e) => handleSoapNotesChange('subjective', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="soap-note-section">
                  <h4>O - Objective (Observable findings and examination results)</h4>
                  <textarea
                    placeholder="Physical examination findings, vital signs, test results..."
                    value={soapNotes.objective}
                    onChange={(e) => handleSoapNotesChange('objective', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="soap-note-section">
                  <h4>A - Assessment (Clinical judgment and diagnosis)</h4>
                  <textarea
                    placeholder="Clinical assessment, differential diagnosis, clinical reasoning..."
                    value={soapNotes.assessment}
                    onChange={(e) => handleSoapNotesChange('assessment', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="soap-note-section">
                  <h4>P - Plan (Treatment plan and next steps)</h4>
                  <textarea
                    placeholder="Treatment plan, medications, follow-up instructions..."
                    value={soapNotes.plan}
                    onChange={(e) => handleSoapNotesChange('plan', e.target.value)}
                    rows={4}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="tab-content">
              <div className="consultation-details-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={consultationData.priority}
                      onChange={(e) => handleConsultationDataChange('priority', e.target.value)}
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Pain Scale (0-10)</label>
                    <div className="pain-scale-container">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        value={consultationData.pain_scale}
                        onChange={(e) => handleConsultationDataChange('pain_scale', parseInt(e.target.value))}
                        className="pain-scale-slider"
                      />
                      <span className="pain-scale-value">{consultationData.pain_scale}</span>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Diagnosis</label>
                  <textarea
                    placeholder="Final diagnosis..."
                    value={consultationData.diagnosis}
                    onChange={(e) => handleConsultationDataChange('diagnosis', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Prescription</label>
                  <textarea
                    placeholder="Prescribed medications and dosages..."
                    value={consultationData.prescription}
                    onChange={(e) => handleConsultationDataChange('prescription', e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="form-group">
                  <label>Follow-up Instructions</label>
                  <textarea
                    placeholder="Follow-up care instructions, next appointments..."
                    value={consultationData.follow_up_instructions}
                    onChange={(e) => handleConsultationDataChange('follow_up_instructions', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="form-group">
                  <label>Additional Notes</label>
                  <textarea
                    placeholder="Any additional observations or notes..."
                    value={consultationData.notes}
                    onChange={(e) => handleConsultationDataChange('notes', e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vitals' && (
            <div className="tab-content">
              <div className="vitals-list">
                {vitalSigns.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                    </svg>
                    <h3>No Vital Signs Recorded</h3>
                    <p>Record vital signs during this consultation to track patient's condition.</p>
                  </div>
                ) : (
                  vitalSigns.map((vital, index) => (
                    <div key={vital.id} className="vital-signs-card">
                      <div className="vital-header">
                        <h4>Vital Signs #{index + 1}</h4>
                        <span className="vital-time">
                          {formatDateTime(vital.recorded_at?.split('T')[0], vital.recorded_at?.split('T')[1]?.split('.')[0])}
                        </span>
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
                        {vital.oxygen_saturation && (
                          <div className="vital-row">
                            <div className="vital-item">
                              <span className="vital-label">O2 Saturation:</span>
                              <span className="vital-value">{vital.oxygen_saturation}%</span>
                            </div>
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
              <div className="glasgow-list">
                {glasgowComaScale.length === 0 ? (
                  <div className="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M9 12l2 2 4-4"/>
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                    <h3>No Glasgow Coma Scale Assessment</h3>
                    <p>Record Glasgow Coma Scale assessment for neurological evaluation.</p>
                  </div>
                ) : (
                  glasgowComaScale.map((glasgow, index) => (
                    <div key={glasgow.id} className="glasgow-card">
                      <div className="glasgow-header">
                        <h4>Glasgow Coma Scale #{index + 1}</h4>
                        <span className="glasgow-time">
                          {formatDateTime(glasgow.assessed_at?.split('T')[0], glasgow.assessed_at?.split('T')[1]?.split('.')[0])}
                        </span>
                        <span className={`glasgow-total ${glasgow.total_score <= 8 ? 'severe' : glasgow.total_score <= 12 ? 'moderate' : 'mild'}`}>
                          Total: {glasgow.total_score}/15
                        </span>
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
                      </div>
                    </div>
                  ))
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
    </div>
  );
};

export default ConsultationModal;