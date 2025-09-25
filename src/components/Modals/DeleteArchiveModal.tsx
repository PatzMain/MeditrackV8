import React from 'react';
import './Modal.css';

interface DeleteArchiveModalProps {
  item: any;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteArchiveModal: React.FC<DeleteArchiveModalProps> = ({ item, onClose, onConfirm }) => {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Delete {item.title}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to permanently delete this item?</p>
          <p><strong>{item.title}</strong> will be permanently deleted. This action cannot be undone.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
};

export default DeleteArchiveModal;
