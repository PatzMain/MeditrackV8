import { inventoryService, userService, activityService } from './supabaseService';

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  expiredItems: number;
  maintenanceItems: number;
  activeMedicalItems: number;
  activeDentalItems: number;
  totalCategories: number;
  totalUsers: number;
}

export interface InventoryTrendData {
  date: string;
  medical: number;
  dental: number;
  total: number;
  lowStock: number;
  expired: number;
  [key: string]: any;
}

export interface DepartmentComparisonData {
  department: string;
  active: number;
  lowStock: number;
  outOfStock: number;
  expired: number;
  maintenance: number;
  total: number;
  [key: string]: any;
}

export interface StatusDistributionData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  [key: string]: any;
}


export interface CategoryAnalysisData {
  category: string;
  medical: number;
  dental: number;
  total: number;
  avgStockLevel: number;
  [key: string]: any;
}

export interface ActivityTrendData {
  date: string;
  actions: number;
  users: number;
  severity: {
    info: number;
    warning: number;
    error: number;
  };
  [key: string]: any;
}

export interface TopPerformingCategories {
  category: string;
  stockLevel: number;
  utilizationRate: number;
  restockFrequency: number;
  [key: string]: any;
}

export interface ExpirationAnalysisData {
  timeframe: string;
  expiringItems: number;
  categories: string[];
  [key: string]: any;
}

class DashboardService {
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const [allItems, users] = await Promise.all([
        inventoryService.getAllItems(),
        userService.getUserStats()
      ]);

      const currentDate = new Date();
      const lowStockItems = allItems.filter((item: any) =>
        item.status === 'low_stock'
      );

      const outOfStockItems = allItems.filter((item: any) =>
        item.stock_quantity === 0 || item.status === 'out_of_stock'
      );

      const expiredItems = allItems.filter((item: any) => {
        if (!item.expiration_date) return false;
        return new Date(item.expiration_date) < currentDate;
      });

      const maintenanceItems = allItems.filter((item: any) =>
        item.status === 'maintenance'
      );

      const medicalItems = allItems.filter((item: any) =>
        item.department === 'medical' && item.status === 'active'
      );

      const dentalItems = allItems.filter((item: any) =>
        item.department === 'dental' && item.status === 'active'
      );

      const categories = Array.from(new Set(allItems.map((item: any) => item.category || 'Uncategorized')));

