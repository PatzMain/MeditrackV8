import React, { useState, useEffect } from 'react';
import './ExportModal.css';
import { exportService, ExportOptions, ColumnConfig, DataTable } from '../../services/exportService';
import { inventoryService } from '../../services/supabaseService';

interface ExportInventoryModalProps {
  onClose: () => void;
  data?: any[];
  department?: string;
  classification?: string;
  stats?: {
    totalItems: number;
    lowStockItems: number;
    outOfStockItems: number;
    expiredItems: number;
    maintenanceItems?: number;
  };
  enableMultiTable?: boolean;
}

const ExportInventoryModal: React.FC<ExportInventoryModalProps> = ({
  onClose,
  data,
  department,
  classification,
  stats,
  enableMultiTable = false
}) => {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'csv' | 'docx'>('excel');
  const [includeStats, setIncludeStats] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'code',
    'generic_name',
    'brand_name',
    'category',
    'stock_quantity',
    'stock_threshold',
    'expiration_date',
    'status'
  ]);
  const [isExporting, setIsExporting] = useState(false);
  const [availableTables, setAvailableTables] = useState<DataTable[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    if (enableMultiTable) {
      fetchAvailableTables();
    } else if (data && department && classification) {
      // Single table mode - add current table to selected tables
      setSelectedTables([`${department}-${classification.toLowerCase()}`]);
    }
  }, [enableMultiTable, data, department, classification]);

  const fetchAvailableTables = async () => {
    setLoadingTables(true);
    try {
      const tables = await inventoryService.getAllInventoryTables();
      setAvailableTables(tables);
      // Auto-select all tables by default
      setSelectedTables(tables.map(table => table.id));
    } catch (error) {
      console.error('Failed to fetch available tables:', error);
      alert('Failed to load available data tables.');
    } finally {
      setLoadingTables(false);
    }
  };

  const handleTableToggle = (tableId: string) => {
    setSelectedTables(prev =>
      prev.includes(tableId)
        ? prev.filter(id => id !== tableId)
        : [...prev, tableId]
    );
  };

  const availableColumns: ColumnConfig[] = [
    { key: 'code', header: 'Code', width: 15 },
    { key: 'generic_name', header: 'Generic Name', width: 25 },
    { key: 'brand_name', header: 'Brand Name', width: 25 },
    { key: 'category', header: 'Category', width: 20 },
    { key: 'stock_quantity', header: 'Stock Quantity', width: 15, formatter: (value) => value?.toString() || '0' },
    { key: 'stock_threshold', header: 'Stock Threshold', width: 15, formatter: (value) => value?.toString() || '0' },
    { key: 'unit_of_measurement', header: 'Unit', width: 12 },
    { key: 'expiration_date', header: 'Expiration Date', width: 20 },
    { key: 'status', header: 'Status', width: 15 },
    { key: 'notes', header: 'Notes', width: 30 },
    { key: 'created_at', header: 'Created Date', width: 20, formatter: (value) => value ? new Date(value).toLocaleDateString() : '' },
    { key: 'updated_at', header: 'Updated Date', width: 20, formatter: (value) => value ? new Date(value).toLocaleDateString() : '' }
  ];

  const handleColumnToggle = (columnKey: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(key => key !== columnKey)
        : [...prev, columnKey]
    );
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Please select at least one column to export.');
      return;
    }

    if (enableMultiTable && selectedTables.length === 0) {
      alert('Please select at least one data table to export.');
      return;
    }

    setIsExporting(true);

    try {
      const selectedColumnConfigs = availableColumns.filter(col =>
        selectedColumns.includes(col.key)
      );

      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');

      if (enableMultiTable) {
        // Multi-table export
        const selectedTableData = availableTables.filter(table =>
          selectedTables.includes(table.id)
        );

        const filename = `multi_table_inventory_export_${timestamp}`;

        const exportOptions: ExportOptions = {
          format: exportFormat,
          filename,
          title: 'Multi-Table Inventory Report',
          columns: selectedColumnConfigs,
          includeStats,
          tables: selectedTableData
        };

        await exportService.exportData(exportOptions);

        // Show success message
        alert(`Export completed successfully! File saved as ${filename}.${exportFormat}`);
      } else {
        // Single table export (backward compatibility)
        const filename = `${department}_${classification}_inventory_${timestamp}`;

        const exportOptions: ExportOptions = {
          format: exportFormat,
          data,
          filename,
          title: `${classification ? classification.charAt(0).toUpperCase() + classification.slice(1) : 'Inventory'} Report`,
          department,
          classification,
          columns: selectedColumnConfigs,
          includeStats,
          stats
        };

        await exportService.exportData(exportOptions);

        // Show success message
        alert(`Export completed successfully! File saved as ${filename}.${exportFormat}`);
      }

      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getFormatDescription = () => {
    switch (exportFormat) {
      case 'excel':
        return 'Professional spreadsheet with advanced formatting, charts, and comprehensive data analysis capabilities';
      case 'docx':
        return 'Executive-level Word document with professional formatting, headers, footers, and corporate branding';
      case 'pdf':
        return 'Print-ready document with professional layout, perfect for reports and official documentation';
      case 'csv':
        return 'Simple comma-separated format compatible with all spreadsheet applications and databases';
      default:
        return '';
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content export-modal">
        <div className="modal-header">
          <h2 className="modal-title">
            {enableMultiTable ? 'Export Inventory Data' : `Export ${classification ? classification.charAt(0).toUpperCase() + classification.slice(1) : 'Inventory'}`}
          </h2>
          <button className="modal-close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* Export Summary */}
          {!enableMultiTable && (
            <div className="export-summary">
              <div className="summary-item">
                <span className="summary-label">Department:</span>
                <span className="summary-value">{department ? department.charAt(0).toUpperCase() + department.slice(1) : 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Classification:</span>
                <span className="summary-value">{classification ? classification.charAt(0).toUpperCase() + classification.slice(1) : 'N/A'}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Total Items:</span>
                <span className="summary-value">{data?.length || 0}</span>
              </div>
            </div>
          )}

          {/* Table Selection for Multi-Table Mode */}
          {enableMultiTable && (
            <div className="form-group">
              <label className="form-label">Select Data Tables to Export</label>
              {loadingTables ? (
                <div className="loading-message">Loading available tables...</div>
              ) : (
                <div className="table-selection">
                  <div className="table-grid">
                    {availableTables.map((table) => (
                      <label key={table.id} className="table-option">
                        <input
                          type="checkbox"
                          checked={selectedTables.includes(table.id)}
                          onChange={() => handleTableToggle(table.id)}
                        />
                        <div className="table-info">
                          <div className="table-name">
                            {table.department.charAt(0).toUpperCase() + table.department.slice(1)} - {table.classification}
                          </div>
                          <div className="table-stats">
                            {table.stats.totalItems} items
                            {table.stats.lowStockItems > 0 && (
                              <span className="stat-warning"> • {table.stats.lowStockItems} low stock</span>
                            )}
                            {table.stats.outOfStockItems > 0 && (
                              <span className="stat-danger"> • {table.stats.outOfStockItems} out of stock</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="table-actions">
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setSelectedTables(availableTables.map(table => table.id))}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="btn-link"
                      onClick={() => setSelectedTables([])}
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Export Format Selection */}
          <div className="form-group">
            <label className="form-label">Export Format</label>
            <div className="export-format-options">
              <div className="format-option">
                <input
                  type="radio"
                  id="excel"
                  name="format"
                  value="excel"
                  checked={exportFormat === 'excel'}
                  onChange={(e) => setExportFormat(e.target.value as 'excel')}
                />
                <label htmlFor="excel" className="format-label">
                  <div className="format-icon">📊</div>
                  <div className="format-info">
                    <div className="format-name">Excel (.xlsx)</div>
                    <div className="format-desc">Professional spreadsheet with advanced formatting and charts</div>
                  </div>
                </label>
              </div>

              <div className="format-option">
                <input
                  type="radio"
                  id="docx"
                  name="format"
                  value="docx"
                  checked={exportFormat === 'docx'}
                  onChange={(e) => setExportFormat(e.target.value as 'docx')}
                />
                <label htmlFor="docx" className="format-label">
                  <div className="format-icon">📝</div>
                  <div className="format-info">
                    <div className="format-name">Word Document (.docx)</div>
                    <div className="format-desc">Executive report with professional formatting and branding</div>
                  </div>
                </label>
              </div>

              <div className="format-option">
                <input
                  type="radio"
                  id="pdf"
                  name="format"
                  value="pdf"
                  checked={exportFormat === 'pdf'}
                  onChange={(e) => setExportFormat(e.target.value as 'pdf')}
                />
                <label htmlFor="pdf" className="format-label">
                  <div className="format-icon">📄</div>
                  <div className="format-info">
                    <div className="format-name">PDF Document</div>
                    <div className="format-desc">Print-ready document with professional layout</div>
                  </div>
                </label>
              </div>

              <div className="format-option">
                <input
                  type="radio"
                  id="csv"
                  name="format"
                  value="csv"
                  checked={exportFormat === 'csv'}
                  onChange={(e) => setExportFormat(e.target.value as 'csv')}
                />
                <label htmlFor="csv" className="format-label">
                  <div className="format-icon">📋</div>
                  <div className="format-info">
                    <div className="format-name">CSV File</div>
                    <div className="format-desc">Simple comma-separated format for data import/export</div>
                  </div>
                </label>
              </div>
            </div>
            <div className="format-description">
              {getFormatDescription()}
            </div>
          </div>

          {/* Include Statistics Option */}
          <div className="form-group">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={includeStats}
                onChange={(e) => setIncludeStats(e.target.checked)}
              />
              <span className="checkmark"></span>
              Include inventory statistics in export
            </label>
          </div>

          {/* Column Selection */}
          <div className="form-group">
            <label className="form-label">Select Columns to Export</label>
            <div className="column-selection">
              <div className="column-selection-header">
                <h4 className="column-selection-title">Choose Data Fields</h4>
                <span className="column-counter">{selectedColumns.length} of {availableColumns.length} selected</span>
              </div>
              <div className="column-selection-body">
                <div className="column-grid">
                  {availableColumns.map((column) => (
                    <label
                      key={column.key}
                      className={`column-option ${selectedColumns.includes(column.key) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(column.key)}
                        onChange={() => handleColumnToggle(column.key)}
                      />
                      <span className="column-name">{column.header}</span>
                    </label>
                  ))}
                </div>
                <div className="column-actions">
                  <button
                    type="button"
                    className="column-action-btn select-all"
                    onClick={() => setSelectedColumns(availableColumns.map(col => col.key))}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Select All
                  </button>
                  <button
                    type="button"
                    className="column-action-btn clear-all"
                    onClick={() => setSelectedColumns([])}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleExport}
            disabled={isExporting || selectedColumns.length === 0 || (enableMultiTable && selectedTables.length === 0)}
          >
            {isExporting ? (
              <>
                <span className="loading-spinner"></span>
                Exporting...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportInventoryModal;