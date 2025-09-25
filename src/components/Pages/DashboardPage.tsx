import React, { useState, useEffect, useCallback } from 'react';
import './DashboardPage.css';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  Line, ComposedChart
} from 'recharts';
import {
  dashboardService,
  type DashboardStats,
  type InventoryTrendData
} from '../../services/dashboardService';

const DashboardPage: React.FC = () => {
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
  const [loading, setLoading] = useState(true);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7' | '30' | '90'>('30');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      const [statsData, trendsData] = await Promise.all([
        dashboardService.getDashboardStats(),
        dashboardService.getInventoryTrends(parseInt(selectedTimeframe))
      ]);

      setStats(statsData);
      setInventoryTrends(trendsData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleTimeframeChange = (timeframe: '7' | '30' | '90') => {
    setSelectedTimeframe(timeframe);
  };

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
      title: 'Total Items',
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
      title: 'Low Stock Items',
      value: stats.lowStockItems.toString(),
      change: `${stats.outOfStockItems} out of stock`,
      changeType: stats.lowStockItems > 0 ? 'warning' : 'positive',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      title: 'Expired Items',
      value: stats.expiredItems.toString(),
      change: `${stats.maintenanceItems} in maintenance`,
      changeType: stats.expiredItems > 0 ? 'danger' : 'positive',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
          <polyline points="12,6 12,12 16,14" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    },
    {
      title: 'Medical Items',
      value: stats.activeMedicalItems.toString(),
      change: `${stats.activeDentalItems} dental items`,
      changeType: 'neutral',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2"/>
        </svg>
      )
    }
  ];

  return (
    <div className="page-container">
      <div className="dashboard-header">
        <div className="header-content">
          <h1 className="page-title">Analytics Dashboard</h1>
          <p className="page-subtitle">Comprehensive inventory and operational insights</p>
        </div>
        <div className="header-controls">
          <div className="timeframe-selector">
            <label>Timeframe:</label>
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

      {/* Key Metrics */}
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

      {/* Main Analytics Grid */}
      <div className="analytics-grid">
        {/* Inventory Trends */}
        <div className="dashboard-card span-2">
          <div className="card-header">
            <h3>Inventory Trends Over Time</h3>
            <span className="card-subtitle">Track inventory levels by department</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={inventoryTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => {
                    if (window.innerWidth < 768) {
                      return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    return value;
                    }}
                />
                <YAxis tick={{ fontSize: 12 }} width={60} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#8884d8"
                  strokeWidth={window.innerWidth < 768 ? 2 : 3}
                  dot={{ r: window.innerWidth < 768 ? 3 : 4 }}
                  name="Total Items"
                />
                <Line
                  type="monotone"
                  dataKey="medical"
                  stroke="#82ca9d"
                  strokeWidth={window.innerWidth < 768 ? 2 : 3}
                  dot={{ r: window.innerWidth < 768 ? 3 : 4 }}
                  name="Medical"
                />
                <Line
                  type="monotone"
                  dataKey="dental"
                  stroke="#ffc658"
                  strokeWidth={window.innerWidth < 768 ? 2 : 3}
                  dot={{ r: window.innerWidth < 768 ? 3 : 4 }}
                  name="Dental"
                />
                <Line
                  type="monotone"
                  dataKey="lowStock"
                  stroke="#ff8042"
                  strokeWidth={2}
                  dot={{ r: window.innerWidth < 768 ? 2 : 3 }}
                  name="Low Stock"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