      return {
        totalItems: allItems.length,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        expiredItems: expiredItems.length,
        maintenanceItems: maintenanceItems.length,
        activeMedicalItems: medicalItems.length,
        activeDentalItems: dentalItems.length,
        totalCategories: categories.length,
        totalUsers: users.totalUsers
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  async getInventoryTrends(days: number = 30): Promise<InventoryTrendData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const currentDate = new Date();
      const trends: InventoryTrendData[] = [];

      // Generate trend data for the last N days
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Filter items created up to this date
        const itemsUpToDate = allItems.filter((item: any) => {
          const createdDate = new Date(item.created_at);
          return createdDate <= date;
        });

        const medicalItems = itemsUpToDate.filter((item: any) => item.department === 'medical');
        const dentalItems = itemsUpToDate.filter((item: any) => item.department === 'dental');
        const lowStockItems = itemsUpToDate.filter((item: any) =>
          item.status === 'low_stock'
        );
        const expiredItems = itemsUpToDate.filter((item: any) => {
          if (!item.expiration_date) return false;
          return new Date(item.expiration_date) < date;
        });

        trends.push({
          date: dateStr,
          medical: medicalItems.length,
          dental: dentalItems.length,
          total: itemsUpToDate.length,
          lowStock: lowStockItems.length,
          expired: expiredItems.length
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching inventory trends:', error);
      throw error;
    }
  }

  async getDepartmentComparison(): Promise<DepartmentComparisonData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const departments = ['medical', 'dental'];

      return departments.map(dept => {
        const deptItems = allItems.filter((item: any) => item.department === dept);

        const active = deptItems.filter((item: any) => item.status === 'active').length;
        const lowStock = deptItems.filter((item: any) =>
          item.status === 'low_stock'
        ).length;
        const outOfStock = deptItems.filter((item: any) =>
          item.stock_quantity === 0 || item.status === 'out_of_stock'
        ).length;
        const expired = deptItems.filter((item: any) => {
          if (!item.expiration_date) return false;
          return new Date(item.expiration_date) < new Date();
        }).length;
        const maintenance = deptItems.filter((item: any) =>
          item.status === 'maintenance'
        ).length;

        return {
          department: dept.charAt(0).toUpperCase() + dept.slice(1),
          active,
          lowStock,
          outOfStock,
          expired,
          maintenance,
          total: deptItems.length
        };
      });
    } catch (error) {
      console.error('Error fetching department comparison:', error);
      throw error;
    }
  }

  async getStatusDistribution(): Promise<StatusDistributionData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const statusCounts: { [key: string]: number } = {};
      const statusColors: { [key: string]: string } = {
        active: '#10B981',
        low_stock: '#F59E0B',
        out_of_stock: '#EF4444',
        expired: '#8B5CF6',
        maintenance: '#6B7280',
        archived: '#374151'
      };

      allItems.forEach((item: any) => {
        const status = item.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const total = allItems.length;

      return Object.entries(statusCounts).map(([status, count]) => ({
        name: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        value: count,
        percentage: Math.round((count / total) * 100),
        color: statusColors[status] || '#9CA3AF'
      }));
    } catch (error) {
      console.error('Error fetching status distribution:', error);
      throw error;
    }
  }


  async getCategoryAnalysis(): Promise<CategoryAnalysisData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const categoryGroups: { [key: string]: any[] } = {};

      allItems.forEach((item: any) => {
        const category = item.category || 'Uncategorized';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(item);
      });

      return Object.entries(categoryGroups).map(([category, items]) => {
        const medicalItems = items.filter(item => item.department === 'medical');
        const dentalItems = items.filter(item => item.department === 'dental');
        const avgStockLevel = items.reduce((sum, item) => sum + (item.stock_quantity || 0), 0) / items.length;

        return {
          category,
          medical: medicalItems.length,
          dental: dentalItems.length,
          total: items.length,
          avgStockLevel: Math.round(avgStockLevel)
        };
      }).sort((a, b) => b.total - a.total);
    } catch (error) {
      console.error('Error fetching category analysis:', error);
      throw error;
    }
  }

  async getExpirationAnalysis(): Promise<ExpirationAnalysisData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const currentDate = new Date();

      const timeframes = [
        { name: 'Expired', days: -1 },
        { name: 'Next 7 Days', days: 7 },
        { name: 'Next 30 Days', days: 30 },
        { name: 'Next 90 Days', days: 90 }
      ];

      return timeframes.map(timeframe => {
        let filteredItems;

        if (timeframe.days === -1) {
          // Expired items
          filteredItems = allItems.filter((item: any) => {
            if (!item.expiration_date) return false;
            return new Date(item.expiration_date) < currentDate;
          });
        } else {
          // Items expiring within timeframe
          const futureDate = new Date(currentDate);
          futureDate.setDate(futureDate.getDate() + timeframe.days);

          filteredItems = allItems.filter((item: any) => {
            if (!item.expiration_date) return false;
            const expirationDate = new Date(item.expiration_date);
            return expirationDate >= currentDate && expirationDate <= futureDate;
          });
        }

        const categories = Array.from(new Set(filteredItems.map((item: any) => item.category || 'Uncategorized')));

        return {
          timeframe: timeframe.name,
          expiringItems: filteredItems.length,
          categories
        };
      });
    } catch (error) {
      console.error('Error fetching expiration analysis:', error);
      throw error;
    }
  }


  async getActivityTrends(days: number = 30): Promise<ActivityTrendData[]> {
    try {
      const activities = await activityService.getLogs();
      const currentDate = new Date();
      const trends: ActivityTrendData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Get next day for filtering
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Filter activities for this specific day
        const dayActivities = activities.filter((activity: any) => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= date && activityDate < nextDate;
        });

        // Count activities by severity
        const severityCounts = {
          info: 0,
          warning: 0,
          error: 0
        };

        dayActivities.forEach((activity: any) => {
          const severity = activity.severity || 'info';
          if (severityCounts[severity as keyof typeof severityCounts] !== undefined) {
            severityCounts[severity as keyof typeof severityCounts]++;
          }
        });

        // Count unique users for this day
        const uniqueUsers = new Set(dayActivities.map((activity: any) => activity.user_id));

        trends.push({
          date: dateStr,
          actions: dayActivities.length,
          users: uniqueUsers.size,
          severity: severityCounts
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching activity trends:', error);
      throw error;
    }
  }

  async getTopPerformingCategories(): Promise<TopPerformingCategories[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const categoryGroups: { [key: string]: any[] } = {};

      allItems.forEach((item: any) => {
        const category = item.category || 'Uncategorized';
        if (!categoryGroups[category]) {
          categoryGroups[category] = [];
        }
        categoryGroups[category].push(item);
      });

      return Object.entries(categoryGroups)
        .map(([category, items]) => {
          const totalStock = items.reduce((sum, item) => sum + (item.stock_quantity || 0), 0);
          const avgStock = totalStock / items.length;

          // Calculate utilization rate based on status distribution
          const totalItems = items.length;
          const activeItems = items.filter(item => item.status === 'active').length;
          const lowStockItems = items.filter(item => item.status === 'low_stock').length;
          const avgUtilization = totalItems > 0 ? Math.round((activeItems + (lowStockItems * 0.5)) / totalItems * 100) : 0;

          // Calculate restock frequency based on recently updated items
          const recentlyUpdated = items.filter(item => {
            const updatedAt = new Date(item.updated_at || item.created_at);
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return updatedAt >= thirtyDaysAgo;
          }).length;

          return {
            category,
            stockLevel: Math.round(avgStock),
            utilizationRate: avgUtilization,
            restockFrequency: recentlyUpdated
          };
        })
        .sort((a, b) => b.stockLevel - a.stockLevel)
        .slice(0, 5);
    } catch (error) {
      console.error('Error fetching top performing categories:', error);
      throw error;
    }
  }
}

export const dashboardService = new DashboardService();