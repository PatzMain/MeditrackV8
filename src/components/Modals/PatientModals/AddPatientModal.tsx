import React, { useState } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Patient
} from '../../../services/supabaseService';
import './PatientModals.css';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

interface PatientFormData {
  // Basic Information
  first_name: string;
  last_name: string;
  middle_name: string;
  age: number | '';
  sex: 'Male' | 'Female' | '';
  civil_status: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
  birthday: string;
  address: string;

  // Patient Type and Classification
  patient_type: 'Employee' | 'Dependent' | 'Student' | 'OPD' | '';
  course_department: string;
  student_level: string;
  year_level: number | '';

  // Contact Information
  phone: string;
  email: string;
}

interface ContactFormData {
  contact_name: string;
  relationship: string;
  contact_number: string;
  is_primary: boolean;
}

interface MedicalHistoryFormData {
  // Allergies
  food_allergies: string;
  drug_allergies: string;
  other_allergies: string;

  // Family History
  family_ptb: boolean;
  family_cancer: boolean;
  family_dm: boolean;
  family_cardiovascular: boolean;
  family_others: string;

  // Medical History
  seizure: boolean;
  asthma: boolean;
  ptb: boolean;
  surgery: boolean;
  cardio: boolean;
  neuro: boolean;
  ob_gyne: boolean;
  other_conditions: string;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSave }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patientData, setPatientData] = useState<PatientFormData>({
    first_name: '',
    last_name: '',
    middle_name: '',
    age: '',
    sex: '',
    civil_status: '',
    birthday: '',
    address: '',
    patient_type: '',
    course_department: '',
    student_level: '',
    year_level: '',
    phone: '',
    email: ''
  });

  const [contacts, setContacts] = useState<ContactFormData[]>([{
    contact_name: '',
    relationship: '',
    contact_number: '',
    is_primary: true
  }]);

  const [medicalHistory, setMedicalHistory] = useState<MedicalHistoryFormData>({
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

  const handlePatientDataChange = (field: keyof PatientFormData, value: any) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (index: number, field: keyof ContactFormData, value: any) => {
    setContacts(prev => prev.map((contact, i) =>
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
      contact_name: '',
      relationship: '',
      contact_number: '',
      is_primary: false
    }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleMedicalHistoryChange = (field: keyof MedicalHistoryFormData, value: any) => {
    setMedicalHistory(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(patientData.first_name && patientData.last_name && patientData.patient_type);
      case 2:
        return contacts.every(contact =>
          contact.contact_name && contact.relationship && contact.contact_number
        );
      case 3:
        return true; // Medical history is optional
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep(prev => Math.min(prev + 1, 3));
      setError(null);
    } else {
      setError('Please fill in all required fields');
    }
  };

  const handlePrevious = () => {
    setActiveStep(prev => Math.max(prev - 1, 1));
    setError(null);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!patientData.first_name || !patientData.last_name || !patientData.patient_type) {
        setError('Please fill in all required fields');
        return;
      }

      // Create patient payload with proper typing
      const patientPayload = {
        ...patientData,
        // Convert empty strings to undefined for optional fields
        middle_name: patientData.middle_name || undefined,
        age: patientData.age || undefined,
        sex: patientData.sex || undefined,
        civil_status: patientData.civil_status || undefined,
        birthday: patientData.birthday || undefined,
        address: patientData.address || undefined,
        course_department: patientData.course_department || undefined,
        student_level: patientData.student_level || undefined,
        year_level: patientData.year_level || undefined,
        phone: patientData.phone || undefined,
        email: patientData.email || undefined,
        patient_type: patientData.patient_type as 'Employee' | 'Dependent' | 'Student' | 'OPD',
        status: 'active' as const
      };

      const newPatient = await patientMonitoringService.createPatient(patientPayload);

      // Create contacts
      for (const contact of contacts) {
        if (contact.contact_name && contact.relationship && contact.contact_number) {
          await patientMonitoringService.createPatientContact({
            patient_id: newPatient.id,
            ...contact
          });
        }
      }

      // Create medical history
      const hasAnyMedicalHistory = Object.entries(medicalHistory).some(([key, value]) => {
        if (typeof value === 'boolean') return value;
        return value && value.toString().trim() !== '';
      });

      if (hasAnyMedicalHistory) {
        await patientMonitoringService.createMedicalHistory({
          patient_id: newPatient.id,
          ...medicalHistory
        });
      }

      // Log activity
      await activityService.logActivity({
        action: 'create_patient',
        description: `Created new patient: ${newPatient.first_name} ${newPatient.last_name}`,
        details: { patient_id: newPatient.id, patient_type: newPatient.patient_type }
      });

      onSave(newPatient);
      handleClose();
    } catch (error: any) {
      console.error('Error creating patient:', error);
      setError(`Failed to create patient: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(1);
    setPatientData({
      first_name: '',
      last_name: '',
      middle_name: '',
      age: '',
      sex: '',
      civil_status: '',
      birthday: '',
      address: '',
      patient_type: '',
      course_department: '',
      student_level: '',
      year_level: '',
      phone: '',
      email: ''
    });
    setContacts([{
      contact_name: '',
      relationship: '',
      contact_number: '',
      is_primary: true
    }]);
    setMedicalHistory({
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
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Add New Patient</h2>
          <button className="modal-close" onClick={handleClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${activeStep >= 1 ? 'active' : ''} ${activeStep > 1 ? 'completed' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Patient Information</div>
          </div>
          <div className={`step ${activeStep >= 2 ? 'active' : ''} ${activeStep > 2 ? 'completed' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Emergency Contacts</div>
          </div>
          <div className={`step ${activeStep >= 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Medical History</div>
          </div>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {/* Step 1: Patient Information */}
          {activeStep === 1 && (
            <div className="form-step">
              <h3>Basic Information</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    type="text"
                    value={patientData.first_name}
                    onChange={(e) => handlePatientDataChange('first_name', e.target.value)}
                    placeholder="Enter first name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Last Name *</label>
                  <input
                    type="text"
                    value={patientData.last_name}
                    onChange={(e) => handlePatientDataChange('last_name', e.target.value)}
                    placeholder="Enter last name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Middle Name</label>
                  <input
                    type="text"
                    value={patientData.middle_name}
                    onChange={(e) => handlePatientDataChange('middle_name', e.target.value)}
                    placeholder="Enter middle name"
                  />
                </div>

                <div className="form-group">
                  <label>Age</label>
                  <input
                    type="number"
                    value={patientData.age}
                    onChange={(e) => handlePatientDataChange('age', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="Enter age"
                    min="0"
                    max="150"
                  />
                </div>

                <div className="form-group">
                  <label>Sex</label>
                  <select
                    value={patientData.sex}
                    onChange={(e) => handlePatientDataChange('sex', e.target.value)}
                  >
                    <option value="">Select sex</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Civil Status</label>
                  <select
                    value={patientData.civil_status}
                    onChange={(e) => handlePatientDataChange('civil_status', e.target.value)}
                  >
                    <option value="">Select civil status</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Birthday</label>
                  <input
                    type="date"
                    value={patientData.birthday}
                    onChange={(e) => handlePatientDataChange('birthday', e.target.value)}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Address</label>
                  <textarea
                    value={patientData.address}
                    onChange={(e) => handlePatientDataChange('address', e.target.value)}
                    placeholder="Enter complete address"
                    rows={3}
                  />
                </div>
              </div>

              <h3>Patient Classification</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Patient Type *</label>
                  <select
                    value={patientData.patient_type}
                    onChange={(e) => handlePatientDataChange('patient_type', e.target.value)}
                    required
                  >
                    <option value="">Select patient type</option>
                    <option value="Student">Student</option>
                    <option value="Employee">Employee</option>
                    <option value="Dependent">Dependent</option>
                    <option value="OPD">OPD</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Department/Course</label>
                  <input
                    type="text"
                    value={patientData.course_department}
                    onChange={(e) => handlePatientDataChange('course_department', e.target.value)}
                    placeholder="Enter department or course"
                  />
                </div>

                {patientData.patient_type === 'Student' && (
                  <>
                    <div className="form-group">
                      <label>Student Level</label>
                      <select
                        value={patientData.student_level}
                        onChange={(e) => handlePatientDataChange('student_level', e.target.value)}
                      >
                        <option value="">Select level</option>
                        <option value="highschool">High School</option>
                        <option value="college">College</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Year Level</label>
                      <input
                        type="number"
                        value={patientData.year_level}
                        onChange={(e) => handlePatientDataChange('year_level', e.target.value ? parseInt(e.target.value) : '')}
                        placeholder={patientData.student_level === 'highschool' ? 'Grade (7-12)' : 'Year (1-6)'}
                        min={patientData.student_level === 'highschool' ? 7 : 1}
                        max={patientData.student_level === 'highschool' ? 12 : 6}
                      />
                    </div>
                  </>
                )}
              </div>

              <h3>Contact Information</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    value={patientData.phone}
                    onChange={(e) => handlePatientDataChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={patientData.email}
                    onChange={(e) => handlePatientDataChange('email', e.target.value)}
                    placeholder="Enter email address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Emergency Contacts */}
          {activeStep === 2 && (
            <div className="form-step">
              <div className="section-header">
                <h3>Emergency Contacts</h3>
                <button type="button" className="btn-secondary small" onClick={addContact}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add Contact
                </button>
              </div>

              {contacts.map((contact, index) => (
                <div key={index} className="contact-form">
                  <div className="contact-header">
                    <h4>Contact {index + 1}</h4>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        className="btn-danger small"
                        onClick={() => removeContact(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label>Contact Name *</label>
                      <input
                        type="text"
                        value={contact.contact_name}
                        onChange={(e) => handleContactChange(index, 'contact_name', e.target.value)}
                        placeholder="Enter contact name"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Relationship *</label>
                      <input
                        type="text"
                        value={contact.relationship}
                        onChange={(e) => handleContactChange(index, 'relationship', e.target.value)}
                        placeholder="e.g., Mother, Father, Spouse"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Contact Number *</label>
                      <input
                        type="tel"
                        value={contact.contact_number}
                        onChange={(e) => handleContactChange(index, 'contact_number', e.target.value)}
                        placeholder="Enter phone number"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={contact.is_primary}
                          onChange={(e) => {
                            handleContactChange(index, 'is_primary', e.target.checked);
                            // Ensure only one primary contact
                            if (e.target.checked) {
                              setContacts(prev => prev.map((c, i) =>
                                i === index ? { ...c, is_primary: true } : { ...c, is_primary: false }
                              ));
                            }
                          }}
                        />
                        Primary Contact
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Medical History */}
          {activeStep === 3 && (
            <div className="form-step">
              <h3>Medical History (Optional)</h3>

              <div className="medical-section">
                <h4>Allergies</h4>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Food Allergies</label>
                    <textarea
                      value={medicalHistory.food_allergies}
                      onChange={(e) => handleMedicalHistoryChange('food_allergies', e.target.value)}
                      placeholder="List any food allergies"
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Drug Allergies</label>
                    <textarea
                      value={medicalHistory.drug_allergies}
                      onChange={(e) => handleMedicalHistoryChange('drug_allergies', e.target.value)}
                      placeholder="List any drug allergies"
                      rows={2}
                    />
                  </div>

                  <div className="form-group">
                    <label>Other Allergies</label>
                    <textarea
                      value={medicalHistory.other_allergies}
                      onChange={(e) => handleMedicalHistoryChange('other_allergies', e.target.value)}
                      placeholder="List any other allergies"
                      rows={2}
                    />
                  </div>
                </div>
              </div>

              <div className="medical-section">
                <h4>Family History</h4>
                <div className="checkbox-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.family_ptb}
                      onChange={(e) => handleMedicalHistoryChange('family_ptb', e.target.checked)}
                    />
                    Pulmonary Tuberculosis (PTB)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.family_cancer}
                      onChange={(e) => handleMedicalHistoryChange('family_cancer', e.target.checked)}
                    />
                    Cancer
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.family_dm}
                      onChange={(e) => handleMedicalHistoryChange('family_dm', e.target.checked)}
                    />
                    Diabetes Mellitus (DM)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.family_cardiovascular}
                      onChange={(e) => handleMedicalHistoryChange('family_cardiovascular', e.target.checked)}
                    />
                    Cardiovascular Disease
                  </label>
                </div>

                <div className="form-group">
                  <label>Other Family History</label>
                  <textarea
                    value={medicalHistory.family_others}
                    onChange={(e) => handleMedicalHistoryChange('family_others', e.target.value)}
                    placeholder="Any other family medical history"
                    rows={2}
                  />
                </div>
              </div>

              <div className="medical-section">
                <h4>Personal Medical History</h4>
                <div className="checkbox-grid">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.seizure}
                      onChange={(e) => handleMedicalHistoryChange('seizure', e.target.checked)}
                    />
                    Seizure
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.asthma}
                      onChange={(e) => handleMedicalHistoryChange('asthma', e.target.checked)}
                    />
                    Asthma
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.ptb}
                      onChange={(e) => handleMedicalHistoryChange('ptb', e.target.checked)}
                    />
                    Pulmonary Tuberculosis (PTB)
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.surgery}
                      onChange={(e) => handleMedicalHistoryChange('surgery', e.target.checked)}
                    />
                    Previous Surgery
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.cardio}
                      onChange={(e) => handleMedicalHistoryChange('cardio', e.target.checked)}
                    />
                    Cardiovascular Disease
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.neuro}
                      onChange={(e) => handleMedicalHistoryChange('neuro', e.target.checked)}
                    />
                    Neurological Condition
                  </label>

                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={medicalHistory.ob_gyne}
                      onChange={(e) => handleMedicalHistoryChange('ob_gyne', e.target.checked)}
                    />
                    OB-GYNE Condition
                  </label>
                </div>

                <div className="form-group">
                  <label>Other Medical Conditions</label>
                  <textarea
                    value={medicalHistory.other_conditions}
                    onChange={(e) => handleMedicalHistoryChange('other_conditions', e.target.value)}
                    placeholder="Any other medical conditions"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="footer-left">
            {activeStep > 1 && (
              <button className="btn-secondary" onClick={handlePrevious}>
                Previous
              </button>
            )}
          </div>

          <div className="footer-right">
            <button className="btn-secondary" onClick={handleClose}>
              Cancel
            </button>
            {activeStep < 3 ? (
              <button
                className="btn-primary"
                onClick={handleNext}
                disabled={!validateStep(activeStep)}
              >
                Next
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={handleSave}
                disabled={loading || !validateStep(1)}
              >
                {loading ? 'Creating...' : 'Create Patient'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddPatientModal;