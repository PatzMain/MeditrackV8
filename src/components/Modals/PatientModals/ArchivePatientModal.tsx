import React, { useState } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Patient
} from '../../../services/supabaseService';
import '../Modal.css';
import './PatientModals.css';

interface ArchivePatientModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onPatientArchived: (patient: Patient) => void;
}

const ArchivePatientModal: React.FC<ArchivePatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onPatientArchived
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archiveReason, setArchiveReason] = useState('');

  const handleArchivePatient = async () => {
    if (!patient) {
      setError('No patient selected');
      return;
    }

    if (!archiveReason.trim()) {
      setError('Please provide a reason for archiving this patient');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Archive the patient
      const archivedPatient = await patientMonitoringService.archivePatient(patient.id);

      // Log the activity
      await activityService.logActivity({
        action: 'archive',
        description: `Archived patient: ${patient.first_name} ${patient.last_name} (ID: ${patient.patient_id})`,
        details: {
          patient_id: patient.id,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          patient_id_number: patient.patient_id,
          archive_reason: archiveReason,
          patient_type: patient.patient_type
        },
        category: 'patient_management'
      });

      onPatientArchived(archivedPatient);
      handleClose();
    } catch (error: any) {
      console.error('Error archiving patient:', error);
      setError(error.message || 'Failed to archive patient');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setArchiveReason('');
    setError(null);
    onClose();
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Archive Patient</h2>
            <p className="modal-subtitle">
              This action will move the patient record to archives
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

          {/* Patient Summary */}
          <div className="patient-summary-card">
            <div className="summary-header">
              <div className="patient-avatar">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div className="patient-details">
                <h3>{patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}</h3>
                <p className="patient-id">Patient ID: {patient.patient_id}</p>
                <div className="patient-meta">
                  <span className="patient-type">{patient.patient_type}</span>
                  <span className="patient-sex">{patient.sex}</span>
                  {patient.age && <span className="patient-age">Age {patient.age}</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Archive Warning */}
          <div className="warning-message">
            <div className="warning-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="warning-content">
              <h4>Important Notice</h4>
              <ul>
                <li>This patient record will be moved to the archives</li>
                <li>The patient will no longer appear in active patient lists</li>
                <li>All consultation history and medical records will be preserved</li>
                <li>You can restore the patient from the archives at any time</li>
                <li>No new consultations can be started for archived patients</li>
              </ul>
            </div>
          </div>

          {/* Archive Reason */}
          <div className="form-section">
            <div className="form-group">
              <label>Reason for Archiving <span className="required">*</span></label>
              <textarea
                placeholder="Please provide a reason for archiving this patient (e.g., patient transferred, treatment completed, etc.)"
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                rows={4}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </button>
          <button
            className="btn-warning"
            onClick={handleArchivePatient}
            disabled={loading || !archiveReason.trim()}
          >
            {loading ? (
              <span className="loading-spinner">Archiving...</span>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="20" height="5" x="2" y="3" rx="1"/>
                  <path d="m4 8 16 0"/>
                  <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13"/>
                </svg>
                Archive Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArchivePatientModal;