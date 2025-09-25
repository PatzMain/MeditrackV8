import React, { useState, useEffect } from 'react';
import { userService, activityService } from '../../services/supabaseService';
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
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit User</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
            {error && (
              <div style={{
                background: '#fee2e2',
                color: '#dc2626',
                padding: '0.75rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                {error}
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>Username *</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="Enter unique username"
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Role *</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  required
                  disabled={loading}
                >
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label>First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., +63 912 345 6789"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={loading}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Department</label>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Brief description"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact Name</label>
                <input
                  type="text"
                  name="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={handleChange}
                  placeholder="Emergency contact full name"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact Phone</label>
                <input
                  type="tel"
                  name="emergency_contact_phone"
                  value={formData.emergency_contact_phone}
                  onChange={handleChange}
                  placeholder="Emergency contact phone"
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label>Emergency Contact Relationship</label>
                <input
                  type="text"
                  name="emergency_contact_relationship"
                  value={formData.emergency_contact_relationship}
                  onChange={handleChange}
                  placeholder="e.g., Spouse, Parent, Sibling"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;