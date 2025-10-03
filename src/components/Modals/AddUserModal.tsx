import React, { useState } from 'react';
import { userService, activityService } from '../../services/supabaseService';
import './Modal.css';
import './UserModals.css';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'admin',
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    position: '',
    employee_id: '',
    license_number: '',
    specialization: '',
    bio: '',
    gender: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }

      if (!formData.password.trim()) {
        throw new Error('Password is required');
      }

      await userService.createUser(formData);
      await activityService.logActivity({
        action: 'create',
        description: `Created new user: ${formData.username} with role: ${formData.role}`,
        category: 'user_management'
      });

      onSave();
      onClose();

      // Reset form
      setFormData({
        username: '',
        password: '',
        role: 'admin',
        first_name: '',
        last_name: '',
        phone: '',
        department: '',
        position: '',
        employee_id: '',
        license_number: '',
        specialization: '',
        bio: '',
        gender: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
        emergency_contact_relationship: ''
      });
    } catch (error: any) {
      setError(error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Add New User</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1.5rem'
              }}>
                {error}
              </div>
            )}

            {/* Profile Section */}
            <div className="profile-section">
              <div className="avatar-section">
                <div className="avatar-preview">
                  <div className="avatar-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  </div>
                </div>
              </div>
              <div className="basic-info-section">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    type="text"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    placeholder="Enter first name"
                  />
                </div>

                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    type="text"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleChange}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="role-selection">
                  <label>User Role *</label>
                  <div className="role-options">
                    <div className="role-option">
                      <input
                        type="radio"
                        id="role-admin"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={handleChange}
                        required
                      />
                      <label htmlFor="role-admin" className="role-label">
                        <div className="role-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                          </svg>
                        </div>
                        <div className="role-name">Admin</div>
                        <div className="role-description">Standard administrator privileges</div>
                      </label>
                    </div>
                    <div className="role-option">
                      <input
                        type="radio"
                        id="role-superadmin"
                        name="role"
                        value="superadmin"
                        checked={formData.role === 'superadmin'}
                        onChange={handleChange}
                      />
                      <label htmlFor="role-superadmin" className="role-label">
                        <div className="role-icon">
                          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1L9 9l-8 3 8 3 3 8 3-8 8-3-8-3-3-8z"/>
                          </svg>
                        </div>
                        <div className="role-name">Super Admin</div>
                        <div className="role-description">Full system access and control</div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Credentials Section */}
            <div className="credentials-section">
              <h3>Login Credentials</h3>
              <div className="credentials-grid">
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    placeholder="Enter unique username"
                  />
                </div>

                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter secure password"
                  />
                </div>
              </div>
            </div>

            {/* Department & Position Section */}
            <div className="department-position-section">
              <div className="form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                >
                  <option value="">Select Department</option>
                  <option value="medical">Medical</option>
                  <option value="dental">Dental</option>
                  <option value="administration">Administration</option>
                  <option value="pharmacy">Pharmacy</option>
                  <option value="laboratory">Laboratory</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>

              <div className="form-group">
                <label>Position</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  placeholder="e.g., Head Nurse, Staff Doctor"
                />
              </div>
            </div>

            {/* Contact Information Section */}
            <div className="contact-section">
              <h3>Contact Information</h3>
              <div className="contact-grid">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g., +63 912 345 6789"
                  />
                </div>

                <div className="form-group">
                  <label>Employee ID</label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    placeholder="e.g., EMP-2024-001"
                  />
                </div>

                <div className="form-group">
                  <label>License Number</label>
                  <input
                    type="text"
                    name="license_number"
                    value={formData.license_number}
                    onChange={handleChange}
                    placeholder="Professional license number"
                  />
                </div>

                <div className="form-group">
                  <label>Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    placeholder="e.g., Cardiology, Pediatrics"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Section */}
            <div className="emergency-section">
              <h3>Emergency Contact</h3>
              <div className="emergency-grid">
                <div className="form-group">
                  <label>Emergency Contact Name</label>
                  <input
                    type="text"
                    name="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                    placeholder="Emergency contact full name"
                  />
                </div>

                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="tel"
                    name="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={handleChange}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="form-group">
                  <label>Relationship</label>
                  <input
                    type="text"
                    name="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={handleChange}
                    placeholder="e.g., Spouse, Parent, Sibling"
                  />
                </div>
              </div>
            </div>

            {/* Bio Section */}
            <div className="bio-section">
              <div className="form-group">
                <label>Bio / Description</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Brief description about the user"
                  rows={3}
                  className="bio-textarea"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;