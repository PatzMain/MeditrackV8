import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { inventoryService, patientMonitoringService, activityService } from '../../services/supabaseService';
import './ArchivesPage.css';
import './PagesStyles.css';
import ViewArchiveModal from '../Modals/ViewArchiveModal';
import RestoreArchiveModal from '../Modals/RestoreArchiveModal';
import DeleteArchiveModal from '../Modals/DeleteArchiveModal';
import BulkRestoreArchiveModal from '../Modals/BulkRestoreArchiveModal';
import BulkDeleteArchiveModal from '../Modals/BulkDeleteArchiveModal';

const ArchivesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [sortField, setSortField] = useState<string>('archivedDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null);
  const [isBulkRestoreModalOpen, setIsBulkRestoreModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const fetchArchives = async () => {
    try {
      setLoading(true);
      const [inventoryItems, archivedPatients] = await Promise.all([
        inventoryService.getArchivedItems(),
        patientMonitoringService.getArchivedPatients()
      ]);

      // Transform inventory items to unified archive format
      const inventoryArchiveData = inventoryItems.map(item => ({
        id: `inv_${item.id}`,
        type: 'Inventory Item',
        title: item.generic_name,
        description: item.notes || 'No description',
        archivedDate: new Date(item.updated_at || item.created_at).toISOString().split('T')[0],
        originalDate: new Date(item.created_at).toISOString().split('T')[0],
        size: 'N/A',
        category: 'Inventory',
        status: 'Archived',
        patientName: 'N/A',
        createdBy: 'System',
        originalData: item
      }));

      // Transform archived patients to unified archive format
      const patientArchiveData = archivedPatients.map(patient => ({
        id: `patient_${patient.id}`,
        type: 'Patient Record',
        title: `${patient.first_name} ${patient.last_name}`,
        description: `${patient.patient_type} - ID: ${patient.patient_id}`,
        archivedDate: new Date(patient.updated_at).toISOString().split('T')[0],
        originalDate: new Date(patient.created_at).toISOString().split('T')[0],
        size: 'N/A',
        category: 'Patient',
        status: 'Archived',
        patientName: `${patient.first_name} ${patient.last_name}`,
        createdBy: 'System',
        originalData: patient
      }));

      // Combine both types of archived data
      const allArchiveData = [...inventoryArchiveData, ...patientArchiveData];
      setArchives(allArchiveData);
      setError(null);
    } catch (error) {
      console.error('Error fetching archives:', error);
      setError('Failed to load archives');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArchives();
  }, []);

  // Handle URL highlighting from universal search
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const highlightId = searchParams.get('highlightId');
    const page = searchParams.get('page');
    const itemsPerPageParam = searchParams.get('itemsPerPage');

    if (highlightId) {
      setHighlightedItemId(highlightId);
    }

    // Set page and items per page from universal search
    if (page) {
      setCurrentPage(parseInt(page));
    }

    if (itemsPerPageParam) {
      const itemsPerPageValue = parseInt(itemsPerPageParam);
      if ([10, 25, 50, 100].includes(itemsPerPageValue)) {
        setItemsPerPage(itemsPerPageValue);
      }
    }

    // Clean up URL after processing
    if (highlightId || page || itemsPerPageParam) {
      const timer = setTimeout(() => {
        navigate('/archives', { replace: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.search, navigate]);

  // Scroll to and highlight item when highlightedItemId changes
  useEffect(() => {
    if (highlightedItemId && archives.length > 0 && !loading) {
      const timer = setTimeout(() => {
        const itemElement = document.getElementById(`archive-item-${highlightedItemId}`);
        if (itemElement) {
          // Scroll to the item
          itemElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });

          // Clear highlight after 3 seconds
          setTimeout(() => {
            setHighlightedItemId(null);
          }, 3000);
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, archives, loading]);

  const categories = ['all', 'Inventory', 'Patient', 'Equipment', 'Supplies', 'System'];


  const sortData = (data: any[]) => {
    return [...data].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle different data types
      if (sortField === 'archivedDate' || sortField === 'originalDate') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else if (typeof aVal === 'string') {
        aVal = (aVal || '').toLowerCase();
        bVal = (bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filteredArchives = sortData(
    archives.filter(archive => {
      const matchesSearch = (archive.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (archive.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || archive.category === filterType;

      return matchesSearch && matchesType;
    })
  );

  // Pagination
  const totalPages = Math.ceil(filteredArchives.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedArchives = filteredArchives.slice(startIndex, endIndex);

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(paginatedArchives.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (itemId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(itemId);
    } else {
      newSelected.delete(itemId);
    }
    setSelectedItems(newSelected);
  };

  const isAllSelected = paginatedArchives.length > 0 && paginatedArchives.every(item => selectedItems.has(item.id));
  const isSomeSelected = paginatedArchives.some(item => selectedItems.has(item.id));

  // Bulk restore functionality
  const handleBulkRestoreConfirm = async () => {
    if (selectedItems.size === 0) return;

    try {
      setLoading(true);
      const selectedItemsArray = Array.from(selectedItems);

      // Process each selected item
      for (const itemId of selectedItemsArray) {
        const [type, idStr] = itemId.split('_');
        const id = parseInt(idStr);

        if (!isNaN(id)) {
          // Find the item for logging
          const item = archives.find(archive => archive.id === itemId);

          if (type === 'inv') {
            // Update the inventory item status to make it active again
            await inventoryService.updateItem(id, {
              status: 'active',
              updated_at: new Date().toISOString()
            });

            if (item) {
              // Log the activity
              await activityService.logActivity({
                action: 'restore',
                description: `Restored inventory item: ${item.title}`,
                category: 'inventory'
              });
            }
          } else if (type === 'patient') {
            // Restore patient
            await patientMonitoringService.unarchivePatient(id);

            if (item) {
              // Log the activity
              await activityService.logActivity({
                action: 'restore',
                description: `Restored patient record: ${item.title}`,
                category: 'patient_management'
              });
            }
          }
        }
      }

      // Refresh the archives list and clear selection
      await fetchArchives();
      setSelectedItems(new Set());
      setIsBulkRestoreModalOpen(false);

      console.log(`Successfully restored ${selectedItemsArray.length} item(s)`);
    } catch (error) {
      console.error('Error restoring items:', error);
      console.error(`Failed to restore items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Bulk delete functionality
  const handleBulkDeleteConfirm = async () => {
    if (selectedItems.size === 0) return;

    try {
      setLoading(true);
      const selectedItemsArray = Array.from(selectedItems);

      // Process each selected item
      for (const itemId of selectedItemsArray) {
        const [type, idStr] = itemId.split('_');
        const id = parseInt(idStr);

        if (!isNaN(id)) {
          // Find the item for logging before deletion
          const item = archives.find(archive => archive.id === itemId);

          if (type === 'inv') {
            // Delete inventory item
            await inventoryService.deleteItem(id);

            if (item) {
              // Log the activity
              await activityService.logActivity({
                action: 'delete',
                description: `Permanently deleted inventory item: ${item.title}`,
                category: 'inventory'
              });
            }
          } else if (type === 'patient') {
            // Skip patient deletion for data integrity
            console.warn(`Skipping permanent deletion of patient record: ${item?.title} (data integrity)`);

            if (item) {
              await activityService.logActivity({
                action: 'delete_attempt',
                description: `Attempted bulk deletion of patient record: ${item.title} (action blocked for data integrity)`,
                category: 'patient_management'
              });
            }
          }
        }
      }

      // Refresh the archives list and clear selection
      await fetchArchives();
      setSelectedItems(new Set());
      setIsBulkDeleteModalOpen(false);

      console.log(`Successfully deleted ${selectedItemsArray.length} item(s)`);
    } catch (error) {
      console.error('Error deleting items:', error);
      console.error(`Failed to delete items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreItem = async () => {
    if (!selectedItem) return;
    try {
      setLoading(true);
      const [type, idStr] = selectedItem.id.split('_');
      const id = parseInt(idStr);

      if (isNaN(id)) {
        throw new Error('Invalid item ID');
      }

      if (type === 'inv') {
        // Restore inventory item
        await inventoryService.updateItem(id, {
          status: 'active',
          updated_at: new Date().toISOString()
        });

        // Log the activity
        await activityService.logActivity({
          action: 'restore',
          description: `Restored inventory item: ${selectedItem.title}`,
          category: 'inventory'
        });
      } else if (type === 'patient') {
        // Restore patient
        await patientMonitoringService.unarchivePatient(id);

        // Log the activity
        await activityService.logActivity({
          action: 'restore',
          description: `Restored patient record: ${selectedItem.title}`,
          category: 'patient_management'
        });
      }

      // Refresh the archives list
      await fetchArchives();
      setIsRestoreModalOpen(false);
      setSelectedItem(null);

      // Show success message (could be replaced with a toast notification)
      console.log('Item restored successfully!');
    } catch (error) {
      console.error('Error restoring item:', error);
      // Show error message (could be replaced with a toast notification)
      console.error(`Failed to restore item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      setLoading(true);
      const [type, idStr] = selectedItem.id.split('_');
      const id = parseInt(idStr);

      if (isNaN(id)) {
        throw new Error('Invalid item ID');
      }

      if (type === 'inv') {
        // Delete inventory item
        await inventoryService.deleteItem(id);

        // Log the activity
        await activityService.logActivity({
          action: 'delete',
          description: `Permanently deleted inventory item: ${selectedItem.title}`,
          category: 'inventory'
        });
      } else if (type === 'patient') {
        // For patients, we might want to consider if we should really permanently delete
        // or just keep them archived. For now, let's just log that this action was attempted
        // but not actually delete the patient record for data integrity
        console.warn('Permanent deletion of patient records is not recommended for data integrity');

        // Instead of deleting, we could add a "permanently_deleted" status or similar
        // For now, just log the attempt
        await activityService.logActivity({
          action: 'delete_attempt',
          description: `Attempted permanent deletion of patient record: ${selectedItem.title} (action blocked for data integrity)`,
          category: 'patient_management'
        });

        throw new Error('Permanent deletion of patient records is not allowed for data integrity purposes');
      }

      // Refresh the archives list
      await fetchArchives();
      setIsDeleteModalOpen(false);
      setSelectedItem(null);

      console.log('Item deleted successfully!');
    } catch (error) {
      console.error('Error deleting item:', error);
      setError(`Failed to delete item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Archives</h1>
        <p className="page-subtitle">Access and manage archived medical records and documents</p>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="filters-row">
          <div className="search-box-large">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="m21 21-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <input
              type="text"
              placeholder="Search archives by title, description, or patient name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>Category:</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category === 'all' ? 'All Categories' : category}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Items per page:</label>
            <select value={itemsPerPage} onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

        </div>

        {/* Bulk Actions */}
        {selectedItems.size > 0 && (
          <div className="bulk-actions">
            <span className="bulk-selection-count">{selectedItems.size} item(s) selected</span>
            <div className="bulk-action-buttons">
              <button
                className="btn-success btn-sm"
                onClick={() => setIsBulkRestoreModalOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Restore Selected
              </button>
              <button
                className="btn-danger btn-sm"
                onClick={() => setIsBulkDeleteModalOpen(true)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                </svg>
                Delete Selected
              </button>
              <button
                className="btn-secondary btn-sm"
                onClick={() => setSelectedItems(new Set())}
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="loading-message">Loading archives...</div>
      )}

      {error && (
        <div className="error-message">{error}</div>
      )}

      {/* Archive Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect width="20" height="5" x="2" y="3" rx="1" stroke="currentColor" strokeWidth="2"/>
              <path d="m4 8 16 0" stroke="currentColor" strokeWidth="2"/>
              <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{filteredArchives.length}</div>
            <div className="stat-title">Total Archived Items</div>
            <div className="stat-change neutral">Currently stored</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
              <rect x="7" y="7" width="3" height="9" stroke="currentColor" strokeWidth="2"/>
              <rect x="14" y="7" width="3" height="5" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{archives.filter(item => item.type === 'Inventory Item').length}</div>
            <div className="stat-title">Inventory Items</div>
            <div className="stat-change positive">Archived inventory</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
              <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{archives.filter(item => item.type === 'Patient Record').length}</div>
            <div className="stat-title">Patient Records</div>
            <div className="stat-change positive">Archived patients</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2"/>
              <path d="m7 14 4-4 4 4 5-5" stroke="currentColor" strokeWidth="2"/>
              <circle cx="11" cy="10" r="1" fill="currentColor"/>
              <circle cx="15" cy="14" r="1" fill="currentColor"/>
              <circle cx="20" cy="9" r="1" fill="currentColor"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{new Set(filteredArchives.map(item => item.category)).size}</div>
            <div className="stat-title">Categories</div>
            <div className="stat-change positive">Organized types</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {archives.filter(item =>
                new Date(item.archivedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length}
            </div>
            <div className="stat-title">Archived This Week</div>
            <div className="stat-change positive">Recent activity</div>
          </div>
        </div>
      </div>

      {/* Archives Data Display */}
      <div className="archives-data-container">
        {/* Table Header with Bulk Selection */}
        <div className="archives-header">
          <div className="bulk-select-header">
            <div className="checkbox-column">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(input) => {
                  if (input) input.indeterminate = !isAllSelected && isSomeSelected;
                }}
                onChange={(e) => handleSelectAll(e.target.checked)}
              />
            </div>
            <span className="header-text">Select All Items</span>
          </div>

          <div className="sort-controls">
            <label>Sort by:</label>
            <select
              value={sortField}
              onChange={(e) => {
                setSortField(e.target.value);
                setSortDirection('asc');
              }}
            >
              <option value="title">Title</option>
              <option value="archivedDate">Archived Date</option>
              <option value="originalDate">Original Date</option>
              <option value="category">Category</option>
              <option value="status">Status</option>
            </select>
            <button
              className="sort-direction-btn"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortDirection === 'asc' ? '▲' : '▼'}
            </button>
          </div>
        </div>

        {/* Archives Cards */}
        <div className="archives-grid">
          {paginatedArchives.map((archive) => (
            <div
              key={archive.id}
              id={`archive-item-${archive.id}`}
              className={`archive-card ${selectedItems.has(archive.id) ? 'selected' : ''} ${highlightedItemId === archive.id ? 'highlighted-item' : ''}`}
            >
              {/* Card Header */}
              <div className="card-header">
                <div className="card-select">
                  <input
                    type="checkbox"
                    checked={selectedItems.has(archive.id)}
                    onChange={(e) => handleSelectItem(archive.id, e.target.checked)}
                  />
                </div>
                <div className="card-type">
                  <div className="type-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect width="20" height="5" x="2" y="3" rx="1" stroke="currentColor" strokeWidth="2"/>
                      <path d="m4 8 16 0" stroke="currentColor" strokeWidth="2"/>
                      <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </div>
                  <span>{archive.type}</span>
                </div>
                <div className="card-actions">
                  <button
                    className="action-btn view"
                    title="View Archive"
                    onClick={() => { setSelectedItem(archive); setIsViewModalOpen(true); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" stroke="currentColor" strokeWidth="2"/>
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn restore"
                    title="Restore"
                    onClick={() => { setSelectedItem(archive); setIsRestoreModalOpen(true); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 7V12L15 15" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                  <button
                    className="action-btn delete"
                    title="Permanent Delete"
                    onClick={() => { setSelectedItem(archive); setIsDeleteModalOpen(true); }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polyline points="3,6 5,6 21,6" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Card Content */}
              <div className="card-content">
                <div className="card-title">{archive.title}</div>
                <div className="card-description">{archive.description}</div>

                <div className="card-meta">
                  <div className="meta-row">
                    <div className="meta-item">
                      <span className="meta-label">Category:</span>
                      <span className={`category-badge ${(archive.category || '').toLowerCase().replace(' ', '-')}`}>
                        {archive.category}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Status:</span>
                      <span className={`status-badge ${(archive.status || '').toLowerCase()}`}>
                        {archive.status}
                      </span>
                    </div>
                  </div>

                  <div className="meta-row">
                    <div className="meta-item">
                      <span className="meta-label">Created:</span>
                      <span className="meta-value">{archive.originalDate}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Archived:</span>
                      <span className="meta-value">{archive.archivedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {paginatedArchives.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
                <rect width="20" height="5" x="2" y="3" rx="1" stroke="currentColor" strokeWidth="2"/>
                <path d="m4 8 16 0" stroke="currentColor" strokeWidth="2"/>
                <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3>No archived items found</h3>
            <p>There are no items matching your current search and filter criteria.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="pagination">
        <button
          className="pagination-btn"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(currentPage - 1)}
        >
          Previous
        </button>

        <div className="pagination-pages">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
            <button
              key={page}
              className={`pagination-page ${page === currentPage ? 'active' : ''}`}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
        </div>

        <div className="pagination-info">
          Showing {startIndex + 1}-{Math.min(endIndex, filteredArchives.length)} of {filteredArchives.length} records
        </div>

        <button
          className="pagination-btn"
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(currentPage + 1)}
        >
          Next
        </button>
      </div>

      {isViewModalOpen && (
        <ViewArchiveModal
          item={selectedItem}
          onClose={() => setIsViewModalOpen(false)}
        />
      )}

      {isRestoreModalOpen && (
        <RestoreArchiveModal
          item={selectedItem}
          onClose={() => setIsRestoreModalOpen(false)}
          onConfirm={handleRestoreItem}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteArchiveModal
          item={selectedItem}
          onClose={() => setIsDeleteModalOpen(false)}
          onConfirm={handleDeleteItem}
        />
      )}

      {isBulkRestoreModalOpen && (
        <BulkRestoreArchiveModal
          itemCount={selectedItems.size}
          onClose={() => setIsBulkRestoreModalOpen(false)}
          onConfirm={handleBulkRestoreConfirm}
        />
      )}

      {isBulkDeleteModalOpen && (
        <BulkDeleteArchiveModal
          itemCount={selectedItems.size}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          onConfirm={handleBulkDeleteConfirm}
        />
      )}
    </div>
  );
};

export default ArchivesPage;