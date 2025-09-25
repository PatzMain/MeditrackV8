import React from 'react';
import './Modal.css';

interface ViewArchiveModalProps {
  item: any;
  onClose: () => void;
}

const ViewArchiveModal: React.FC<ViewArchiveModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">{item.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p><strong>Type:</strong> {item.type}</p>
          <p><strong>Description:</strong> {item.description}</p>
          <p><strong>Patient:</strong> {item.patientName}</p>
          <p><strong>Category:</strong> {item.category}</p>
          <p><strong>Original Date:</strong> {item.originalDate}</p>
          <p><strong>Archived Date:</strong> {item.archivedDate}</p>
          <p><strong>Created By:</strong> {item.createdBy}</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewArchiveModal;
