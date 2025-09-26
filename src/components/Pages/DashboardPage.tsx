import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from '../Layout/TopBar';
import SideBar from '../Layout/SideBar';
import './DashboardPage.css';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, ComposedChart, PieChart, Pie, Cell, BarChart, Bar, Area
} from 'recharts';
import {
  dashboardService,
  type DashboardStats,
  type InventoryTrendData,
  type EquipmentStatusData,
  type MedicineStatusData,
  type SuppliesStatusData,
  type PatientTrendData,
  type EnhancedActivityTrendData
} from '../../services/dashboardService';
import { ChartExportUtils } from '../../utils/chartExportUtils';

interface DashboardPageProps {
  children?: React.ReactNode;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Dashboard content state
  const [stats, setStats] = useState<DashboardStats>({
    totalItems: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    expiredItems: 0,
    maintenanceItems: 0,
    activeMedicalItems: 0,
    activeDentalItems: 0,
    totalCategories: 0,
    totalUsers: 0
  });
  const [inventoryTrends, setInventoryTrends] = useState<InventoryTrendData[]>([]);
  const [equipmentStatus, setEquipmentStatus] = useState<EquipmentStatusData[]>([]);
  const [medicineStatus, setMedicineStatus] = useState<MedicineStatusData[]>([]);
  const [suppliesStatus, setSuppliesStatus] = useState<SuppliesStatusData[]>([]);
  const [patientTrends, setPatientTrends] = useState<PatientTrendData[]>([]);
  const [activityTrends, setActivityTrends] = useState<EnhancedActivityTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7' | '30' | '90'>('30');

  // Chart visibility state
  const [chartVisibility, setChartVisibility] = useState({
    equipmentStatus: true,
    medicineStatus: true,
    suppliesStatus: true,
    patientTrends: true,
    activityTrends: true,
    inventoryTrends: true
  });

  // Chart refs for export functionality
  const equipmentChartRef = useRef<HTMLDivElement>(null);
  const medicineChartRef = useRef<HTMLDivElement>(null);
  const suppliesChartRef = useRef<HTMLDivElement>(null);
  const patientChartRef = useRef<HTMLDivElement>(null);
  const activityChartRef = useRef<HTMLDivElement>(null);
  const inventoryChartRef = useRef<HTMLDivElement>(null);

