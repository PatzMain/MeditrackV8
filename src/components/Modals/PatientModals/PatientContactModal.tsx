import React, { useState, useEffect } from 'react';
import {
  patientMonitoringService,
  activityService,
  type PatientContact,
  type Patient
} from '../../../services/supabaseService';
import './PatientModals.css';

interface PatientContactModalProps {
  isOpen: boolean;
  patient: Patient | null;
  contact?: PatientContact | null;
  onClose: () => void;
  onContactSaved: (contact: PatientContact) => void;
}

const PatientContactModal: React.FC<PatientContactModalProps> = ({
  isOpen,
  patient,
  contact,
  onClose,
  onContactSaved
}) => {
  const [contactData, setContactData] = useState({
    contact_name: '',
    relationship: '',
    contact_number: '',
    is_primary: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (contact) {
      setContactData({
        contact_name: contact.contact_name,
        relationship: contact.relationship,
        contact_number: contact.contact_number,
        is_primary: contact.is_primary
      });
    } else {
      setContactData({
        contact_name: '',
        relationship: '',
        contact_number: '',
        is_primary: false
      });
    }
  }, [contact, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setContactData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateForm = () => {
    if (!contactData.contact_name.trim()) {
      setError('Contact name is required');
      return false;
    }
    if (!contactData.relationship.trim()) {
      setError('Relationship is required');
      return false;
    }
    if (!contactData.contact_number.trim()) {
      setError('Contact number is required');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!patient) return;

    if (!validateForm()) return;

    try {
      setLoading(true);
      setError(null);

      let savedContact: PatientContact;

      if (contact) {
        // Update existing contact
        savedContact = await patientMonitoringService.updatePatientContact(contact.id, contactData);

        // Log activity
        await activityService.logActivity({
          action: 'update_patient_contact',
          description: `Updated emergency contact for patient ${patient.first_name} ${patient.last_name}`,
          details: {
            patient_id: patient.id,
            contact_id: contact.id,
            contact_name: contactData.contact_name,
            relationship: contactData.relationship
          }
        });
      } else {
        // Create new contact
        savedContact = await patientMonitoringService.createPatientContact({
          patient_id: patient.id,
          ...contactData
        });

        // Log activity
        await activityService.logActivity({
          action: 'add_patient_contact',
          description: `Added emergency contact for patient ${patient.first_name} ${patient.last_name}`,
          details: {
            patient_id: patient.id,
            contact_id: savedContact.id,
            contact_name: contactData.contact_name,
            relationship: contactData.relationship
          }
        });
      }

      onContactSaved(savedContact);
      onClose();
    } catch (error: any) {
      console.error('Error saving contact:', error);
      setError(`Failed to save contact: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !patient) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content medium-modal">
        <div className="modal-header">
          <h2>{contact ? 'Edit Contact' : 'Add Emergency Contact'}</h2>
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

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="contact_name">Contact Name *</label>
              <input
                type="text"
                id="contact_name"
                value={contactData.contact_name}
                onChange={(e) => handleInputChange('contact_name', e.target.value)}
                placeholder="Enter full name"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="relationship">Relationship *</label>
              <select
                id="relationship"
                value={contactData.relationship}
                onChange={(e) => handleInputChange('relationship', e.target.value)}
                disabled={loading}
              >
                <option value="">Select relationship</option>
                <option value="Parent">Parent</option>
                <option value="Spouse">Spouse</option>
                <option value="Sibling">Sibling</option>
                <option value="Child">Child</option>
                <option value="Grandparent">Grandparent</option>
                <option value="Guardian">Guardian</option>
                <option value="Friend">Friend</option>
                <option value="Colleague">Colleague</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="contact_number">Contact Number *</label>
              <input
                type="tel"
                id="contact_number"
                value={contactData.contact_number}
                onChange={(e) => handleInputChange('contact_number', e.target.value)}
                placeholder="e.g., 09123456789"
                disabled={loading}
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={contactData.is_primary}
                  onChange={(e) => handleInputChange('is_primary', e.target.checked)}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Primary Emergency Contact
              </label>
              <small className="form-hint">
                The primary contact will be called first in case of emergencies
              </small>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : (contact ? 'Update Contact' : 'Add Contact')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientContactModal;