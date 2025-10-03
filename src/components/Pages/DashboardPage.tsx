import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import TopBar from '../Layout/TopBar';
import SideBar from '../Layout/SideBar';
import './DashboardPage.css';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  dashboardService,
  type DashboardStats,
  type InventoryTrendData,
  type EquipmentStatusData,
  type MedicineStatusData,
  type SuppliesStatusData,
  type PatientTrendData,
  type EnhancedActivityTrendData,
  type PatientDistributionData
} from '../../services/dashboardService';

// Register Chart.js components
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler
);

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
  const [patientDistribution, setPatientDistribution] = useState<PatientDistributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7' | '30' | '90'>('30');

  // Chart visibility state
  const [chartVisibility, setChartVisibility] = useState({
    equipmentStatus: true,
    medicineStatus: true,
    suppliesStatus: true,
    patientTrends: true,
    activityTrends: true,
    inventoryTrends: true,
    patientDistribution: true
  });


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
        activityData,
        distributionData
      ] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getInventoryTrends(parseInt(selectedTimeframe)),
        dashboardService.getEquipmentStatus(),
        dashboardService.getMedicineStatus(),
        dashboardService.getSuppliesStatus(),
        dashboardService.getPatientTrends(parseInt(selectedTimeframe)),
        dashboardService.getEnhancedActivityTrends(parseInt(selectedTimeframe)),
        dashboardService.getPatientDistribution()
      ]);

      setStats(statsData);
      setInventoryTrends(trendsData);
      setEquipmentStatus(equipmentData);
      setMedicineStatus(medicineData);
      setSuppliesStatus(suppliesData);
      setPatientTrends(patientData);
      setActivityTrends(activityData);
      setPatientDistribution(distributionData);

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
                    inventoryTrends: 'Inventory',
                    patientDistribution: 'Distribution'
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
              <div className="stat-icon-wrapper">
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
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Equipment Status Overview</h3>
                  <span className="card-subtitle">Active vs Maintenance status</span>
                </div>
              </div>
              <div className="chart-container">
                <Doughnut
                  data={{
                    labels: equipmentStatus.map(item => item.status),
                    datasets: [{
                      data: equipmentStatus.map(item => item.count),
                      backgroundColor: ['#3B82F6', '#60A5FA', '#93C5FD', '#1E40AF'],
                      borderColor: '#ffffff',
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 15,
                          font: { size: 12, weight: 'bold' as const }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 },
                        callbacks: {
                          label: (context) => {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value} (${percentage}%)`;
                          }
                        }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Medicine Status Chart */}
          {chartVisibility.medicineStatus && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Medicine Status Distribution</h3>
                  <span className="card-subtitle">Active, Low Stock, Out of Stock, Expired</span>
                </div>
              </div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: medicineStatus.map(item => item.status),
                    datasets: [{
                      label: 'Count',
                      data: medicineStatus.map(item => item.count),
                      backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
                      borderColor: ['#059669', '#D97706', '#DC2626', '#4B5563'],
                      borderWidth: 1,
                      borderRadius: 6
                    }]
                  }}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      },
                      y: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Supplies Status Chart */}
          {chartVisibility.suppliesStatus && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Supplies Status Distribution</h3>
                  <span className="card-subtitle">Active, Low Stock, Out of Stock, Expired</span>
                </div>
              </div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: suppliesStatus.map(item => item.status),
                    datasets: [{
                      label: 'Count',
                      data: suppliesStatus.map(item => item.count),
                      backgroundColor: ['#F59E0B', '#FBBF24', '#FCD34D', '#D97706'],
                      borderColor: ['#D97706', '#F59E0B', '#FBBF24', '#B45309'],
                      borderWidth: 1,
                      borderRadius: 6
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: { font: { size: 11 } }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Patient Trends Chart */}
          {chartVisibility.patientTrends && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Patient Activity Trends</h3>
                  <span className="card-subtitle">Daily patient registrations and consultations</span>
                </div>
              </div>
              <div className="chart-container">
                <Line
                  data={{
                    labels: patientTrends.map(item =>
                      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {
                        label: 'Total Patients',
                        data: patientTrends.map(item => item.patients),
                        backgroundColor: 'rgba(236, 72, 153, 0.2)',
                        borderColor: '#EC4899',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Consultations',
                        data: patientTrends.map(item => item.consultations),
                        backgroundColor: 'rgba(244, 114, 182, 0.2)',
                        borderColor: '#F472B6',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'New Patients',
                        data: patientTrends.map(item => item.newPatients),
                        backgroundColor: 'rgba(251, 207, 232, 0.2)',
                        borderColor: '#FBCFE8',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index' as const,
                      intersect: false
                    },
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 15,
                          font: { size: 12, weight: 'bold' as const }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Activity Logs Trends */}
          {chartVisibility.activityTrends && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>System Activity Trends</h3>
                  <span className="card-subtitle">User activities and system events over time</span>
                </div>
              </div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: activityTrends.map(item =>
                      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {
                        label: 'Total Actions',
                        data: activityTrends.map(item => item.actions),
                        backgroundColor: '#8B5CF6',
                        borderColor: '#7C3AED',
                        borderWidth: 1,
                        borderRadius: 4
                      },
                      {
                        label: 'Active Users',
                        data: activityTrends.map(item => item.users),
                        backgroundColor: '#6366F1',
                        borderColor: '#4F46E5',
                        borderWidth: 1,
                        borderRadius: 4
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index' as const,
                      intersect: false
                    },
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 15,
                          font: { size: 12, weight: 'bold' as const }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Inventory Overview Trends */}
          {chartVisibility.inventoryTrends && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Inventory Overview Trends</h3>
                  <span className="card-subtitle">Track inventory levels across departments and categories</span>
                </div>
              </div>
              <div className="chart-container">
                <Line
                  data={{
                    labels: inventoryTrends.map(item =>
                      new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    ),
                    datasets: [
                      {
                        label: 'Total Items',
                        data: inventoryTrends.map(item => item.total),
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        borderColor: '#3B82F6',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Medical Items',
                        data: inventoryTrends.map(item => item.medical),
                        backgroundColor: 'transparent',
                        borderColor: '#10B981',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Dental Items',
                        data: inventoryTrends.map(item => item.dental),
                        backgroundColor: 'transparent',
                        borderColor: '#F59E0B',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Low Stock Items',
                        data: inventoryTrends.map(item => item.lowStock),
                        backgroundColor: 'transparent',
                        borderColor: '#EF4444',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      },
                      {
                        label: 'Expired Items',
                        data: inventoryTrends.map(item => item.expired),
                        backgroundColor: 'transparent',
                        borderColor: '#8B5CF6',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        pointHoverRadius: 5
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index' as const,
                      intersect: false
                    },
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 15,
                          font: { size: 12, weight: 'bold' as const }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { font: { size: 11 } }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
              </div>
            </div>
          )}

          {/* Patient Distribution Chart */}
          {chartVisibility.patientDistribution && (
            <div className="dashboard-card span-2">
              <div className="card-header">
                <div className="card-title-section">
                  <h3>Student Patient Distribution</h3>
                  <span className="card-subtitle">Total students by course and year level</span>
                </div>
              </div>
              <div className="chart-container">
                <Bar
                  data={{
                    labels: Array.from(new Set(patientDistribution.map(item => item.course))),
                    datasets: (() => {
                      // Get unique year levels
                      const yearLevels = Array.from(new Set(patientDistribution.map(item => item.yearLevel).filter(y => y !== null))).sort();

                      // Color palette for year levels
                      const colors = [
                        { bg: '#3B82F6', border: '#2563EB' },
                        { bg: '#8B5CF6', border: '#7C3AED' },
                        { bg: '#10B981', border: '#059669' },
                        { bg: '#F59E0B', border: '#D97706' },
                        { bg: '#EF4444', border: '#DC2626' },
                        { bg: '#EC4899', border: '#DB2777' }
                      ];

                      return yearLevels.map((year, index) => {
                        const courses = Array.from(new Set(patientDistribution.map(item => item.course)));
                        const data = courses.map(course => {
                          const entry = patientDistribution.find(d => d.course === course && d.yearLevel === year);
                          return entry ? entry.count : 0;
                        });

                        return {
                          label: `Year ${year}`,
                          data,
                          backgroundColor: colors[index % colors.length].bg,
                          borderColor: colors[index % colors.length].border,
                          borderWidth: 1,
                          borderRadius: 4
                        };
                      });
                    })()
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                      mode: 'index' as const,
                      intersect: false
                    },
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                        labels: {
                          padding: 15,
                          font: { size: 12, weight: 'bold' as const }
                        }
                      },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 14, weight: 'bold' as const },
                        bodyFont: { size: 12 }
                      }
                    },
                    scales: {
                      x: {
                        grid: { display: false },
                        ticks: {
                          font: { size: 10 },
                          maxRotation: 45,
                          minRotation: 45
                        }
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: {
                          font: { size: 11 },
                          stepSize: 1
                        }
                      }
                    },
                    animation: {
                      duration: 750,
                      easing: 'easeInOutQuart' as const
                    }
                  }}
                />
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