  // Export loading state
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [
        statsData,
        trendsData,
        equipmentData,
        medicineData,
        suppliesData,
        patientData,
        activityData
      ] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getInventoryTrends(parseInt(selectedTimeframe)),
        dashboardService.getEquipmentStatus(),
        dashboardService.getMedicineStatus(),
        dashboardService.getSuppliesStatus(),
        dashboardService.getPatientTrends(parseInt(selectedTimeframe)),
        dashboardService.getEnhancedActivityTrends(parseInt(selectedTimeframe))
      ]);

      setStats(statsData);
      setInventoryTrends(trendsData);
      setEquipmentStatus(equipmentData);
      setMedicineStatus(medicineData);
      setSuppliesStatus(suppliesData);
      setPatientTrends(patientData);
      setActivityTrends(activityData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    if (!children) {
      fetchDashboardData();
    }
  }, [fetchDashboardData, children]);

  const toggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const closeMobileSidebar = () => {
    if (isMobile && sidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const handleTimeframeChange = (timeframe: '7' | '30' | '90') => {
    setSelectedTimeframe(timeframe);
  };

  const toggleChartVisibility = (chartKey: keyof typeof chartVisibility) => {
    setChartVisibility(prev => ({
      ...prev,
      [chartKey]: !prev[chartKey]
    }));
  };

  const toggleAllCharts = () => {
    const allVisible = Object.values(chartVisibility).every(visible => visible);
    const newVisibility = Object.keys(chartVisibility).reduce((acc, key) => ({
      ...acc,
      [key]: !allVisible
    }), {});
    setChartVisibility(newVisibility as typeof chartVisibility);
  };

  const handleChartExport = async (chartKey: string, format: 'pdf' | 'docx') => {
    try {
      setExportLoading(`${chartKey}-${format}`);

      let chartRef: React.RefObject<HTMLDivElement | null> | null = null;
      let title = '';
      let subtitle = '';
      let data: any[] = [];

      switch (chartKey) {
        case 'equipment':
          chartRef = equipmentChartRef;
          title = 'Equipment Status Overview';
          subtitle = 'Active vs Maintenance status';
          data = equipmentStatus || [];
          break;
        case 'medicine':
          chartRef = medicineChartRef;
          title = 'Medicine Status Distribution';
          subtitle = 'Active, Low Stock, Out of Stock, Expired';
          data = medicineStatus || [];
          break;
        case 'supplies':
          chartRef = suppliesChartRef;
          title = 'Supplies Status Distribution';
          subtitle = 'Active, Low Stock, Out of Stock, Expired';
          data = suppliesStatus || [];
          break;
        case 'patients':
          chartRef = patientChartRef;
          title = 'Patient Activity Trends';
          subtitle = 'Daily patient registrations and consultations';
          data = patientTrends || [];
          break;
        case 'activity':
          chartRef = activityChartRef;
          title = 'System Activity Trends';
          subtitle = 'User activities and system events over time';
          data = activityTrends || [];
          break;
        case 'inventory':
          chartRef = inventoryChartRef;
          title = 'Inventory Overview Trends';
          subtitle = 'Track inventory levels across departments and categories';
          data = inventoryTrends || [];
          break;
        default:
          throw new Error(`Invalid chart key: ${chartKey}`);
      }

      // Debug logging
      console.log(`Exporting ${chartKey} as ${format}:`, {
        title,
        subtitle,
        dataLength: data.length,
        hasChartRef: !!chartRef,
        hasChartElement: !!chartRef?.current
      });

      if (!chartRef?.current) {
        throw new Error(`Chart element not found for ${chartKey}. Make sure the chart is visible and rendered.`);
      }

      await ChartExportUtils.exportChart(format, {
        title,
        subtitle,
        data,
        chartElement: chartRef.current
      });

      console.log(`Successfully exported ${chartKey} as ${format}`);

    } catch (error) {
      console.error(`Export failed for ${chartKey} (${format}):`, error);

      // Provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      alert(`Failed to export ${chartKey} chart as ${format.toUpperCase()}: ${errorMessage}`);
    } finally {
      setExportLoading(null);
    }
  };

  const renderExportButtons = (chartKey: string) => {
    return (
      <div className="chart-export-buttons">
        <button
          className={`export-btn pdf ${exportLoading === `${chartKey}-pdf` ? 'loading' : ''}`}
          onClick={() => handleChartExport(chartKey, 'pdf')}
          disabled={exportLoading !== null}
          title="Export as PDF"
        >
          {exportLoading === `${chartKey}-pdf` ? (
            <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" strokeDashoffset="3">
                <animate attributeName="stroke-dasharray" dur="0.6s" values="0 15;4 12;0 15" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="0.6s" values="0;-4;-8" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2"/>
              <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2"/>
              <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2"/>
            </svg>
          )}
          PDF
        </button>
        <button
          className={`export-btn docx ${exportLoading === `${chartKey}-docx` ? 'loading' : ''}`}
          onClick={() => handleChartExport(chartKey, 'docx')}
          disabled={exportLoading !== null}
          title="Export as DOCX"
        >
          {exportLoading === `${chartKey}-docx` ? (
            <svg className="spinner" width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" strokeDasharray="2 4" strokeDashoffset="3">
                <animate attributeName="stroke-dasharray" dur="0.6s" values="0 15;4 12;0 15" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="0.6s" values="0;-4;-8" repeatCount="indefinite"/>
              </circle>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2"/>
              <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="18" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
            </svg>
          )}
          DOCX
        </button>
      </div>
    );
  };

  const renderDashboardContent = () => {
    if (loading) {
      return (
        <div className="page-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-message">Loading comprehensive dashboard analytics...</div>
          </div>
        </div>
      );
    }

    const statCards = [
      {
        title: 'Total Inventory Items',
        value: stats.totalItems.toLocaleString(),
        change: `${stats.totalCategories} categories`,
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
        title: 'Active Medical Items',
        value: stats.activeMedicalItems.toString(),
        change: `Medical Department`,
        changeType: 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      },
      {
        title: 'Active Dental Items',
        value: stats.activeDentalItems.toString(),
        change: `Dental Department`,
        changeType: 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2v4M12 18v4M22 12h-4M6 12H2" stroke="currentColor" strokeWidth="2"/>
            <path d="M20.49 7.51l-2.83 2.83M9.17 14.83l-2.83 2.83M20.49 16.49l-2.83-2.83M9.17 9.17L6.34 6.34" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      },
      {
        title: 'Urgent Attention Required',
        value: (stats.lowStockItems + stats.outOfStockItems + stats.expiredItems).toString(),
        change: `${stats.lowStockItems} low stock, ${stats.outOfStockItems} out of stock, ${stats.expiredItems} expired`,
        changeType: (stats.lowStockItems + stats.outOfStockItems + stats.expiredItems) > 0 ? 'warning' : 'positive',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2"/>
            <line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="17" r="1" fill="currentColor"/>
          </svg>
        )
      },
      {
        title: 'System Users',
        value: stats.totalUsers.toString(),
        change: `Active accounts`,
        changeType: 'neutral',
        icon: (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="2"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )
      }
    ];

    return (
      <div className="page-container">
        <div className="dashboard-header">
          <div className="header-content">
            <h1 className="page-title">Medical Records Management Dashboard</h1>
            <p className="page-subtitle">Comprehensive inventory, patient monitoring, and operational insights</p>
          </div>
          <div className="header-controls">
            <div className="chart-visibility-controls">
              <label>Chart Visibility:</label>
              <div className="visibility-buttons">
                <button
                  className="visibility-btn toggle-all"
                  onClick={toggleAllCharts}
                  title={Object.values(chartVisibility).every(v => v) ? "Hide All Charts" : "Show All Charts"}
                >
                  {Object.values(chartVisibility).every(v => v) ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                  )}
                  {Object.values(chartVisibility).every(v => v) ? 'Hide All' : 'Show All'}
                </button>
                {Object.entries(chartVisibility).map(([key, visible]) => {
                  const chartNames = {
                    equipmentStatus: 'Equipment',
                    medicineStatus: 'Medicine',
                    suppliesStatus: 'Supplies',
                    patientTrends: 'Patients',
                    activityTrends: 'Activity',
                    inventoryTrends: 'Inventory'
                  };
                  return (
                    <button
                      key={key}
                      className={`visibility-btn chart-toggle ${visible ? 'visible' : 'hidden'}`}
                      onClick={() => toggleChartVisibility(key as keyof typeof chartVisibility)}
                      title={`${visible ? 'Hide' : 'Show'} ${chartNames[key as keyof typeof chartNames]} Chart`}
                    >
                      {visible ? (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2"/>
                          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="currentColor" strokeWidth="2"/>
                          <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2"/>
                        </svg>
                      )}
                      {chartNames[key as keyof typeof chartNames]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="timeframe-selector">
              <label>Data Range:</label>
              <div className="timeframe-buttons">
                {(['7', '30', '90'] as const).map((timeframe) => (
                  <button
                    key={timeframe}
                    className={`timeframe-btn ${selectedTimeframe === timeframe ? 'active' : ''}`}
                    onClick={() => handleTimeframeChange(timeframe)}
                  >
                    {timeframe} days
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Indicators */}
        <div className="stats-grid">
          {statCards.map((stat, index) => (
            <div key={index} className={`stat-card ${stat.changeType}`}>
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

        {/* Primary Analytics Dashboard */}
        <div className="analytics-grid">

          {/* Equipment Status Chart */}
          {chartVisibility.equipmentStatus && (
            <div className="dashboard-card" ref={equipmentChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Equipment Status Overview</h3>
                  <span className="card-subtitle">Active vs Maintenance status</span>
                </div>
                {renderExportButtons('equipment')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={equipmentStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percentage }) => `${name} (${percentage}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {equipmentStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Medicine Status Chart */}
          {chartVisibility.medicineStatus && (
            <div className="dashboard-card" ref={medicineChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Medicine Status Distribution</h3>
                  <span className="card-subtitle">Active, Low Stock, Out of Stock, Expired</span>
                </div>
                {renderExportButtons('medicine')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={medicineStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [value, 'Count']}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                      {medicineStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Supplies Status Chart */}
          {chartVisibility.suppliesStatus && (
            <div className="dashboard-card" ref={suppliesChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Supplies Status Distribution</h3>
                  <span className="card-subtitle">Active, Low Stock, Out of Stock, Expired</span>
                </div>
                {renderExportButtons('supplies')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={suppliesStatus}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [value, 'Count']}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]}>
                      {suppliesStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Patient Trends Chart */}
          {chartVisibility.patientTrends && (
            <div className="dashboard-card" ref={patientChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Patient Activity Trends</h3>
                  <span className="card-subtitle">Daily patient registrations and consultations</span>
                </div>
                {renderExportButtons('patients')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={patientTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickFormatter={(value) => {
                        if (window.innerWidth < 768) {
                          return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      formatter={(value, name) => [value, name === 'patients' ? 'Total Patients' : name === 'consultations' ? 'Consultations' : 'New Patients']}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="patients"
                      stackId="1"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.7}
                      name="Total Patients"
                    />
                    <Area
                      type="monotone"
                      dataKey="consultations"
                      stackId="1"
                      stroke="#82ca9d"
                      fill="#82ca9d"
                      fillOpacity={0.7}
                      name="Consultations"
                    />
                    <Line
                      type="monotone"
                      dataKey="newPatients"
                      stroke="#ffc658"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="New Patients"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Activity Logs Trends */}
          {chartVisibility.activityTrends && (
            <div className="dashboard-card span-2" ref={activityChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>System Activity Trends</h3>
                  <span className="card-subtitle">User activities and system events over time</span>
                </div>
                {renderExportButtons('activity')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={activityTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (window.innerWidth < 768) {
                          return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      formatter={(value, name) => [
                        value,
                        name === 'actions' ? 'Total Actions' :
                        name === 'users' ? 'Active Users' :
                        name === 'severity.info' ? 'Info' :
                        name === 'severity.warning' ? 'Warnings' :
                        name === 'severity.error' ? 'Errors' : name
                      ]}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="actions" fill="#8884d8" name="Total Actions" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="users"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Active Users"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="severity.error"
                      stackId="1"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.6}
                      name="Errors"
                    />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="severity.warning"
                      stackId="1"
                      stroke="#F59E0B"
                      fill="#F59E0B"
                      fillOpacity={0.6}
                      name="Warnings"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Inventory Overview Trends */}
          {chartVisibility.inventoryTrends && (
            <div className="dashboard-card span-2" ref={inventoryChartRef}>
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Inventory Overview Trends</h3>
                  <span className="card-subtitle">Track inventory levels across departments and categories</span>
                </div>
                {renderExportButtons('inventory')}
              </div>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={inventoryTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        if (window.innerWidth < 768) {
                          return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                        }
                        return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                      formatter={(value, name) => [
                        value,
                        name === 'total' ? 'Total Items' :
                        name === 'medical' ? 'Medical Items' :
                        name === 'dental' ? 'Dental Items' :
                        name === 'lowStock' ? 'Low Stock Items' :
                        name === 'expired' ? 'Expired Items' : name
                      ]}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.3}
                      name="Total Items"
                    />
                    <Line
                      type="monotone"
                      dataKey="medical"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Medical Items"
                    />
                    <Line
                      type="monotone"
                      dataKey="dental"
                      stroke="#ffc658"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Dental Items"
                    />
                    <Line
                      type="monotone"
                      dataKey="lowStock"
                      stroke="#ff8042"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Low Stock Items"
                    />
                    <Line
                      type="monotone"
                      dataKey="expired"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Expired Items"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  return (
    <div
      className={`dashboard-page ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}
      onClick={closeMobileSidebar}
    >
      <div onClick={(e) => e.stopPropagation()}>
        <SideBar
          collapsed={isMobile ? false : sidebarCollapsed}
          userRole={user?.role || 'user'}
          onToggleSidebar={toggleSidebar}
          user={user}
          onLogout={logout}
        />
      </div>
      <div className="main-content" onClick={(e) => e.stopPropagation()}>
        <TopBar onToggleSidebar={toggleSidebar} isMobile={isMobile} />
        <div className="content-wrapper">
          {children ? children : renderDashboardContent()}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
