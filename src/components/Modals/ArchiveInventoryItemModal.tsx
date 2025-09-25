import React from 'react';
import './Modal.css';

interface ArchiveInventoryItemModalProps {
  item: any;
  onClose: () => void;
  onConfirm: () => void;
}

const ArchiveInventoryItemModal: React.FC<ArchiveInventoryItemModalProps> = ({ item, onClose, onConfirm }) => {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Archive Item - {item.generic_name}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <p>Are you sure you want to archive this item?</p>
          <p><strong>{item.generic_name}</strong> will be moved to the archives and will no longer be visible in the main inventory.</p>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-danger" onClick={onConfirm}>Archive</button>
        </div>
      </div>
    </div>
  );
};

export default ArchiveInventoryItemModal;
