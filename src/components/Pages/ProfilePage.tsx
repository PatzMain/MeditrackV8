import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { profileService, UserProfile, PasswordChangeRequest } from '../../services/profileService';
import AvatarUpload from '../Profile/AvatarUpload';
import './ProfilePage.css';

const ProfilePage: React.FC = () => {
  const { updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [profileForm, setProfileForm] = useState<Partial<UserProfile>>({});
  const [passwordForm, setPasswordForm] = useState<PasswordChangeRequest>({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setIsLoading(true);
      const profileData = await profileService.getFullProfile();
      setProfile(profileData);
      setProfileForm(profileData);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to load profile data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setIsLoading(true);
      clearMessages();

      const updatedProfile = await profileService.updateProfile(profileForm);
      setProfile(updatedProfile);
      updateUser(updatedProfile);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setIsLoading(true);
      clearMessages();

      if (passwordForm.new_password !== passwordForm.confirm_password) {
        throw new Error('New passwords do not match');
      }

      if (passwordForm.new_password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }

      await profileService.changePassword(passwordForm);
      setPasswordForm({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      setSuccessMessage('Password changed successfully!');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string | null) => {
    if (profile) {
      const updatedProfile: UserProfile = { ...profile, avatar_url: avatarUrl || undefined };
      setProfile(updatedProfile);
      setProfileForm(updatedProfile);
      updateUser(updatedProfile as any);
      setSuccessMessage('Avatar updated successfully!');
    }
  };

  const clearMessages = () => {
    setSuccessMessage('');
    setErrorMessage('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getDisplayName = (profile: UserProfile) => {
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username || 'User';
  };

  if (isLoading && !profile) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="profile-error">
          <div className="error-icon">❌</div>
          <h2>Profile Not Found</h2>
          <p>Unable to load your profile data. Please try refreshing the page.</p>
          <button className="btn-primary" onClick={loadProfileData}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Profile Header */}
      <div className="profile-header">
        <div className="profile-banner">
          <div className="banner-gradient"></div>
        </div>

        <div className="profile-info-section">
          <div className="profile-main-info">
            <div className="avatar-section">
              <AvatarUpload
                user={profile}
                onAvatarUpdate={handleAvatarUpdate}
                size="large"
              />
            </div>

            <div className="profile-content-wrapper">
              <div className="profile-details">
                <h1 className="profile-name">{getDisplayName(profile)}</h1>
                <div className="profile-meta">
                  <span className="role-badge">{profile.role?.charAt(0).toUpperCase()}{profile.role?.slice(1)}</span>
                  {profile.department && <span className="department">{profile.department}</span>}
                  {profile.position && <span className="position">{profile.position}</span>}
                </div>
                {profile.bio && <p className="profile-bio">{profile.bio}</p>}
              </div>
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-card">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{profile.login_count || 0}</div>
                <div className="stat-label">Total Logins</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📅</div>
              <div className="stat-content">
                <div className="stat-value">{profile.created_at ? Math.floor((new Date().getTime() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24)) : 0}</div>
                <div className="stat-label">Days Active</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">{profile.role === 'superadmin' ? '⭐' : '👤'}</div>
              <div className="stat-content">
                <div className="stat-value">{profile.role === 'superadmin' ? 'Super' : 'Admin'}</div>
                <div className="stat-label">Role Level</div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="message-banner success">
            <div className="message-icon">✅</div>
            <span>{successMessage}</span>
            <button className="message-close" onClick={() => setSuccessMessage('')}>×</button>
          </div>
        )}

        {errorMessage && (
          <div className="message-banner error">
            <div className="message-icon">❌</div>
            <span>{errorMessage}</span>
            <button className="message-close" onClick={() => setErrorMessage('')}>×</button>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="profile-tabs">
        <div className="tab-nav">
          <button
            className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>
            </svg>
            Overview
          </button>

          <button
            className={`tab-button ${activeTab === 'personal' ? 'active' : ''}`}
            onClick={() => setActiveTab('personal')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Personal Info
          </button>

          <button
            className={`tab-button ${activeTab === 'professional' ? 'active' : ''}`}
            onClick={() => setActiveTab('professional')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
              <line x1="8" y1="21" x2="16" y2="21"/>
              <line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
            Professional
          </button>

          <button
            className={`tab-button ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab('security')}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <circle cx="12" cy="16" r="1"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Security
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="overview-tab">
            <div className="overview-grid">
              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">💼</div>
                  <h3>Quick Info</h3>
                </div>
                <div className="info-list">
                  <div className="info-item">
                    <div className="info-icon">🆔</div>
                    <div className="info-content">
                      <span className="info-label">Employee ID</span>
                      <span className="info-value">{profile.employee_id || 'Not set'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">🏢</div>
                    <div className="info-content">
                      <span className="info-label">Department</span>
                      <span className="info-value">{profile.department || 'Not assigned'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">👨‍💼</div>
                    <div className="info-content">
                      <span className="info-label">Position</span>
                      <span className="info-value">{profile.position || 'Not specified'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">📱</div>
                    <div className="info-content">
                      <span className="info-label">Phone</span>
                      <span className="info-value">{profile.phone || 'Not provided'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">🛡️</div>
                  <h3>Account Status</h3>
                </div>
                <div className="status-grid">
                  <div className="status-item">
                    <div className="status-icon active">✅</div>
                    <div className="status-text">
                      <div className="status-title">Account Active</div>
                      <div className="status-desc">Your account is in good standing</div>
                    </div>
                  </div>
                  <div className="status-item">
                    <div className="status-icon">{profile.role === 'superadmin' ? '⭐' : '👤'}</div>
                    <div className="status-text">
                      <div className="status-title">Role: {profile.role?.charAt(0).toUpperCase()}{profile.role?.slice(1)}</div>
                      <div className="status-desc">System access level</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overview-card">
                <div className="card-header">
                  <div className="card-icon">ℹ️</div>
                  <h3>Account Info</h3>
                </div>
                <div className="info-list">
                  <div className="info-item">
                    <div className="info-icon">👤</div>
                    <div className="info-content">
                      <span className="info-label">Username</span>
                      <span className="info-value">{profile.username}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">🗓️</div>
                    <div className="info-content">
                      <span className="info-label">Created</span>
                      <span className="info-value">{profile.created_at ? formatDate(profile.created_at) : 'Unknown'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">✏️</div>
                    <div className="info-content">
                      <span className="info-label">Last Updated</span>
                      <span className="info-value">{profile.updated_at ? formatDate(profile.updated_at) : 'Never'}</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <div className="info-icon">🕒</div>
                    <div className="info-content">
                      <span className="info-label">Last Login</span>
                      <span className="info-value">{profile.last_login ? formatDate(profile.last_login) : 'Never'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="personal-tab">
            <div className="tab-header">
              <h2>Personal Information</h2>
              <button
                className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => {
                  if (isEditing) {
                    setProfileForm(profile);
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                  clearMessages();
                }}
                disabled={isLoading}
              >
                {isEditing ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="form-sections">
              <div className="form-section">
                <h3>Basic Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="first_name">First Name</label>
                    <input
                      id="first_name"
                      type="text"
                      value={profileForm.first_name || ''}
                      onChange={(e) => setProfileForm({...profileForm, first_name: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your first name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="last_name">Last Name</label>
                    <input
                      id="last_name"
                      type="text"
                      value={profileForm.last_name || ''}
                      onChange={(e) => setProfileForm({...profileForm, last_name: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your last name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="username">Username</label>
                    <input
                      id="username"
                      type="text"
                      value={profileForm.username || ''}
                      disabled
                      className="readonly"
                    />
                    <small>Username cannot be changed</small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={profileForm.phone || ''}
                      onChange={(e) => setProfileForm({...profileForm, phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your phone number"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="gender">Gender</label>
                    <select
                      id="gender"
                      value={profileForm.gender || ''}
                      onChange={(e) => setProfileForm({...profileForm, gender: e.target.value})}
                      disabled={!isEditing}
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">Prefer not to say</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Emergency Contact</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="emergency_contact_name">Contact Name</label>
                    <input
                      id="emergency_contact_name"
                      type="text"
                      value={profileForm.emergency_contact_name || ''}
                      onChange={(e) => setProfileForm({...profileForm, emergency_contact_name: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter emergency contact name"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="emergency_contact_phone">Contact Phone</label>
                    <input
                      id="emergency_contact_phone"
                      type="tel"
                      value={profileForm.emergency_contact_phone || ''}
                      onChange={(e) => setProfileForm({...profileForm, emergency_contact_phone: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter emergency contact phone"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="emergency_contact_relationship">Relationship</label>
                    <input
                      id="emergency_contact_relationship"
                      type="text"
                      value={profileForm.emergency_contact_relationship || ''}
                      onChange={(e) => setProfileForm({...profileForm, emergency_contact_relationship: e.target.value})}
                      disabled={!isEditing}
                      placeholder="e.g., Spouse, Parent, Sibling"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>About</h3>
                <div className="form-group full-width">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    value={profileForm.bio || ''}
                    onChange={(e) => setProfileForm({...profileForm, bio: e.target.value})}
                    disabled={!isEditing}
                    placeholder="Tell us about yourself"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setProfileForm(profile);
                    setIsEditing(false);
                    clearMessages();
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'professional' && (
          <div className="professional-tab">
            <div className="tab-header">
              <h2>Professional Information</h2>
              <button
                className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => {
                  if (isEditing) {
                    setProfileForm(profile);
                    setIsEditing(false);
                  } else {
                    setIsEditing(true);
                  }
                  clearMessages();
                }}
                disabled={isLoading}
              >
                {isEditing ? 'Cancel' : 'Edit Professional Info'}
              </button>
            </div>

            <div className="form-sections">
              <div className="form-section">
                <h3>Work Information</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="employee_id">Employee ID</label>
                    <input
                      id="employee_id"
                      type="text"
                      value={profileForm.employee_id || ''}
                      onChange={(e) => setProfileForm({...profileForm, employee_id: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your employee ID"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <input
                      id="department"
                      type="text"
                      value={profileForm.department || ''}
                      onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your department"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="position">Position/Title</label>
                    <input
                      id="position"
                      type="text"
                      value={profileForm.position || ''}
                      onChange={(e) => setProfileForm({...profileForm, position: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your position"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="license_number">License Number</label>
                    <input
                      id="license_number"
                      type="text"
                      value={profileForm.license_number || ''}
                      onChange={(e) => setProfileForm({...profileForm, license_number: e.target.value})}
                      disabled={!isEditing}
                      placeholder="Enter your professional license number"
                    />
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3>Specialization</h3>
                <div className="form-group full-width">
                  <label htmlFor="specialization">Areas of Specialization</label>
                  <textarea
                    id="specialization"
                    value={profileForm.specialization || ''}
                    onChange={(e) => setProfileForm({...profileForm, specialization: e.target.value})}
                    disabled={!isEditing}
                    placeholder="Describe your areas of specialization and expertise"
                    rows={4}
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveProfile}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setProfileForm(profile);
                    setIsEditing(false);
                    clearMessages();
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="security-tab">
            <div className="security-sections">
              <div className="security-section">
                <h3>Change Password</h3>
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="current_password">Current Password</label>
                    <input
                      id="current_password"
                      type="password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm({...passwordForm, current_password: e.target.value})}
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="new_password">New Password</label>
                    <input
                      id="new_password"
                      type="password"
                      value={passwordForm.new_password}
                      onChange={(e) => setPasswordForm({...passwordForm, new_password: e.target.value})}
                      placeholder="Enter new password"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="confirm_password">Confirm New Password</label>
                    <input
                      id="confirm_password"
                      type="password"
                      value={passwordForm.confirm_password}
                      onChange={(e) => setPasswordForm({...passwordForm, confirm_password: e.target.value})}
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>

                <button
                  className="btn btn-primary"
                  onClick={handlePasswordChange}
                  disabled={isLoading || !passwordForm.current_password || !passwordForm.new_password}
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>

              <div className="security-section">
                <h3>Account Security</h3>
                <div className="security-stats">
                  <div className="security-stat">
                    <div className="stat-icon">🕒</div>
                    <div className="stat-content">
                      <div className="stat-title">Last Login</div>
                      <div className="stat-value">{profile.last_login ? formatDate(profile.last_login) : 'Never'}</div>
                    </div>
                  </div>

                  <div className="security-stat">
                    <div className="stat-icon">📊</div>
                    <div className="stat-content">
                      <div className="stat-title">Login Count</div>
                      <div className="stat-value">{profile.login_count || 0} times</div>
                    </div>
                  </div>

                  <div className="security-stat">
                    <div className="stat-icon">📅</div>
                    <div className="stat-content">
                      <div className="stat-title">Account Created</div>
                      <div className="stat-value">{profile.created_at ? formatDate(profile.created_at) : 'Unknown'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;