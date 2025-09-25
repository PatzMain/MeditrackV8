import React, { useState, useEffect } from 'react';
import {
  patientMonitoringService,
  activityService,
  type Patient,
  type PatientContact,
  type MedicalHistory
} from '../../../services/supabaseService';
import './PatientModals.css';

interface EditPatientModalProps {
  isOpen: boolean;
  patient: Patient | null;
  onClose: () => void;
  onSave: (patient: Patient) => void;
}

interface PatientFormData {
  first_name: string;
  last_name: string;
  middle_name: string;
  age: number | '';
  sex: 'Male' | 'Female' | '';
  civil_status: 'Single' | 'Married' | 'Divorced' | 'Widowed' | '';
  birthday: string;
  address: string;
  patient_type: 'Employee' | 'Dependent' | 'Student' | 'OPD' | '';
  course_department: string;
  student_level: string;
  year_level: number | '';
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'archived';
}

interface ContactFormData {
  id?: number;
  contact_name: string;
  relationship: string;
  contact_number: string;
  is_primary: boolean;
  isNew?: boolean;
}

interface MedicalHistoryFormData {
  id?: number;
  food_allergies: string;
  drug_allergies: string;
  other_allergies: string;
  family_ptb: boolean;
  family_cancer: boolean;
  family_dm: boolean;
  family_cardiovascular: boolean;
  family_others: string;
  seizure: boolean;
  asthma: boolean;
  ptb: boolean;
  surgery: boolean;
  cardio: boolean;
  neuro: boolean;
  ob_gyne: boolean;
  other_conditions: string;
}

