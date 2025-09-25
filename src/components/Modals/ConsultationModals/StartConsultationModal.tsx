import React, { useState } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Patient,
  type Consultation
} from '../../../services/supabaseService';
import '../Modal.css';
import '../ConsultationModals.css';

interface StartConsultationModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onConsultationStarted: (consultation: Consultation) => void;
}

const StartConsultationModal: React.FC<StartConsultationModalProps> = ({
  isOpen,
  patient,
  onClose,
  onConsultationStarted
}) => {
  const [consultationData, setConsultationData] = useState({
    chief_complaint: '',
    history_of_present_illness: '',
    pain_scale: 0,
    priority: 'normal' as 'low' | 'normal' | 'high' | 'urgent',
    consultation_type: 'routine' as 'routine' | 'emergency' | 'follow_up' | 'referral',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setConsultationData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!consultationData.chief_complaint.trim()) {
      setError('Chief complaint is required');
      return false;
    }
    if (!consultationData.history_of_present_illness.trim()) {
      setError('History of present illness is required');
      return false;
    }
    return true;
  };

  const generateCaseNumber = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `CASE-${year}${month}${day}-${timestamp}`;
  };

  const handleStartConsultation = async () => {
    if (!patient) {
      setError('No patient selected');
      return;
    }

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const currentTime = new Date();
      const consultationDate = currentTime.toISOString().split('T')[0];
      const timeIn = currentTime.toTimeString().split(' ')[0].slice(0, 5);

      const newConsultation: Omit<Consultation, 'id' | 'created_at' | 'updated_at' | 'patient'> = {
        patient_id: patient.id,
        case_number: generateCaseNumber(),
        consultation_date: consultationDate,
        time_in: timeIn,
        time_out: undefined,
        chief_complaint: consultationData.chief_complaint,
        subjective_notes: consultationData.history_of_present_illness,
        objective_notes: '',
        assessment_notes: '',
        plan_notes: '',
        diagnosis: '',
        interventions: '',
        status: 'active'
      };

      const createdConsultation = await patientMonitoringService.createConsultation(newConsultation);

      // Log activity
      await activityService.logActivity({
        action: 'start_consultation',
        description: `Started consultation for ${patient.first_name} ${patient.last_name}`,
        details: {
          patient_id: patient.id,
          consultation_id: createdConsultation.id,
          case_number: createdConsultation.case_number,
          chief_complaint: consultationData.chief_complaint
        }
      });

      onConsultationStarted(createdConsultation);
      handleClose();
    } catch (error: any) {
      console.error('Error starting consultation:', error);
      setError(error.message || 'Failed to start consultation');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setConsultationData({
      chief_complaint: '',
      history_of_present_illness: '',
      pain_scale: 0,
      priority: 'normal',
      consultation_type: 'routine',
      notes: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Start New Consultation</h2>
            <p className="modal-subtitle">
              Patient: {patient.first_name} {patient.last_name} (ID: {patient.patient_id})
            </p>
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

          <div className="consultation-form">
            {/* Consultation Type and Priority */}
            <div className="form-row">
              <div className="form-group">
                <label>Consultation Type</label>
                <select
                  value={consultationData.consultation_type}
                  onChange={(e) => handleInputChange('consultation_type', e.target.value)}
                >
                  <option value="routine">Routine</option>
                  <option value="emergency">Emergency</option>
                  <option value="follow_up">Follow-up</option>
                  <option value="referral">Referral</option>
                </select>
              </div>
              <div className="form-group">
                <label>Priority</label>
                <select
                  value={consultationData.priority}
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="form-group">
              <label>Chief Complaint <span className="required">*</span></label>
              <textarea
                placeholder="Describe the main reason for this consultation..."
                value={consultationData.chief_complaint}
                onChange={(e) => handleInputChange('chief_complaint', e.target.value)}
                rows={3}
              />
            </div>

            {/* History of Present Illness */}
            <div className="form-group">
              <label>History of Present Illness <span className="required">*</span></label>
              <textarea
                placeholder="Detailed description of the current illness or symptoms..."
                value={consultationData.history_of_present_illness}
                onChange={(e) => handleInputChange('history_of_present_illness', e.target.value)}
                rows={4}
              />
            </div>

            {/* Pain Scale */}
            <div className="form-group">
              <label>Pain Scale (0-10)</label>
              <div className="pain-scale-container">
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={consultationData.pain_scale}
                  onChange={(e) => handleInputChange('pain_scale', parseInt(e.target.value))}
                  className="pain-scale-slider"
                />
                <div className="pain-scale-labels">
                  <span>0 - No Pain</span>
                  <span className="pain-scale-value">{consultationData.pain_scale}</span>
                  <span>10 - Severe Pain</span>
                </div>
              </div>
            </div>

            {/* Initial Notes */}
            <div className="form-group">
              <label>Initial Notes</label>
              <textarea
                placeholder="Any additional observations or notes..."
                value={consultationData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>

            {/* Patient Information Summary */}
            <div className="patient-summary-card">
              <h4>Patient Information</h4>
              <div className="patient-summary-info">
                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Name:</span>
                    <span className="info-value">
                      {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Age:</span>
                    <span className="info-value">{patient.age || 'N/A'}</span>
                  </div>
                </div>
                <div className="info-row">
                  <div className="info-item">
                    <span className="info-label">Sex:</span>
                    <span className="info-value">{patient.sex}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Type:</span>
                    <span className="info-value">{patient.patient_type}</span>
                  </div>
                </div>
                {patient.course_department && (
                  <div className="info-row">
                    <div className="info-item">
                      <span className="info-label">Department:</span>
                      <span className="info-value">{patient.course_department}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleStartConsultation}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">Starting...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Start Consultation
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartConsultationModal;