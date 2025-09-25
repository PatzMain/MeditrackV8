import React from 'react';
import './Modal.css';

interface BulkDeleteArchiveModalProps {
  itemCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

const BulkDeleteArchiveModal: React.FC<BulkDeleteArchiveModalProps> = ({ itemCount, onClose, onConfirm }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Delete {itemCount} Item{itemCount !== 1 ? 's' : ''}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to permanently delete {itemCount} item{itemCount !== 1 ? 's' : ''}?</p>
          <p><strong>This action cannot be undone.</strong> The selected item{itemCount !== 1 ? 's' : ''} will be permanently removed from the system.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete {itemCount} Item{itemCount !== 1 ? 's' : ''}</button>
        </div>
      </div>
    </div>
  );
};

export default BulkDeleteArchiveModal;