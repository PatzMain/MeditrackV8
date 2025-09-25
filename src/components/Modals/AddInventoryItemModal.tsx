import React, { useState } from 'react';
import './Modal.css';
import './InventoryModals.css';

interface AddInventoryItemModalProps {
  onClose: () => void;
  onSave: (newItem: any) => void;
  department: string;
  classifications: any[];
  activeClassificationTab?: string;
}

const AddInventoryItemModal: React.FC<AddInventoryItemModalProps> = ({ onClose, onSave, department, classifications, activeClassificationTab }) => {

  // Filter classifications based on active tab
  const filteredClassifications = classifications.filter(c =>
    c.name.toLowerCase() === (activeClassificationTab || 'medicines')
  );

  const [formData, setFormData] = useState<any>({
    department,
    classification_id: filteredClassifications.length > 0 ? filteredClassifications[0].id : '',
    status: 'active'
  });

  // Determine status options based on classification type
  const getStatusOptions = () => {
    const classificationType = activeClassificationTab || 'medicines';

    if (classificationType === 'equipment') {
      // Equipment: only Active and Maintenance (manual status)
      return [
        { value: 'active', label: 'Active' },
        { value: 'maintenance', label: 'Maintenance' }
      ];
    } else {
      // Medicines and Supplies: status will be calculated automatically by backend
      // No status selection needed as it's determined by stock quantity, threshold, and expiration
      return [];
    }
  };


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Add New {(activeClassificationTab || 'item').charAt(0).toUpperCase() + (activeClassificationTab || 'item').slice(1)} - {department.charAt(0).toUpperCase() + department.slice(1)} Department</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="code">Code</label>
              <input type="text" id="code" name="code" onChange={handleChange} />
            </div>
            <div className="form-group">
              <label htmlFor="generic_name">Generic Name</label>
              <input type="text" id="generic_name" name="generic_name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="brand_name">Brand Name</label>
              <input type="text" id="brand_name" name="brand_name" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input type="text" id="category" name="category" onChange={handleChange} />
            </div>
            {/* Hidden classification field - automatically set based on active tab */}
            <input type="hidden" name="classification_id" value={formData.classification_id} />
            <div className="form-group">
              <label htmlFor="stock_quantity">Stock Quantity</label>
              <input type="number" id="stock_quantity" name="stock_quantity" onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label htmlFor="stock_threshold">Stock Threshold</label>
              <input type="number" id="stock_threshold" name="stock_threshold" defaultValue="0" onChange={handleChange} />
              <small>Low stock alert will trigger when stock falls below this number</small>
            </div>
            <div className="form-group">
              <label htmlFor="unit_of_measurement">Unit of Measurement</label>
              <input type="text" id="unit_of_measurement" name="unit_of_measurement" onChange={handleChange} />
            </div>
            {/* Only show expiration date for medicines and supplies, not equipment */}
            {(activeClassificationTab || 'medicines') !== 'equipment' && (
              <div className="form-group">
                <label htmlFor="expiration_date">Expiration Date</label>
                <input type="date" id="expiration_date" name="expiration_date" onChange={handleChange} />
              </div>
            )}
            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea id="notes" name="notes" onChange={handleChange} placeholder="Additional notes or descriptions"></textarea>
            </div>
            {/* Only show status field for equipment */}
            {(activeClassificationTab || 'medicines') === 'equipment' && (
              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select id="status" name="status" value={formData.status || 'active'} onChange={handleChange}>
                  {getStatusOptions().map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {/* For medicines and supplies, add informational text */}
            {(activeClassificationTab || 'medicines') !== 'equipment' && (
              <div className="form-group">
                <label>Status</label>
                <p style={{ margin: 0, padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '4px', fontSize: '14px' }}>
                  Status will be automatically determined based on stock quantity, expiration date, and stock threshold.
                </p>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary">Add Item</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddInventoryItemModal;