const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSave
}) => {
  const [activeStep, setActiveStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

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
    email: '',
    status: 'active'
  });

  const [contacts, setContacts] = useState<ContactFormData[]>([]);
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

  const [contactsToDelete, setContactsToDelete] = useState<number[]>([]);

  // Load initial data when modal opens
  useEffect(() => {
    if (patient && isOpen && !initialDataLoaded) {
      loadPatientData();
    }
  }, [patient, isOpen, initialDataLoaded]);

  const loadPatientData = async () => {
    if (!patient) return;

    try {
      setLoading(true);
      setError(null);

      // Load patient basic data
      setPatientData({
        first_name: patient.first_name,
        last_name: patient.last_name,
        middle_name: patient.middle_name || '',
        age: patient.age || '',
        sex: patient.sex || '',
        civil_status: patient.civil_status || '',
        birthday: patient.birthday || '',
        address: patient.address || '',
        patient_type: patient.patient_type,
        course_department: patient.course_department || '',
        student_level: patient.student_level || '',
        year_level: patient.year_level || '',
        phone: patient.phone || '',
        email: patient.email || '',
        status: patient.status
      });

      // Load contacts and medical history in parallel
      const [contactsData, medicalHistoryData] = await Promise.all([
        patientMonitoringService.getPatientContacts(patient.id),
        patientMonitoringService.getMedicalHistory(patient.id)
      ]);

      // Set contacts (ensure at least one contact exists)
      if (contactsData.length > 0) {
        setContacts(contactsData.map(contact => ({
          id: contact.id,
          contact_name: contact.contact_name,
          relationship: contact.relationship,
          contact_number: contact.contact_number,
          is_primary: contact.is_primary,
          isNew: false
        })));
      } else {
        setContacts([{
          contact_name: '',
          relationship: '',
          contact_number: '',
          is_primary: true,
          isNew: true
        }]);
      }

      // Set medical history
      if (medicalHistoryData) {
        setMedicalHistory({
          id: medicalHistoryData.id,
          food_allergies: medicalHistoryData.food_allergies || '',
          drug_allergies: medicalHistoryData.drug_allergies || '',
          other_allergies: medicalHistoryData.other_allergies || '',
          family_ptb: medicalHistoryData.family_ptb,
          family_cancer: medicalHistoryData.family_cancer,
          family_dm: medicalHistoryData.family_dm,
          family_cardiovascular: medicalHistoryData.family_cardiovascular,
          family_others: medicalHistoryData.family_others || '',
          seizure: medicalHistoryData.seizure,
          asthma: medicalHistoryData.asthma,
          ptb: medicalHistoryData.ptb,
          surgery: medicalHistoryData.surgery,
          cardio: medicalHistoryData.cardio,
          neuro: medicalHistoryData.neuro,
          ob_gyne: medicalHistoryData.ob_gyne,
          other_conditions: medicalHistoryData.other_conditions || ''
        });
      }

      setInitialDataLoaded(true);
    } catch (error: any) {
      console.error('Error loading patient data:', error);
      setError(`Failed to load patient data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientDataChange = (field: keyof PatientFormData, value: any) => {
    setPatientData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleContactChange = (index: number, field: keyof ContactFormData, value: any) => {
    setContacts(prev => prev.map((contact, i) => {
      if (i === index) {
        const updatedContact = { ...contact, [field]: value };
        // Mark as new if it doesn't have an ID and isn't already marked as new
        if (!contact.id && !contact.isNew) {
          updatedContact.isNew = true;
        }
        return updatedContact;
      }
      return contact;
    }));
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
      contact_name: '',
      relationship: '',
      contact_number: '',
      is_primary: false,
      isNew: true
    }]);
  };

  const removeContact = (index: number) => {
    const contactToRemove = contacts[index];

    if (contactToRemove.id) {
      // Mark existing contact for deletion
      setContactsToDelete(prev => [...prev, contactToRemove.id!]);
    }

    // Remove from contacts list
    setContacts(prev => prev.filter((_, i) => i !== index));
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
        return contacts.filter(c => c.contact_name || c.relationship || c.contact_number).every(contact =>
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
    if (!patient) return;

    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!patientData.first_name || !patientData.last_name || !patientData.patient_type) {
        setError('Please fill in all required fields');
        return;
      }

      // Update patient basic information
      const patientPayload = {
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        middle_name: patientData.middle_name || undefined,
        age: patientData.age || undefined,
        sex: patientData.sex || undefined,
        civil_status: patientData.civil_status || undefined,
        birthday: patientData.birthday || undefined,
        address: patientData.address || undefined,
        patient_type: patientData.patient_type as 'Employee' | 'Dependent' | 'Student' | 'OPD',
        course_department: patientData.course_department || undefined,
        student_level: patientData.student_level || undefined,
        year_level: patientData.year_level || undefined,
        phone: patientData.phone || undefined,
        email: patientData.email || undefined,
        status: patientData.status
      };

      const updatedPatient = await patientMonitoringService.updatePatient(patient.id, patientPayload);

      // Delete contacts marked for deletion
      for (const contactId of contactsToDelete) {
        await patientMonitoringService.deletePatientContact(contactId);
      }

      // Update/create contacts
      for (const contact of contacts) {
        if (contact.contact_name && contact.relationship && contact.contact_number) {
          if (contact.id && !contact.isNew) {
            // Update existing contact
            await patientMonitoringService.updatePatientContact(contact.id, {
              contact_name: contact.contact_name,
              relationship: contact.relationship,
              contact_number: contact.contact_number,
              is_primary: contact.is_primary
            });
          } else if (contact.isNew) {
            // Create new contact
            await patientMonitoringService.createPatientContact({
              patient_id: patient.id,
              contact_name: contact.contact_name,
              relationship: contact.relationship,
              contact_number: contact.contact_number,
              is_primary: contact.is_primary
            });
          }
        }
      }

      // Update/create medical history
      const hasAnyMedicalHistory = Object.entries(medicalHistory).some(([key, value]) => {
        if (key === 'id') return false;
        if (typeof value === 'boolean') return value;
        return value && value.toString().trim() !== '';
      });

      if (hasAnyMedicalHistory) {
        const medicalHistoryPayload = {
          patient_id: patient.id,
          food_allergies: medicalHistory.food_allergies || undefined,
          drug_allergies: medicalHistory.drug_allergies || undefined,
          other_allergies: medicalHistory.other_allergies || undefined,
          family_ptb: medicalHistory.family_ptb,
          family_cancer: medicalHistory.family_cancer,
          family_dm: medicalHistory.family_dm,
          family_cardiovascular: medicalHistory.family_cardiovascular,
          family_others: medicalHistory.family_others || undefined,
          seizure: medicalHistory.seizure,
          asthma: medicalHistory.asthma,
          ptb: medicalHistory.ptb,
          surgery: medicalHistory.surgery,
          cardio: medicalHistory.cardio,
          neuro: medicalHistory.neuro,
          ob_gyne: medicalHistory.ob_gyne,
          other_conditions: medicalHistory.other_conditions || undefined
        };

        if (medicalHistory.id) {
          await patientMonitoringService.updateMedicalHistory(medicalHistory.id, medicalHistoryPayload);
        } else {
          await patientMonitoringService.createMedicalHistory(medicalHistoryPayload);
        }
      }

      // Log activity
      await activityService.logActivity({
        action: 'update_patient',
        description: `Updated patient information: ${updatedPatient.first_name} ${updatedPatient.last_name}`,
        details: { patient_id: updatedPatient.id, changes: patientPayload }
      });

      onSave(updatedPatient);
      handleClose();
    } catch (error: any) {
      console.error('Error updating patient:', error);
      setError(`Failed to update patient: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(1);
    setInitialDataLoaded(false);
    setContactsToDelete([]);
    setError(null);
    onClose();
  };

  if (!isOpen || !patient) return null;

  if (loading && !initialDataLoaded) {
    return (
      <div className="modal-overlay">
        <div className="modal-content large-modal">
          <div className="loading-message">Loading patient data...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Edit Patient: {patient.first_name} {patient.last_name}</h2>
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

                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={patientData.status}
                    onChange={(e) => handlePatientDataChange('status', e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="archived">Archived</option>
                  </select>
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

          {/* Step 2: Emergency Contacts - Same as AddPatientModal */}
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
                    <h4>Contact {index + 1} {contact.isNew && <span className="new-badge">New</span>}</h4>
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
                            if (e.target.checked) {
                              // Ensure only one primary contact
                              setContacts(prev => prev.map((c, i) =>
                                i === index ? { ...c, is_primary: true } : { ...c, is_primary: false }
                              ));
                            } else {
                              handleContactChange(index, 'is_primary', false);
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

          {/* Step 3: Medical History - Same as AddPatientModal */}
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
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditPatientModal;