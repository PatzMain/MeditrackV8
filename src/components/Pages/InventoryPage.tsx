import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { inventoryService, activityService } from '../../services/supabaseService';
import './InventoryPage.css';
import './PagesStyles.css';
import ViewInventoryItemModal from '../Modals/ViewInventoryItemModal';
import EditInventoryItemModal from '../Modals/EditInventoryItemModal';
import ArchiveInventoryItemModal from '../Modals/ArchiveInventoryItemModal';
import AddInventoryItemModal from '../Modals/AddInventoryItemModal';
import ExportInventoryModal from '../Modals/ExportInventoryModal';

type SortDirection = 'asc' | 'desc';

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('medicines');
  const [activeDepartment, setActiveDepartment] = useState('medical');
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean | 'multi'>(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [classifications, setClassifications] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  // const tableRef = useRef<HTMLDivElement>(null); // Reserved for future scrolling functionality

  const getClassificationFromTab = (tab: string) => {
    switch (tab) {
      case 'medicines': return 'Medicines';
      case 'supplies': return 'Supplies';
      case 'equipment': return 'Equipment';
      default: return 'Medicines';
    }
  };

  const getTabFromClassification = (classification: string) => {
    switch (classification?.toLowerCase()) {
      case 'medicines': return 'medicines';
      case 'supplies': return 'supplies';
      case 'equipment': return 'equipment';
      default: return 'medicines';
    }
  };

  const fetchInventoryData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const classification = getClassificationFromTab(activeTab);
      const data = await inventoryService.getItemsByDepartmentAndClassification(activeDepartment, classification);
      setInventoryData(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching inventory data:', error);
      setError(`Failed to load inventory data: ${error.message}`);
      setInventoryData([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, activeDepartment]);

  const fetchClassifications = useCallback(async () => {
    try {
      const data = await inventoryService.getClassifications();
      setClassifications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching classifications:', error);
    }
  }, []);


  // Handle URL parameters for universal search navigation
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const itemId = searchParams.get('itemId');
    const department = searchParams.get('department');
    const classification = searchParams.get('classification');
    const page = searchParams.get('page');
    const itemsPerPageParam = searchParams.get('itemsPerPage');

    // Only process if we have URL parameters (coming from universal search)
    if (itemId || department || classification || page || itemsPerPageParam) {

      const processNavigation = async () => {
        try {
          setLoading(true);
          setError(null);

          // Set pagination first
          if (page) setCurrentPage(parseInt(page));
          if (itemsPerPageParam) {
            const itemsPerPageValue = parseInt(itemsPerPageParam);
            if ([10, 25, 50, 100].includes(itemsPerPageValue)) {
              setItemsPerPage(itemsPerPageValue);
            }
          }

          // Determine target department and classification
          const targetDepartment = department || activeDepartment;
          const targetTab = classification ? getTabFromClassification(classification) : activeTab;

          // Update state if needed
          if (department && department !== activeDepartment) {
            setActiveDepartment(department);
          }
          if (targetTab !== activeTab) {
            setActiveTab(targetTab);
          }

          // Always fetch fresh data for navigation to ensure we have the right items
          const data = await inventoryService.getItemsByDepartmentAndClassification(
            targetDepartment,
            getClassificationFromTab(targetTab)
          );
          setInventoryData(Array.isArray(data) ? data : []);

          // Set the item to highlight after data is loaded
          if (itemId) {
            setHighlightedItemId(parseInt(itemId));

            // Wait for rendering then scroll to and highlight the item
            setTimeout(() => {
              const itemElement = document.getElementById(`inventory-item-${itemId}`);
              if (itemElement) {
                itemElement.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center',
                  inline: 'nearest'
                });
              }
            }, 100);
          }

          // Clean up URL after a delay to ensure highlighting completes
          setTimeout(() => {
            if (window.location.search) {
              navigate('/inventory', { replace: true });
            }
          }, 1500);

        } catch (error: any) {
          console.error('Error in universal search navigation:', error);
          setError(`Failed to load inventory data: ${error.message}`);
          setInventoryData([]);
          // Still clean up URL even on error
          setTimeout(() => {
            if (window.location.search) {
              navigate('/inventory', { replace: true });
            }
          }, 1000);
        } finally {
          setLoading(false);
        }
      };

      processNavigation();
    }
  }, [location.search, activeDepartment, activeTab, navigate]);

  // Only fetch data after initial mount and when department/classification changes
  useEffect(() => {
    fetchInventoryData();
    fetchClassifications();
  }, [fetchInventoryData, fetchClassifications]);

  // Additional effect to refetch data when URL params change department/classification
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const department = searchParams.get('department');
    const classification = searchParams.get('classification');

    // If URL has department/classification different from current state, data will be fetched
    // by the effect above when activeTab/activeDepartment change
    if (department || classification) {
      // Force a refetch after URL params are processed
      const timer = setTimeout(() => {
        fetchInventoryData();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.search, fetchInventoryData]);

  // Scroll to and highlight item after data loads (for regular highlighting, not universal search)
  useEffect(() => {
    if (highlightedItemId && inventoryData.length > 0 && !loading && !location.search) {
      const timer = setTimeout(() => {
        const itemElement = document.getElementById(`inventory-item-${highlightedItemId}`);
        if (itemElement) {
          // Scroll to the item
          itemElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Clear highlight after 5 seconds
          setTimeout(() => {
            setHighlightedItemId(null);
          }, 5000);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [highlightedItemId, inventoryData, loading, location.search]);

  const getSingularClassification = (tab: string) => {
    switch (tab) {
      case 'medicines': return 'Medicine';
      case 'supplies': return 'Supply';
      case 'equipment': return 'Equipment';
      default: return 'Medicine';
    }
  };


  const sortedAndFilteredItems = useMemo(() => {
    let items = inventoryData.filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const nameMatch = ((item.generic_name || '').toLowerCase().includes(searchLower) || (item.brand_name || '').toLowerCase().includes(searchLower));
      const statusMatch = statusFilter === 'all' || item.status === statusFilter;
      return nameMatch && statusMatch;
    });

    if (sortColumn) {
      items.sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return items;
  }, [inventoryData, searchQuery, statusFilter, sortColumn, sortDirection]);

  const inventoryStats = useMemo(() => {
    const lowStockItems = inventoryData.filter(item => item.status === 'low_stock');
    const outOfStockItems = inventoryData.filter(item => item.status === 'out_of_stock');
    const expiredItems = inventoryData.filter(item => item.status === 'expired');
    const maintenanceItems = inventoryData.filter(item => item.status === 'maintenance');

    return {
      totalItems: inventoryData.length,
      lowStockItems: lowStockItems.length,
      outOfStockItems: outOfStockItems.length,
      expiredItems: expiredItems.length,
      maintenanceItems: maintenanceItems.length
    };
  }, [inventoryData]);

  // Pagination
  const totalPages = Math.ceil(sortedAndFilteredItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = sortedAndFilteredItems.slice(startIndex, endIndex);

  const handleSaveItem = async (updatedItem: any) => {
    try {
      console.log('InventoryPage received updatedItem:', updatedItem);
      const { classification, ...itemToSave } = updatedItem;
      console.log('After removing classification, itemToSave:', itemToSave);
      await inventoryService.updateItem(itemToSave.id, itemToSave);
      activityService.logActivity({ action: 'edit', description: `Edited inventory item: ${itemToSave.generic_name}` });
      fetchInventoryData();
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating item:', error);
      alert('Error saving item: ' + error.message);
    }
  };

  const handleArchiveItem = async () => {
    console.log('Archiving item:', selectedItem);
    if (!selectedItem) return;
    try {
      await inventoryService.archiveItem(selectedItem.id);
      activityService.logActivity({ action: 'archive', description: `Archived inventory item: ${selectedItem.generic_name}` });
      console.log('Item archived successfully');
      fetchInventoryData();
      setIsArchiveModalOpen(false);
    } catch (error) {
      console.error('Error archiving item:', error);
    }
  };

  const handleAddItem = async (newItem: any) => {
    try {
      const { classification, ...itemToSave } = newItem;
      await inventoryService.createItem(itemToSave);
      activityService.logActivity({ action: 'add', description: `Added new inventory item: ${itemToSave.generic_name}` });
      fetchInventoryData();
      setIsAddModalOpen(false);
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'expired': return 'status-badge expired';
      case 'out_of_stock': return 'status-badge out-of-stock';
      case 'low_stock': return 'status-badge low-stock';
      case 'maintenance': return 'status-badge maintenance';
      default: return 'status-badge available';
    }
  };

  const renderStatCards = () => {
    const isEquipmentTab = activeTab === 'equipment';

    const statCards = [
      {
        title: `Total ${getClassificationFromTab(activeTab)}`,
        value: inventoryStats.totalItems.toString(),
        change: `${activeDepartment} department`,
        changeType: 'neutral',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="2"/>
            <rect x="7" y="7" width="3" height="9" stroke="currentColor" strokeWidth="2"/>
            <rect x="14" y="7" width="3" height="5" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      },
      {
        title: 'Low Stock',
        value: inventoryStats.lowStockItems.toString(),
        change: inventoryStats.lowStockItems > 0 ? 'Needs reorder' : 'All sufficient',
        changeType: inventoryStats.lowStockItems > 0 ? 'warning' : 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      },
      {
        title: 'Out of Stock',
        value: inventoryStats.outOfStockItems.toString(),
        change: inventoryStats.outOfStockItems > 0 ? 'Critical' : 'None',
        changeType: inventoryStats.outOfStockItems > 0 ? 'danger' : 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      },
      {
        title: isEquipmentTab ? 'Maintenance Items' : 'Expired Items',
        value: isEquipmentTab ? inventoryStats.maintenanceItems.toString() : inventoryStats.expiredItems.toString(),
        change: isEquipmentTab
          ? (inventoryStats.maintenanceItems > 0 ? 'Service required' : 'All operational')
          : (inventoryStats.expiredItems > 0 ? 'Dispose required' : 'All current'),
        changeType: isEquipmentTab
          ? (inventoryStats.maintenanceItems > 0 ? 'warning' : 'positive')
          : (inventoryStats.expiredItems > 0 ? 'danger' : 'positive'),
        icon: isEquipmentTab ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="6" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="16" r="1" fill="currentColor"/>
          </svg>
        )
      }
    ];

    return (
      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">
              {stat.icon}
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-title">{stat.title}</div>
              <div className={`stat-change ${stat.changeType}`}>
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderPagination = () => (
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
        Showing {startIndex + 1}-{Math.min(endIndex, sortedAndFilteredItems.length)} of {sortedAndFilteredItems.length} items
      </div>

      <button
        className="pagination-btn"
        disabled={currentPage === totalPages}
        onClick={() => setCurrentPage(currentPage + 1)}
      >
        Next
      </button>
    </div>
  );

  const renderDataTable = () => (
    <div className="inventory-data-container">
      <div className="inventory-header">
        <div className="header-info">
          <span className="items-count">
            {sortedAndFilteredItems.length} {sortedAndFilteredItems.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select
            value={sortColumn || 'generic_name'}
            onChange={(e) => {
              const newColumn = e.target.value;
              setSortColumn(newColumn);
              setSortDirection('asc');
            }}
          >
            <option value="generic_name">Name</option>
            <option value="code">Code</option>
            <option value="brand_name">Brand</option>
            <option value="category">Category</option>
            <option value="stock_quantity">Stock</option>
            <option value="expiration_date">Expiry Date</option>
            <option value="status">Status</option>
          </select>
          <button
            className="sort-direction-btn"
            onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
            title={`Sort ${sortDirection === 'asc' ? 'Descending' : 'Ascending'}`}
          >
            {sortDirection === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      <div className="inventory-grid">
        {paginatedItems.map((item) => (
          <div
            key={item.id}
            id={`inventory-item-${item.id}`}
            className={`inventory-card ${highlightedItemId === item.id ? 'highlighted-item' : ''}`}
            onClick={() => { setSelectedItem(item); setIsViewModalOpen(true); }}
          >
            <div className="card-header">
              <div className="card-type">
                <div className="type-icon">
                  {getClassificationFromTab(activeTab) === 'Medicines' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4.5 16.5c-1.5 1.5-1.5 3.5 0 5s3.5 1.5 5 0l4-4a3 3 0 0 0-3-3l-6 2Z"/>
                      <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/>
                    </svg>
                  ) : getClassificationFromTab(activeTab) === 'Equipment' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 7h-9"/>
                      <path d="M14 17H5"/>
                      <circle cx="17" cy="17" r="3"/>
                      <circle cx="7" cy="7" r="3"/>
                    </svg>
                  )}
                </div>
                <span>{getClassificationFromTab(activeTab)}</span>
              </div>
              <div className="card-actions">
                <button className="action-btn view" title="View" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsViewModalOpen(true); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button className="action-btn edit" title="Edit" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsEditModalOpen(true); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="m18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z" />
                  </svg>
                </button>
                <button className="action-btn delete" title="Archive" onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsArchiveModalOpen(true); }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="20" height="5" x="2" y="3" rx="1" />
                    <path d="m4 8 16 0" />
                    <path d="m6 8 0 13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l0-13" />
                    <path d="m8 8 0-2a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2l0 2" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="card-content">
              <div className="card-title">{item.generic_name || 'No name'}</div>
              <div className="card-subtitle">{item.brand_name || 'No brand'}</div>
              <div className="card-code">Code: {item.code || '--'}</div>

              <div className="card-meta">
                <div className="meta-row">
                  <div className="meta-item">
                    <span className="meta-label">Category</span>
                    <span className="meta-value">{item.category || 'Uncategorized'}</span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Status</span>
                    <span className={`meta-value ${getStatusBadgeClass(item.status)}`}>
                      {item.status ? item.status.replace(/_/g, ' ') : 'Unknown'}
                    </span>
                  </div>
                </div>

                <div className="meta-row">
                  <div className="meta-item">
                    <span className="meta-label">Stock</span>
                    <span className="meta-value stock-info">
                      {item.stock_quantity || 0} {item.unit_of_measurement || 'units'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Expiry</span>
                    <span className="meta-value">{item.expiration_date || 'No expiry'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {renderPagination()}
    </div>
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">Manage medical and dental inventory across different classifications.</p>
      </div>

      <div className="inventory-content">
        <div className="tabs-container">
          <div className="department-tabs">
            <button
              className={`department-tab ${activeDepartment === 'medical' ? 'active' : ''}`}
              onClick={() => setActiveDepartment('medical')}
            >
              Medical Department
            </button>
            <button
              className={`department-tab ${activeDepartment === 'dental' ? 'active' : ''}`}
              onClick={() => setActiveDepartment('dental')}
            >
              Dental Department
            </button>
          </div>

          <div className="classification-tabs">
            <button
              className={`classification-tab ${activeTab === 'medicines' ? 'active' : ''}`}
              onClick={() => setActiveTab('medicines')}
            >
              Medicines
            </button>
            <button
              className={`classification-tab ${activeTab === 'supplies' ? 'active' : ''}`}
              onClick={() => setActiveTab('supplies')}
            >
              Supplies
            </button>
            <button
              className={`classification-tab ${activeTab === 'equipment' ? 'active' : ''}`}
              onClick={() => setActiveTab('equipment')}
            >
              Equipment
            </button>
          </div>
        </div>

        <div className="inventory-main">
          {renderStatCards()}

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
                  placeholder="Search by name, code, or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label>Status:</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="low_stock">Low Stock</option>
                  <option value="out_of_stock">Out of Stock</option>
                  {activeTab === 'equipment' ? (
                    <option value="maintenance">Maintenance</option>
                  ) : (
                    <option value="expired">Expired</option>
                  )}
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

              <div className="action-buttons">
                <button className="btn-secondary" onClick={() => setIsExportModalOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Current
                </button>
                <button className="btn-secondary" onClick={() => setIsExportModalOpen('multi')}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                    <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                    <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                    <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Export Multi-Table
                </button>
                <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                  Add {getSingularClassification(activeTab)}
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-message">Loading inventory data...</div>
          ) : error ? (
            <div className="error-container">
              <div className="error-message">{error}</div>
              <button className="btn-secondary" onClick={fetchInventoryData}>Retry</button>
            </div>
          ) : sortedAndFilteredItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <rect x="7" y="7" width="3" height="9"/>
                  <rect x="14" y="7" width="3" height="5"/>
                </svg>
              </div>
              <div className="empty-state-content">
                <h3>No {getClassificationFromTab(activeTab)} Found</h3>
                <p>There are currently no {getClassificationFromTab(activeTab).toLowerCase()} in the {activeDepartment} department{searchQuery && ` matching "${searchQuery}"`}.</p>
                <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Add First {getSingularClassification(activeTab)}
                </button>
              </div>
            </div>
          ) : (
            renderDataTable()
          )}
        </div>
      </div>

      {isViewModalOpen && <ViewInventoryItemModal item={selectedItem} onClose={() => setIsViewModalOpen(false)} />}
      {isEditModalOpen && <EditInventoryItemModal item={selectedItem} onClose={() => setIsEditModalOpen(false)} onSave={handleSaveItem} classifications={classifications} />}
      {isArchiveModalOpen && <ArchiveInventoryItemModal item={selectedItem} onClose={() => setIsArchiveModalOpen(false)} onConfirm={handleArchiveItem} />}
      {isAddModalOpen && <AddInventoryItemModal
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddItem}
        department={activeDepartment}
        classifications={classifications}
        activeClassificationTab={activeTab}
      />}
      {isExportModalOpen && <ExportInventoryModal
        onClose={() => setIsExportModalOpen(false)}
        data={isExportModalOpen === 'multi' ? undefined : sortedAndFilteredItems}
        department={isExportModalOpen === 'multi' ? undefined : activeDepartment}
        classification={isExportModalOpen === 'multi' ? undefined : activeTab}
        stats={isExportModalOpen === 'multi' ? undefined : inventoryStats}
        enableMultiTable={isExportModalOpen === 'multi'}
      />}
    </div>
  );
};

export default InventoryPage;
