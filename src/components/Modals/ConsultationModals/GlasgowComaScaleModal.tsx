import React, { useState } from 'react';
import {
  patientMonitoringService,
  activityService,
  authService,
  type GlasgowComaScale,
  type Consultation
} from '../../../services/supabaseService';
import '../PatientModals/PatientModals.css';

interface GlasgowComaScaleModalProps {
  isOpen: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onGlasgowComaScaleRecorded: (glasgowComaScale: GlasgowComaScale) => void;
}

const GlasgowComaScaleModal: React.FC<GlasgowComaScaleModalProps> = ({
  isOpen,
  consultation,
  onClose,
  onGlasgowComaScaleRecorded
}) => {
  const [glasgowData, setGlasgowData] = useState({
    eye_response: 4,
    verbal_response: 5,
    motor_response: 6,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Glasgow Coma Scale scoring criteria
  const eyeResponseOptions = [
    { value: 4, label: '4 - Eyes open spontaneously' },
    { value: 3, label: '3 - Eyes open to verbal command' },
    { value: 2, label: '2 - Eyes open to pain' },
    { value: 1, label: '1 - No eye opening' }
  ];

  const verbalResponseOptions = [
    { value: 5, label: '5 - Oriented and converses normally' },
    { value: 4, label: '4 - Confused but converses' },
    { value: 3, label: '3 - Inappropriate words' },
    { value: 2, label: '2 - Incomprehensible sounds' },
    { value: 1, label: '1 - No verbal response' }
  ];

  const motorResponseOptions = [
    { value: 6, label: '6 - Obeys commands' },
    { value: 5, label: '5 - Localizes pain' },
    { value: 4, label: '4 - Withdraws from pain' },
    { value: 3, label: '3 - Flexor response to pain' },
    { value: 2, label: '2 - Extensor response to pain' },
    { value: 1, label: '1 - No motor response' }
  ];

  const handleInputChange = (field: string, value: any) => {
    setGlasgowData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getTotalScore = (): number => {
    return glasgowData.eye_response + glasgowData.verbal_response + glasgowData.motor_response;
  };

  const getSeverityLevel = (score: number): { level: string; description: string; color: string } => {
    if (score >= 13) {
      return {
        level: 'Mild',
        description: 'Mild brain injury or normal consciousness',
        color: 'success'
      };
    } else if (score >= 9) {
      return {
        level: 'Moderate',
        description: 'Moderate brain injury',
        color: 'warning'
      };
    } else {
      return {
        level: 'Severe',
        description: 'Severe brain injury - immediate attention required',
        color: 'danger'
      };
    }
  };

  const handleRecordGlasgowComaScale = async () => {
    if (!consultation) {
      setError('No consultation selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const totalScore = getTotalScore();

      // Get descriptions based on the selected values
      const eyeDescription = eyeResponseOptions.find(opt => opt.value === glasgowData.eye_response)?.label;
      const verbalDescription = verbalResponseOptions.find(opt => opt.value === glasgowData.verbal_response)?.label;
      const motorDescription = motorResponseOptions.find(opt => opt.value === glasgowData.motor_response)?.label;

      const glasgowComaScale: Omit<GlasgowComaScale, 'id' | 'total_score' | 'assessed_at'> = {
        consultation_id: consultation.id,
        eye_response: glasgowData.eye_response,
        verbal_response: glasgowData.verbal_response,
        motor_response: glasgowData.motor_response,
        eye_response_description: eyeDescription,
        verbal_response_description: verbalDescription,
        motor_response_description: motorDescription,
        assessed_by: authService.getCurrentUser()?.id
      };

      const recordedGlasgowComaScale = await patientMonitoringService.createGlasgowComaScale(glasgowComaScale);

      // Glasgow Coma Scale recorded successfully

      // Log activity
      await activityService.logActivity({
        action: 'record_glasgow_coma_scale',
        description: `Recorded Glasgow Coma Scale assessment for case ${consultation.case_number}`,
        details: {
          consultation_id: consultation.id,
          patient_id: consultation.patient_id,
          glasgow_id: recordedGlasgowComaScale.id,
          total_score: totalScore,
          severity: getSeverityLevel(totalScore).level,
          eye_response: glasgowData.eye_response,
          verbal_response: glasgowData.verbal_response,
          motor_response: glasgowData.motor_response
        }
      });

      onGlasgowComaScaleRecorded(recordedGlasgowComaScale);
      handleClose();
    } catch (error: any) {
      console.error('Error recording Glasgow Coma Scale:', error);
      setError(error.message || 'Failed to record Glasgow Coma Scale assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setGlasgowData({
      eye_response: 4,
      verbal_response: 5,
      motor_response: 6,
      notes: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen || !consultation) return null;

  const totalScore = getTotalScore();
  const severity = getSeverityLevel(totalScore);

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Glasgow Coma Scale Assessment</h2>
            <p className="modal-subtitle">
              Case: {consultation.case_number} | Patient: {consultation.patient?.first_name} {consultation.patient?.last_name}
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

          <div className="glasgow-assessment-form">
            {/* Glasgow Coma Scale Explanation */}
            <div className="form-section">
              <div className="glasgow-explanation">
                <h4>Glasgow Coma Scale (GCS) Assessment</h4>
                <p>
                  The Glasgow Coma Scale is used to assess neurological function by testing three areas of responsiveness.
                  Select the best response observed for each category.
                </p>
              </div>
            </div>

            {/* Current Total Score */}
            <div className="form-section">
              <div className="glasgow-total-score">
                <div className="score-display">
                  <div className="total-score">
                    <span className="score-number">{totalScore}</span>
                    <span className="score-max">/15</span>
                  </div>
                  <div className={`severity-indicator ${severity.color}`}>
                    <span className="severity-level">{severity.level}</span>
                    <span className="severity-description">{severity.description}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Eye Response */}
            <div className="form-section">
              <h4>Eye Response (E)</h4>
              <div className="glasgow-response-options">
                {eyeResponseOptions.map((option) => (
                  <label key={option.value} className="glasgow-option">
                    <input
                      type="radio"
                      name="eye_response"
                      value={option.value}
                      checked={glasgowData.eye_response === option.value}
                      onChange={(e) => handleInputChange('eye_response', parseInt(e.target.value))}
                    />
                    <span className="option-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verbal Response */}
            <div className="form-section">
              <h4>Verbal Response (V)</h4>
              <div className="glasgow-response-options">
                {verbalResponseOptions.map((option) => (
                  <label key={option.value} className="glasgow-option">
                    <input
                      type="radio"
                      name="verbal_response"
                      value={option.value}
                      checked={glasgowData.verbal_response === option.value}
                      onChange={(e) => handleInputChange('verbal_response', parseInt(e.target.value))}
                    />
                    <span className="option-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Motor Response */}
            <div className="form-section">
              <h4>Motor Response (M)</h4>
              <div className="glasgow-response-options">
                {motorResponseOptions.map((option) => (
                  <label key={option.value} className="glasgow-option">
                    <input
                      type="radio"
                      name="motor_response"
                      value={option.value}
                      checked={glasgowData.motor_response === option.value}
                      onChange={(e) => handleInputChange('motor_response', parseInt(e.target.value))}
                    />
                    <span className="option-text">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <h4>Assessment Notes</h4>
              <div className="form-group">
                <label>Additional Observations</label>
                <textarea
                  placeholder="Any additional observations about the patient's neurological status, circumstances of assessment, or other relevant notes..."
                  value={glasgowData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                />
              </div>
            </div>

            {/* Assessment Summary */}
            <div className="form-section">
              <div className="assessment-summary">
                <h4>Assessment Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Eye Response (E):</span>
                    <span className="summary-value">{glasgowData.eye_response}/4</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Verbal Response (V):</span>
                    <span className="summary-value">{glasgowData.verbal_response}/5</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Motor Response (M):</span>
                    <span className="summary-value">{glasgowData.motor_response}/6</span>
                  </div>
                  <div className="summary-item total">
                    <span className="summary-label">Total GCS Score:</span>
                    <span className={`summary-value ${severity.color}`}>
                      {totalScore}/15 ({severity.level})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Clinical Guidelines */}
            <div className="form-section">
              <div className="clinical-guidelines">
                <h4>Clinical Interpretation Guidelines</h4>
                <div className="guidelines-grid">
                  <div className="guideline-item success">
                    <strong>13-15 (Mild):</strong> Minimal or no brain injury. Monitor for changes.
                  </div>
                  <div className="guideline-item warning">
                    <strong>9-12 (Moderate):</strong> Moderate brain injury. Close monitoring required.
                  </div>
                  <div className="guideline-item danger">
                    <strong>3-8 (Severe):</strong> Severe brain injury. Immediate medical attention required.
                  </div>
                </div>
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
            onClick={handleRecordGlasgowComaScale}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">Recording...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <circle cx="12" cy="12" r="10"/>
                </svg>
                Record Assessment
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GlasgowComaScaleModal;