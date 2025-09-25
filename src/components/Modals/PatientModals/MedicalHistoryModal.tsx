import React, { useState, useEffect } from 'react';
import {
  patientMonitoringService,
  activityService,
  type MedicalHistory,
  type Patient
} from '../../../services/supabaseService';
import './PatientModals.css';

interface MedicalHistoryModalProps {
  isOpen: boolean;
  patient: Patient | null;
  medicalHistory?: MedicalHistory | null;
  onClose: () => void;
  onMedicalHistorySaved: (history: MedicalHistory) => void;
}

const MedicalHistoryModal: React.FC<MedicalHistoryModalProps> = ({
  isOpen,
  patient,
  medicalHistory,
  onClose,
  onMedicalHistorySaved
}) => {
  const [historyData, setHistoryData] = useState({
    // Allergies
    food_allergies: '',
    drug_allergies: '',
    other_allergies: '',
    // Family History
    family_ptb: false,
    family_cancer: false,
    family_dm: false,
    family_cardiovascular: false,
    family_others: '',
    // Medical History
    seizure: false,
    asthma: false,
    ptb: false,
    surgery: false,
    cardio: false,
    neuro: false,
    ob_gyne: false,
    other_conditions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('allergies');

  useEffect(() => {
    if (medicalHistory) {
      setHistoryData({
        food_allergies: medicalHistory.food_allergies || '',
        drug_allergies: medicalHistory.drug_allergies || '',
        other_allergies: medicalHistory.other_allergies || '',
        family_ptb: medicalHistory.family_ptb,
        family_cancer: medicalHistory.family_cancer,
        family_dm: medicalHistory.family_dm,
        family_cardiovascular: medicalHistory.family_cardiovascular,
        family_others: medicalHistory.family_others || '',
        seizure: medicalHistory.seizure,
        asthma: medicalHistory.asthma,
        ptb: medicalHistory.ptb,
        surgery: medicalHistory.surgery,
        cardio: medicalHistory.cardio,
        neuro: medicalHistory.neuro,
        ob_gyne: medicalHistory.ob_gyne,
        other_conditions: medicalHistory.other_conditions || ''
      });
    } else {
      setHistoryData({
        food_allergies: '',
        drug_allergies: '',
        other_allergies: '',
        family_ptb: false,
        family_cancer: false,
        family_dm: false,
        family_cardiovascular: false,
        family_others: '',
        seizure: false,
        asthma: false,
        ptb: false,
        surgery: false,
        cardio: false,
        neuro: false,
        ob_gyne: false,
        other_conditions: ''
      });
    }
  }, [medicalHistory, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setHistoryData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!patient) return;

    try {
      setLoading(true);
      setError(null);

      let savedHistory: MedicalHistory;

      if (medicalHistory) {
        // Update existing medical history
        savedHistory = await patientMonitoringService.updateMedicalHistory(medicalHistory.id, historyData);

        // Log activity
        await activityService.logActivity({
          action: 'update_medical_history',
          description: `Updated medical history for patient ${patient.first_name} ${patient.last_name}`,
          details: {
            patient_id: patient.id,
            history_id: medicalHistory.id
          }
        });
      } else {
        // Create new medical history
        savedHistory = await patientMonitoringService.createMedicalHistory({
          patient_id: patient.id,
          ...historyData
        });

        // Log activity
        await activityService.logActivity({
          action: 'add_medical_history',
          description: `Added medical history for patient ${patient.first_name} ${patient.last_name}`,
          details: {
            patient_id: patient.id,
            history_id: savedHistory.id
          }
        });
      }

      onMedicalHistorySaved(savedHistory);
      onClose();
    } catch (error: any) {
      console.error('Error saving medical history:', error);
      setError(`Failed to save medical history: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>{medicalHistory ? 'Edit Medical History' : 'Add Medical History'}</h2>
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

          {/* Section Navigation */}
          <div className="section-navigation">
            <button
              className={`section-btn ${activeSection === 'allergies' ? 'active' : ''}`}
              onClick={() => setActiveSection('allergies')}
            >
              Allergies
            </button>
            <button
              className={`section-btn ${activeSection === 'family' ? 'active' : ''}`}
              onClick={() => setActiveSection('family')}
            >
              Family History
            </button>
            <button
              className={`section-btn ${activeSection === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveSection('personal')}
            >
              Personal History
            </button>
          </div>

          <div className="medical-history-content">
            {/* Allergies Section */}
            {activeSection === 'allergies' && (
              <div className="medical-section">
                <h3>Allergies</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="food_allergies">Food Allergies</label>
                    <textarea
                      id="food_allergies"
                      value={historyData.food_allergies}
                      onChange={(e) => handleInputChange('food_allergies', e.target.value)}
                      placeholder="List any known food allergies (e.g., peanuts, shellfish, dairy)"
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="drug_allergies">Drug Allergies</label>
                    <textarea
                      id="drug_allergies"
                      value={historyData.drug_allergies}
                      onChange={(e) => handleInputChange('drug_allergies', e.target.value)}
                      placeholder="List any known drug allergies (e.g., penicillin, aspirin)"
                      rows={3}
                      disabled={loading}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="other_allergies">Other Allergies</label>
                    <textarea
                      id="other_allergies"
                      value={historyData.other_allergies}
                      onChange={(e) => handleInputChange('other_allergies', e.target.value)}
                      placeholder="List any other allergies (e.g., environmental, contact)"
                      rows={3}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Family History Section */}
            {activeSection === 'family' && (
              <div className="medical-section">
                <h3>Family History</h3>
                <p className="section-description">
                  Check all conditions that run in the patient's family (parents, siblings, grandparents)
                </p>

                <div className="condition-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.family_ptb}
                      onChange={(e) => handleInputChange('family_ptb', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Pulmonary Tuberculosis (PTB)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.family_cancer}
                      onChange={(e) => handleInputChange('family_cancer', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Cancer
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.family_dm}
                      onChange={(e) => handleInputChange('family_dm', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Diabetes Mellitus (DM)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.family_cardiovascular}
                      onChange={(e) => handleInputChange('family_cardiovascular', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Cardiovascular Disease
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="family_others">Other Family History</label>
                  <textarea
                    id="family_others"
                    value={historyData.family_others}
                    onChange={(e) => handleInputChange('family_others', e.target.value)}
                    placeholder="Describe any other significant family medical history"
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* Personal Medical History Section */}
            {activeSection === 'personal' && (
              <div className="medical-section">
                <h3>Personal Medical History</h3>
                <p className="section-description">
                  Check all conditions that the patient has had or currently has
                </p>

                <div className="condition-checkboxes">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.seizure}
                      onChange={(e) => handleInputChange('seizure', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Seizure Disorder
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.asthma}
                      onChange={(e) => handleInputChange('asthma', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Asthma
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.ptb}
                      onChange={(e) => handleInputChange('ptb', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Pulmonary Tuberculosis (PTB)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.surgery}
                      onChange={(e) => handleInputChange('surgery', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Previous Surgery
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.cardio}
                      onChange={(e) => handleInputChange('cardio', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Cardiovascular Disease
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.neuro}
                      onChange={(e) => handleInputChange('neuro', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    Neurological Condition
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={historyData.ob_gyne}
                      onChange={(e) => handleInputChange('ob_gyne', e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkmark"></span>
                    OB-GYNE Condition
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="other_conditions">Other Medical Conditions</label>
                  <textarea
                    id="other_conditions"
                    value={historyData.other_conditions}
                    onChange={(e) => handleInputChange('other_conditions', e.target.value)}
                    placeholder="Describe any other significant medical conditions or treatments"
                    rows={3}
                    disabled={loading}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (medicalHistory ? 'Update Medical History' : 'Save Medical History')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalHistoryModal;