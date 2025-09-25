import React, { useState, useRef } from 'react';
import { profileService, UserProfile } from '../../services/profileService';
import './AvatarUpload.css';

interface AvatarUploadProps {
  user: UserProfile;
  onAvatarUpdate: (avatarUrl: string | null) => void;
  size?: 'small' | 'medium' | 'large';
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  user,
  onAvatarUpdate,
  size = 'medium'
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setShowMenu(false);

    try {
      const avatarUrl = await profileService.uploadAvatar(file);
      onAvatarUpdate(avatarUrl);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      alert(error.message || 'Failed to upload avatar');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveAvatar = async () => {
    setIsUploading(true);
    setShowMenu(false);

    try {
      await profileService.removeAvatar();
      onAvatarUpdate(null);
    } catch (error: any) {
      console.error('Error removing avatar:', error);
      alert(error.message || 'Failed to remove avatar');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    }
    return user.username?.charAt(0).toUpperCase() || 'U';
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return 'avatar-small';
      case 'large': return 'avatar-large';
      default: return 'avatar-medium';
    }
  };

  return (
    <div className={`avatar-upload ${getSizeClass()}`}>
      <div
        className={`avatar-container ${isUploading ? 'uploading' : ''}`}
        onClick={() => setShowMenu(!showMenu)}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt={`${user.first_name || user.username}'s avatar`}
            className="avatar-image"
            onError={(e) => {
              // Fallback to initials if image fails to load
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="avatar-initials">
            {getInitials()}
          </div>
        )}

        {isUploading && (
          <div className="avatar-loading">
            <div className="loading-spinner"></div>
          </div>
        )}

        <div className="avatar-overlay">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
        </div>
      </div>

      {showMenu && (
        <>
          <div className="avatar-menu-backdrop" onClick={() => setShowMenu(false)} />
          <div className="avatar-menu">
            <button
              className="avatar-menu-item"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                <circle cx="12" cy="13" r="3"/>
              </svg>
              {user.avatar_url ? 'Change Photo' : 'Upload Photo'}
            </button>

            {user.avatar_url && (
              <button
                className="avatar-menu-item remove"
                onClick={handleRemoveAvatar}
                disabled={isUploading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3,6 5,6 21,6"/>
                  <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"/>
                  <line x1="10" y1="11" x2="10" y2="17"/>
                  <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                Remove Photo
              </button>
            )}

            <div className="avatar-menu-divider" />

            <div className="avatar-menu-info">
              <p>Recommended: Square image, at least 400x400px</p>
              <p>Max file size: 5MB</p>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default AvatarUpload;