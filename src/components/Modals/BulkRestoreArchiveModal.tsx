import React from 'react';
import './Modal.css';

interface BulkRestoreArchiveModalProps {
  itemCount: number;
  onClose: () => void;
  onConfirm: () => void;
}

const BulkRestoreArchiveModal: React.FC<BulkRestoreArchiveModalProps> = ({ itemCount, onClose, onConfirm }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Restore {itemCount} Item{itemCount !== 1 ? 's' : ''}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to restore {itemCount} item{itemCount !== 1 ? 's' : ''}?</p>
          <p>The selected item{itemCount !== 1 ? 's' : ''} will be moved back to the active records.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-success" onClick={onConfirm}>Restore {itemCount} Item{itemCount !== 1 ? 's' : ''}</button>
        </div>
      </div>
    </div>
  );
};

export default BulkRestoreArchiveModal;