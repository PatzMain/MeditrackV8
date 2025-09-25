import React from 'react';
import './Modal.css';
import './InventoryModals.css';

interface ViewInventoryItemModalProps {
  item: any;
  onClose: () => void;
}

const ViewInventoryItemModal: React.FC<ViewInventoryItemModalProps> = ({ item, onClose }) => {
  if (!item) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">View Item Details</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="modal-body">
          <div className="info-grid">
            <div className="info-item">
              <label>Generic Name</label>
              <span>{item.generic_name}</span>
            </div>
            <div className="info-item">
              <label>Brand Name</label>
              <span>{item.brand_name}</span>
            </div>
            <div className="info-item">
              <label>Department</label>
              <span className="capitalize">{item.department}</span>
            </div>
            <div className="info-item">
              <label>Category</label>
              <span>{item.category}</span>
            </div>
            <div className="info-item">
              <label>Stock Quantity</label>
              <span>{item.stock_quantity} {item.unit_of_measurement}</span>
            </div>
            <div className="info-item">
              <label>Expiration Date</label>
              <span>{item.expiration_date}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-badge ${item.status}`}>{item.status?.replace(/_/g, ' ')}</span>
            </div>
            {item.notes && (
              <div className="info-item full-width">
                <label>Notes</label>
                <span>{item.notes}</span>
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

export default ViewInventoryItemModal;
