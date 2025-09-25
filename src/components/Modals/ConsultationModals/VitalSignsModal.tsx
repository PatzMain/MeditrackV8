import React, { useState } from 'react';
import {
  patientMonitoringService,
  activityService,
  authService,
  type VitalSigns,
  type Consultation
} from '../../../services/supabaseService';
import '../Modal.css';
import '../ConsultationModals.css';

interface VitalSignsModalProps {
  isOpen: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onVitalSignsRecorded: (vitalSigns: VitalSigns) => void;
}

const VitalSignsModal: React.FC<VitalSignsModalProps> = ({
  isOpen,
  consultation,
  onClose,
  onVitalSignsRecorded
}) => {
  const [vitalSignsData, setVitalSignsData] = useState({
    systolic_bp: '',
    diastolic_bp: '',
    heart_rate: '',
    temperature: '',
    respiratory_rate: '',
    oxygen_saturation: '',
    height: '',
    weight: '',
    bmi: '',
    blood_glucose: '',
    pain_level: 0,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: any) => {
    setVitalSignsData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };

      // Auto-calculate BMI when height and weight are provided
      if (field === 'height' || field === 'weight') {
        const height = parseFloat(field === 'height' ? value : updated.height);
        const weight = parseFloat(field === 'weight' ? value : updated.weight);

        if (height > 0 && weight > 0) {
          const heightInMeters = height / 100; // Convert cm to meters
          const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
          updated.bmi = bmi;
        } else {
          updated.bmi = '';
        }
      }

      return updated;
    });
  };

  const validateVitalSigns = (): boolean => {
    // Check for required vital signs
    if (!vitalSignsData.systolic_bp.trim()) {
      setError('Systolic blood pressure is required');
      return false;
    }
    if (!vitalSignsData.diastolic_bp.trim()) {
      setError('Diastolic blood pressure is required');
      return false;
    }
    if (!vitalSignsData.heart_rate.trim()) {
      setError('Heart rate is required');
      return false;
    }
    if (!vitalSignsData.temperature.trim()) {
      setError('Temperature is required');
      return false;
    }
    if (!vitalSignsData.respiratory_rate.trim()) {
      setError('Respiratory rate is required');
      return false;
    }

    // Validate ranges
    const systolic = parseInt(vitalSignsData.systolic_bp);
    const diastolic = parseInt(vitalSignsData.diastolic_bp);
    const heartRate = parseInt(vitalSignsData.heart_rate);
    const temperature = parseFloat(vitalSignsData.temperature);
    const respiratoryRate = parseInt(vitalSignsData.respiratory_rate);

    if (systolic < 50 || systolic > 300) {
      setError('Systolic BP must be between 50-300 mmHg');
      return false;
    }
    if (diastolic < 30 || diastolic > 200) {
      setError('Diastolic BP must be between 30-200 mmHg');
      return false;
    }
    if (systolic <= diastolic) {
      setError('Systolic BP must be greater than diastolic BP');
      return false;
    }
    if (heartRate < 30 || heartRate > 250) {
      setError('Heart rate must be between 30-250 bpm');
      return false;
    }
    if (temperature < 30 || temperature > 45) {
      setError('Temperature must be between 30-45°C');
      return false;
    }
    if (respiratoryRate < 5 || respiratoryRate > 60) {
      setError('Respiratory rate must be between 5-60 per minute');
      return false;
    }

    // Validate optional fields if provided
    if (vitalSignsData.oxygen_saturation && (parseInt(vitalSignsData.oxygen_saturation) < 50 || parseInt(vitalSignsData.oxygen_saturation) > 100)) {
      setError('Oxygen saturation must be between 50-100%');
      return false;
    }

    if (vitalSignsData.height && (parseFloat(vitalSignsData.height) < 50 || parseFloat(vitalSignsData.height) > 250)) {
      setError('Height must be between 50-250 cm');
      return false;
    }

    if (vitalSignsData.weight && (parseFloat(vitalSignsData.weight) < 5 || parseFloat(vitalSignsData.weight) > 500)) {
      setError('Weight must be between 5-500 kg');
      return false;
    }

    return true;
  };

  const getBPCategory = (systolic: number, diastolic: number): string => {
    if (systolic < 120 && diastolic < 80) return 'Normal';
    if (systolic < 130 && diastolic < 80) return 'Elevated';
    if (systolic < 140 || diastolic < 90) return 'Stage 1 Hypertension';
    if (systolic < 180 || diastolic < 120) return 'Stage 2 Hypertension';
    return 'Hypertensive Crisis';
  };

  const getBMICategory = (bmi: number): string => {
    if (bmi < 18.5) return 'Underweight';
    if (bmi < 25) return 'Normal weight';
    if (bmi < 30) return 'Overweight';
    return 'Obese';
  };

  const handleRecordVitalSigns = async () => {
    if (!consultation) {
      setError('No consultation selected');
      return;
    }

    if (!validateVitalSigns()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const vitalSigns: Omit<VitalSigns, 'id' | 'recorded_at'> = {
        consultation_id: consultation.id,
        blood_pressure_systolic: parseInt(vitalSignsData.systolic_bp),
        blood_pressure_diastolic: parseInt(vitalSignsData.diastolic_bp),
        pulse_rate: parseInt(vitalSignsData.heart_rate),
        temperature: parseFloat(vitalSignsData.temperature),
        respiratory_rate: parseInt(vitalSignsData.respiratory_rate),
        oxygen_saturation: vitalSignsData.oxygen_saturation ? parseInt(vitalSignsData.oxygen_saturation) : undefined,
        height: vitalSignsData.height ? parseFloat(vitalSignsData.height) : undefined,
        weight: vitalSignsData.weight ? parseFloat(vitalSignsData.weight) : undefined,
        pain_scale: vitalSignsData.pain_level,
        recorded_by: authService.getCurrentUser()?.id
      };

      const recordedVitalSigns = await patientMonitoringService.createVitalSigns(vitalSigns);

      // Vital signs recorded successfully

      // Log activity
      await activityService.logActivity({
        action: 'record_vital_signs',
        description: `Recorded vital signs for case ${consultation.case_number}`,
        details: {
          consultation_id: consultation.id,
          patient_id: consultation.patient_id,
          vital_signs_id: recordedVitalSigns.id,
          bp: `${vitalSignsData.systolic_bp}/${vitalSignsData.diastolic_bp}`,
          heart_rate: vitalSignsData.heart_rate,
          temperature: vitalSignsData.temperature
        }
      });

      onVitalSignsRecorded(recordedVitalSigns);
      handleClose();
    } catch (error: any) {
      console.error('Error recording vital signs:', error);
      setError(error.message || 'Failed to record vital signs');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVitalSignsData({
      systolic_bp: '',
      diastolic_bp: '',
      heart_rate: '',
      temperature: '',
      respiratory_rate: '',
      oxygen_saturation: '',
      height: '',
      weight: '',
      bmi: '',
      blood_glucose: '',
      pain_level: 0,
      notes: ''
    });
    setError(null);
    onClose();
  };

  if (!isOpen || !consultation) return null;

  const systolic = parseInt(vitalSignsData.systolic_bp);
  const diastolic = parseInt(vitalSignsData.diastolic_bp);
  const bmi = parseFloat(vitalSignsData.bmi);

  return (
    <div className="modal-overlay">
      <div className="modal-container large">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Record Vital Signs</h2>
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

          <div className="vital-signs-form">
            {/* Primary Vital Signs */}
            <div className="form-section">
              <h4>Primary Vital Signs</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Systolic BP (mmHg) <span className="required">*</span></label>
                  <input
                    type="number"
                    placeholder="120"
                    value={vitalSignsData.systolic_bp}
                    onChange={(e) => handleInputChange('systolic_bp', e.target.value)}
                    min="50"
                    max="300"
                  />
                </div>
                <div className="form-group">
                  <label>Diastolic BP (mmHg) <span className="required">*</span></label>
                  <input
                    type="number"
                    placeholder="80"
                    value={vitalSignsData.diastolic_bp}
                    onChange={(e) => handleInputChange('diastolic_bp', e.target.value)}
                    min="30"
                    max="200"
                  />
                </div>
                {systolic > 0 && diastolic > 0 && (
                  <div className="form-group">
                    <label>BP Category</label>
                    <div className={`bp-category ${getBPCategory(systolic, diastolic).toLowerCase().replace(/\s+/g, '-')}`}>
                      {getBPCategory(systolic, diastolic)}
                    </div>
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Heart Rate (bpm) <span className="required">*</span></label>
                  <input
                    type="number"
                    placeholder="72"
                    value={vitalSignsData.heart_rate}
                    onChange={(e) => handleInputChange('heart_rate', e.target.value)}
                    min="30"
                    max="250"
                  />
                </div>
                <div className="form-group">
                  <label>Temperature (°C) <span className="required">*</span></label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="36.5"
                    value={vitalSignsData.temperature}
                    onChange={(e) => handleInputChange('temperature', e.target.value)}
                    min="30"
                    max="45"
                  />
                </div>
                <div className="form-group">
                  <label>Respiratory Rate (/min) <span className="required">*</span></label>
                  <input
                    type="number"
                    placeholder="16"
                    value={vitalSignsData.respiratory_rate}
                    onChange={(e) => handleInputChange('respiratory_rate', e.target.value)}
                    min="5"
                    max="60"
                  />
                </div>
              </div>
            </div>

            {/* Additional Measurements */}
            <div className="form-section">
              <h4>Additional Measurements</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Oxygen Saturation (%)</label>
                  <input
                    type="number"
                    placeholder="98"
                    value={vitalSignsData.oxygen_saturation}
                    onChange={(e) => handleInputChange('oxygen_saturation', e.target.value)}
                    min="50"
                    max="100"
                  />
                </div>
                <div className="form-group">
                  <label>Blood Glucose (mg/dL)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="90"
                    value={vitalSignsData.blood_glucose}
                    onChange={(e) => handleInputChange('blood_glucose', e.target.value)}
                    min="20"
                    max="600"
                  />
                </div>
              </div>
            </div>

            {/* Anthropometric Measurements */}
            <div className="form-section">
              <h4>Anthropometric Measurements</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="170"
                    value={vitalSignsData.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    min="50"
                    max="250"
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="70"
                    value={vitalSignsData.weight}
                    onChange={(e) => handleInputChange('weight', e.target.value)}
                    min="5"
                    max="500"
                  />
                </div>
                {vitalSignsData.bmi && (
                  <div className="form-group">
                    <label>BMI</label>
                    <div className="bmi-display">
                      <span className="bmi-value">{vitalSignsData.bmi}</span>
                      <span className={`bmi-category ${getBMICategory(bmi).toLowerCase().replace(/\s+/g, '-')}`}>
                        {getBMICategory(bmi)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pain Assessment */}
            <div className="form-section">
              <h4>Pain Assessment</h4>
              <div className="form-group">
                <label>Pain Level (0-10)</label>
                <div className="pain-scale-container">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={vitalSignsData.pain_level}
                    onChange={(e) => handleInputChange('pain_level', parseInt(e.target.value))}
                    className="pain-scale-slider"
                  />
                  <div className="pain-scale-labels">
                    <span>0 - No Pain</span>
                    <span className="pain-scale-value">{vitalSignsData.pain_level}</span>
                    <span>10 - Severe Pain</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="form-section">
              <h4>Additional Notes</h4>
              <div className="form-group">
                <label>Observations and Notes</label>
                <textarea
                  placeholder="Any additional observations about vital signs or patient condition..."
                  value={vitalSignsData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                />
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
            onClick={handleRecordVitalSigns}
            disabled={loading}
          >
            {loading ? (
              <span className="loading-spinner">Recording...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                </svg>
                Record Vital Signs
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VitalSignsModal;