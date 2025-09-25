import React, { useState, useEffect, useCallback } from 'react';
import {
  patientMonitoringService,
  activityService,
  authService,
  type ConsultationAttachment,
  type Consultation
} from '../../../services/supabaseService';
import '../PatientModals/PatientModals.css';

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
  const [attachments, setAttachments] = useState<ConsultationAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');

  const fetchAttachments = useCallback(async () => {
    if (!consultation) return;

    try {
      setLoading(true);
      const attachmentsData = await patientMonitoringService.getConsultationAttachments(consultation.id);
      setAttachments(attachmentsData);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      setError('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  }, [consultation]);

  useEffect(() => {
    if (consultation && isOpen) {
      fetchAttachments();
    }
  }, [consultation, isOpen, fetchAttachments]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        setError('File type not supported. Please upload images, PDFs, or documents only.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
  };

  const simulateFileUpload = async (file: File): Promise<string> => {
    // Simulate file upload process
    // In a real implementation, this would upload to a storage service
    return new Promise((resolve) => {
      setTimeout(() => {
        const fileName = `consultation_${consultation?.id}_${Date.now()}_${file.name}`;
        const filePath = `/uploads/consultations/${fileName}`;
        resolve(filePath);
      }, 1500);
    });
  };

  const handleUpload = async () => {
    if (!consultation || !selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      // Simulate file upload (replace with actual upload logic)
      const filePath = await simulateFileUpload(selectedFile);

      const attachmentData = {
        consultation_id: consultation.id,
        file_name: selectedFile.name,
        file_path: filePath,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        description: description.trim() || undefined,
        uploaded_by: authService.getCurrentUser()?.id
      };

      const newAttachment = await patientMonitoringService.createConsultationAttachment(attachmentData);

      setAttachments(prev => [newAttachment, ...prev]);
      setSelectedFile(null);
      setDescription('');

      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

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

      onAttachmentAdded?.(newAttachment);
    } catch (error: any) {
      console.error('Error uploading file:', error);
      setError(`Failed to upload file: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachment: ConsultationAttachment) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      await patientMonitoringService.deleteConsultationAttachment(attachment.id);
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));

      // Log activity
      await activityService.logActivity({
        action: 'delete_consultation_attachment',
        description: `Deleted file "${attachment.file_name}" from consultation ${consultation?.case_number}`,
        details: {
          consultation_id: consultation?.id,
          patient_id: consultation?.patient_id,
          file_name: attachment.file_name,
          attachment_id: attachment.id
        }
      });
    } catch (error: any) {
      console.error('Error deleting attachment:', error);
      setError(`Failed to delete attachment: ${error.message}`);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <path d="M21 15l-5-5L5 21"/>
        </svg>
      );
    }
    if (fileType === 'application/pdf') {
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      );
    }
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14,2 14,8 20,8"/>
      </svg>
    );
  };

  if (!isOpen || !consultation) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content large-modal">
        <div className="modal-header">
          <h2>Consultation Attachments</h2>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="consultation-info-bar">
            <div className="consultation-details">
              <span className="case-number">Case: {consultation.case_number}</span>
              <span className="patient-name">
                Patient: {consultation.patient?.first_name} {consultation.patient?.last_name}
              </span>
            </div>
            <span className="consultation-date">
              {new Date(consultation.consultation_date).toLocaleDateString()}
            </span>
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

          {/* Upload Section */}
          <div className="upload-section">
            <h3>Upload New File</h3>
            <div className="upload-form">
              <div className="form-group">
                <label htmlFor="file-upload">Select File</label>
                <input
                  type="file"
                  id="file-upload"
                  onChange={handleFileSelect}
                  accept=".jpg,.jpeg,.png,.gif,.pdf,.txt,.doc,.docx"
                  disabled={uploading}
                />
                <small className="form-hint">
                  Supported formats: Images (JPG, PNG, GIF), PDF, Text, Documents. Max size: 10MB
                </small>
              </div>

              {selectedFile && (
                <div className="form-group">
                  <label htmlFor="description">Description (Optional)</label>
                  <input
                    type="text"
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the file"
                    disabled={uploading}
                  />
                </div>
              )}

              {selectedFile && (
                <div className="selected-file">
                  <div className="file-info">
                    {getFileIcon(selectedFile.type)}
                    <div className="file-details">
                      <div className="file-name">{selectedFile.name}</div>
                      <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                    </div>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={handleUpload}
                    disabled={uploading}
                  >
                    {uploading ? 'Uploading...' : 'Upload File'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Attachments List */}
          <div className="attachments-section">
            <h3>Attached Files ({attachments.length})</h3>

            {loading ? (
              <div className="loading-message">Loading attachments...</div>
            ) : attachments.length === 0 ? (
              <div className="empty-state">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.2a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                </svg>
                <p>No files attached to this consultation</p>
              </div>
            ) : (
              <div className="attachments-grid">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="attachment-card">
                    <div className="attachment-header">
                      <div className="file-icon">
                        {getFileIcon(attachment.file_type)}
                      </div>
                      <div className="attachment-info">
                        <div className="file-name" title={attachment.file_name}>
                          {attachment.file_name}
                        </div>
                        <div className="file-meta">
                          {attachment.file_size && formatFileSize(attachment.file_size)} •
                          {formatDateTime(attachment.uploaded_at)}
                        </div>
                      </div>
                      <button
                        className="delete-btn"
                        onClick={() => handleDelete(attachment)}
                        title="Delete attachment"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3,6 5,6 21,6"/>
                          <path d="m19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                        </svg>
                      </button>
                    </div>

                    {attachment.description && (
                      <div className="attachment-description">
                        {attachment.description}
                      </div>
                    )}

                    <div className="attachment-actions">
                      <button className="btn-secondary btn-sm">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationAttachmentsModal;