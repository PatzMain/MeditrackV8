import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  patientMonitoringService,
  activityService,
  type ConsultationAttachment,
  type Consultation
} from '../../../services/supabaseService';
import '../PatientModals/PatientModals.css';
import '../ConsultationModals.css';

interface ConsultationAttachmentsModalProps {
  isOpen: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onAttachmentAdded?: (attachment: ConsultationAttachment) => void;
}

const ConsultationAttachmentsModal: React.FC<ConsultationAttachmentsModalProps> = ({
  isOpen,
  consultation,
  onClose,
  onAttachmentAdded
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && consultation) {
      setError(null);
      setSelectedFile(null);
      setDescription('');
      setUploadProgress(0);
    }
  }, [isOpen, consultation]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const validateFile = (file: File): string | null => {
    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload images, PDFs, or documents only.';
    }

    return null;
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    setError(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!consultation || !selectedFile) return;

    try {
      setUploading(true);
      setUploadProgress(0);
      setError(null);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      // Upload file using Supabase storage
      const newAttachment = await patientMonitoringService.uploadConsultationAttachment(
        consultation.id,
        selectedFile,
        description.trim() || undefined
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Log activity
      await activityService.logActivity({
        action: 'upload_consultation_attachment',
        description: `Uploaded file "${selectedFile.name}" to consultation ${consultation.case_number}`,
        details: {
          consultation_id: consultation.id,
          patient_id: consultation.patient_id,
          file_name: selectedFile.name,
          file_type: selectedFile.type,
          file_size: selectedFile.size
        }
      });

      // Reset form
      setSelectedFile(null);
      setDescription('');
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Notify parent
      onAttachmentAdded?.(newAttachment);

      // Close modal after successful upload
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(`Failed to upload file: ${error.message}`);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      );
    }
    if (fileType === 'application/pdf') {
      return (
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      );
    }
    return (
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
      </svg>
    );
  };

  const getFileTypeLabel = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType === 'application/pdf') return 'PDF';
    if (fileType === 'text/plain') return 'Text';
    if (fileType.includes('word')) return 'Word';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return 'Excel';
    return 'Document';
  };

  if (!isOpen || !consultation) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-container large">
        <div className="modal-header">
          <div className="modal-title-section">
            <h2 className="modal-title">Upload Attachment</h2>
            <p className="modal-subtitle">
              Case: {consultation.case_number} | Patient: {consultation.patient?.first_name} {consultation.patient?.last_name}
            </p>
          </div>
          <button className="modal-close" onClick={onClose} disabled={uploading}>
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

          {/* Drag and Drop Upload Area */}
          <div
            className={`upload-dropzone ${dragActive ? 'active' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => handleFileSelect(e.target.files)}
              accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx"
              style={{ display: 'none' }}
              disabled={uploading}
            />

            {!selectedFile ? (
              <div className="upload-prompt">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                <h3>Drag and drop your file here</h3>
                <p>or click to browse</p>
                <span className="upload-hint">
                  Supported: Images, PDFs, Documents (Max 10MB)
                </span>
              </div>
            ) : (
              <div className="selected-file-preview">
                <div className="file-preview-icon">
                  {getFileIcon(selectedFile.type)}
                </div>
                <div className="file-preview-details">
                  <h4>{selectedFile.name}</h4>
                  <div className="file-preview-meta">
                    <span className="file-type-badge">{getFileTypeLabel(selectedFile.type)}</span>
                    <span className="file-size-text">{formatFileSize(selectedFile.size)}</span>
                  </div>
                </div>
                <button
                  className="remove-file-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                    setDescription('');
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  disabled={uploading}
                  type="button"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Description Field */}
          {selectedFile && (
            <div className="form-group">
              <label htmlFor="attachment-description">
                Description (Optional)
              </label>
              <textarea
                id="attachment-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description of this file..."
                rows={3}
                disabled={uploading}
                maxLength={500}
              />
              <small className="character-counter">{description.length}/500</small>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && uploadProgress > 0 && (
            <div className="upload-progress-container">
              <div className="upload-progress-header">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="upload-progress-bar">
                <div
                  className="upload-progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
          >
            {uploading ? (
              <>
                <svg className="spinner" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25"/>
                  <path d="M12 2 A 10 10 0 0 1 22 12" strokeLinecap="round"/>
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
                Upload File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationAttachmentsModal;