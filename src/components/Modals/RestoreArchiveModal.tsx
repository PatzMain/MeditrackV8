import React from 'react';
import './Modal.css';

interface RestoreArchiveModalProps {
  item: any;
  onClose: () => void;
  onConfirm: () => void;
}

const RestoreArchiveModal: React.FC<RestoreArchiveModalProps> = ({ item, onClose, onConfirm }) => {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Restore {item.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to restore this item?</p>
          <p><strong>{item.title}</strong> will be moved back to the active records.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-success" onClick={onConfirm}>Restore</button>
        </div>
      </div>
    </div>
  );
};

export default RestoreArchiveModal;
