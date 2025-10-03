import React, { useState, useEffect } from 'react';
import { userService, activityService, authService } from '../../services/supabaseService';
import './Modal.css';
import './UserModals.css';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  user: any;
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onSave, user }) => {
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
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Get current user for permission checks
    const user = authService.getCurrentUser();
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (user && isOpen) {
      setFormData({
        username: user.username || '',
        password: '', // Always start empty for security
        role: user.role || 'admin',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        department: user.department || '',
        position: user.position || '',
        employee_id: user.employee_id || '',
        license_number: user.license_number || '',
        specialization: user.specialization || '',
        bio: user.bio || '',
        gender: user.gender || '',
        emergency_contact_name: user.emergency_contact_name || '',
        emergency_contact_phone: user.emergency_contact_phone || '',
        emergency_contact_relationship: user.emergency_contact_relationship || ''
      });
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  // Check permissions
  const canEdit = currentUser && user && (
    currentUser.id !== user.id && // Can't edit yourself
    !(user.role === 'superadmin' && currentUser.role === 'superadmin') // Superadmins can't edit other superadmins
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Check permissions again before submitting
      if (!canEdit) {
        throw new Error('You do not have permission to edit this user');
      }

      // Validate required fields
      if (!formData.username.trim()) {
        throw new Error('Username is required');
      }

      // Prepare update data - only include password if it's provided
      const updateData: any = { ...formData };
      if (!formData.password.trim()) {
        const { password, ...dataWithoutPassword } = updateData;
        await userService.updateUser(user.id, dataWithoutPassword);
      } else {
        await userService.updateUser(user.id, updateData);
      }
      await activityService.logActivity({
        action: 'update',
        description: `Updated user: ${formData.username} with role: ${formData.role}`,
        category: 'user_management'
      });

      onSave();
      onClose();
    } catch (error: any) {
      setError(error.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content user-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Edit User: {user?.username}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {!canEdit && (
              <div style={{
                background: '#fef3c7',
                color: '#92400e',
                padding: '1rem',
                borderRadius: '0.75rem',
                marginBottom: '1.5rem',
                textAlign: 'center',
                border: '1px solid #f59e0b'
              }}>
                <strong>⚠️ Access Restricted</strong>
                <br />
                {currentUser?.id === user?.id
                  ? "You cannot edit your own account."
                  : "You cannot edit other superadmin accounts."
                }
              </div>
            )}

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
                    <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="status-indicator active">
                  <div className="status-dot"></div>
                  Active User
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
                  />
                </div>

                <div className="form-group">
                  <label>Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    disabled={loading || !canEdit}
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
                        id="edit-role-admin"
                        name="role"
                        value="admin"
                        checked={formData.role === 'admin'}
                        onChange={handleChange}
                        required
                        disabled={loading || !canEdit}
                      />
                      <label htmlFor="edit-role-admin" className="role-label">
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
                        id="edit-role-superadmin"
                        name="role"
                        value="superadmin"
                        checked={formData.role === 'superadmin'}
                        onChange={handleChange}
                        disabled={loading || !canEdit}
                      />
                      <label htmlFor="edit-role-superadmin" className="role-label">
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
                    disabled={loading || !canEdit}
                  />
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Leave empty to keep current password"
                    disabled={loading || !canEdit}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>
                    Leave empty to keep current password
                  </small>
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
                  disabled={loading || !canEdit}
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
                  disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                    disabled={loading || !canEdit}
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
                  disabled={loading || !canEdit}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading || !canEdit}>
              {loading ? 'Updating...' : canEdit ? 'Update User' : 'Editing Restricted'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;