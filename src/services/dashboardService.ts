import { inventoryService, userService, activityService, patientMonitoringService } from './supabaseService';

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

// New interfaces for enhanced dashboard
export interface EquipmentStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export interface MedicineStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export interface SuppliesStatusData {
  status: string;
  count: number;
  percentage: number;
  color: string;
  [key: string]: any;
}

export interface PatientTrendData {
  date: string;
  patients: number;
  consultations: number;
  newPatients: number;
  [key: string]: any;
}

export interface EnhancedActivityTrendData {
  date: string;
  actions: number;
  users: number;
  categories: {
    [key: string]: number;
  };
  severity: {
    info: number;
    warning: number;
    error: number;
  };
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

  // New methods for enhanced dashboard
  async getEquipmentStatus(): Promise<EquipmentStatusData[]> {
    try {
      // Get all items with their classifications
      const allItems = await inventoryService.getAllItems();
      const classifications = await inventoryService.getClassifications();

      // Create a map of classification_id to classification name
      const classificationMap = new Map();
      classifications.forEach((classification: any) => {
        classificationMap.set(classification.id, classification.name.toLowerCase());
      });

      // Filter equipment items based on classification name
      const equipmentItems = allItems.filter((item: any) => {
        const classificationName = classificationMap.get(item.classification_id);
        return classificationName && (
          classificationName.includes('equipment') ||
          classificationName.includes('device') ||
          classificationName.includes('instrument')
        );
      });

      const statusCounts: { [key: string]: number } = {
        active: 0,
        maintenance: 0
      };

      equipmentItems.forEach((item: any) => {
        if (item.status === 'active') statusCounts.active++;
        else if (item.status === 'maintenance') statusCounts.maintenance++;
      });

      const total = equipmentItems.length || 1;
      const statusColors = {
        active: '#10B981',
        maintenance: '#F59E0B'
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: Math.round((count / total) * 100),
        color: statusColors[status as keyof typeof statusColors]
      }));
    } catch (error) {
      console.error('Error fetching equipment status:', error);
      return [];
    }
  }

  async getMedicineStatus(): Promise<MedicineStatusData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const classifications = await inventoryService.getClassifications();

      // Create a map of classification_id to classification name
      const classificationMap = new Map();
      classifications.forEach((classification: any) => {
        classificationMap.set(classification.id, classification.name.toLowerCase());
      });

      // Filter medicine items based on classification name or category
      const medicineItems = allItems.filter((item: any) => {
        const classificationName = classificationMap.get(item.classification_id);
        const categoryName = item.category?.toLowerCase() || '';

        return (
          categoryName.includes('medicine') ||
          categoryName.includes('drug') ||
          categoryName.includes('pharmaceutical') ||
          (classificationName && (
            classificationName.includes('medicine') ||
            classificationName.includes('drug') ||
            classificationName.includes('pharmaceutical')
          ))
        );
      });

      const statusCounts: { [key: string]: number } = {
        active: 0,
        low_stock: 0,
        out_of_stock: 0,
        expired: 0
      };

      const currentDate = new Date();

      medicineItems.forEach((item: any) => {
        if (item.status === 'expired' || (item.expiration_date && new Date(item.expiration_date) < currentDate)) {
          statusCounts.expired++;
        } else if (item.status === 'out_of_stock' || item.stock_quantity === 0) {
          statusCounts.out_of_stock++;
        } else if (item.status === 'low_stock') {
          statusCounts.low_stock++;
        } else if (item.status === 'active') {
          statusCounts.active++;
        }
      });

      const total = medicineItems.length || 1;
      const statusColors = {
        active: '#10B981',
        low_stock: '#F59E0B',
        out_of_stock: '#EF4444',
        expired: '#8B5CF6'
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: Math.round((count / total) * 100),
        color: statusColors[status as keyof typeof statusColors]
      }));
    } catch (error) {
      console.error('Error fetching medicine status:', error);
      return [];
    }
  }

  async getSuppliesStatus(): Promise<SuppliesStatusData[]> {
    try {
      const allItems = await inventoryService.getAllItems();
      const classifications = await inventoryService.getClassifications();

      // Create a map of classification_id to classification name
      const classificationMap = new Map();
      classifications.forEach((classification: any) => {
        classificationMap.set(classification.id, classification.name.toLowerCase());
      });

      // Filter supplies items based on classification name or category
      const suppliesItems = allItems.filter((item: any) => {
        const classificationName = classificationMap.get(item.classification_id);
        const categoryName = item.category?.toLowerCase() || '';

        return (
          categoryName.includes('supplies') ||
          categoryName.includes('supply') ||
          categoryName.includes('material') ||
          categoryName.includes('consumable') ||
          (classificationName && (
            classificationName.includes('supplies') ||
            classificationName.includes('supply') ||
            classificationName.includes('material') ||
            classificationName.includes('consumable')
          ))
        );
      });

      const statusCounts: { [key: string]: number } = {
        active: 0,
        low_stock: 0,
        out_of_stock: 0,
        expired: 0
      };

      const currentDate = new Date();

      suppliesItems.forEach((item: any) => {
        if (item.status === 'expired' || (item.expiration_date && new Date(item.expiration_date) < currentDate)) {
          statusCounts.expired++;
        } else if (item.status === 'out_of_stock' || item.stock_quantity === 0) {
          statusCounts.out_of_stock++;
        } else if (item.status === 'low_stock') {
          statusCounts.low_stock++;
        } else if (item.status === 'active') {
          statusCounts.active++;
        }
      });

      const total = suppliesItems.length || 1;
      const statusColors = {
        active: '#10B981',
        low_stock: '#F59E0B',
        out_of_stock: '#EF4444',
        expired: '#8B5CF6'
      };

      return Object.entries(statusCounts).map(([status, count]) => ({
        status: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
        count,
        percentage: Math.round((count / total) * 100),
        color: statusColors[status as keyof typeof statusColors]
      }));
    } catch (error) {
      console.error('Error fetching supplies status:', error);
      return [];
    }
  }

  async getPatientTrends(days: number = 30): Promise<PatientTrendData[]> {
    try {
      // Get all patients and consultations data
      const [allPatients, allConsultations] = await Promise.all([
        patientMonitoringService.getPatients(),
        patientMonitoringService.getConsultations(false)
      ]);

      const trends: PatientTrendData[] = [];
      const currentDate = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        // Filter consultations for this specific day
        const dayConsultations = allConsultations.filter((consultation: any) => {
          const consultationDate = new Date(consultation.consultation_date);
          return consultationDate >= date && consultationDate < nextDate;
        });

        // Get new patients registered on this day
        const newPatientsCount = allPatients.filter((patient: any) => {
          const createdDate = new Date(patient.created_at);
          return createdDate >= date && createdDate < nextDate;
        }).length;

        // Get total active patients up to this date
        const totalPatientsCount = allPatients.filter((patient: any) => {
          const createdDate = new Date(patient.created_at);
          return createdDate <= date && patient.status === 'active';
        }).length;

        trends.push({
          date: dateStr,
          patients: totalPatientsCount || 0,
          consultations: dayConsultations.length || 0,
          newPatients: newPatientsCount || 0
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching patient trends:', error);
      // Fallback to basic stats if detailed data is unavailable
      const trends: PatientTrendData[] = [];
      const currentDate = new Date();

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        trends.push({
          date: dateStr,
          patients: 0,
          consultations: 0,
          newPatients: 0
        });
      }

      return trends;
    }
  }

  async getEnhancedActivityTrends(days: number = 30): Promise<EnhancedActivityTrendData[]> {
    try {
      const activities = await activityService.getLogs();
      const currentDate = new Date();
      const trends: EnhancedActivityTrendData[] = [];

      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayActivities = activities.filter((activity: any) => {
          const activityDate = new Date(activity.timestamp);
          return activityDate >= date && activityDate < nextDate;
        });

        // Count activities by category
        const categoryCounts: { [key: string]: number } = {};
        const severityCounts = { info: 0, warning: 0, error: 0 };

        dayActivities.forEach((activity: any) => {
          const category = activity.category || 'Other';
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          const severity = activity.severity || 'info';
          if (severityCounts[severity as keyof typeof severityCounts] !== undefined) {
            severityCounts[severity as keyof typeof severityCounts]++;
          }
        });

        const uniqueUsers = new Set(dayActivities.map((activity: any) => activity.user_id));

        trends.push({
          date: dateStr,
          actions: dayActivities.length,
          users: uniqueUsers.size,
          categories: categoryCounts,
          severity: severityCounts
        });
      }

      return trends;
    } catch (error) {
      console.error('Error fetching enhanced activity trends:', error);
      return [];
    }
  }
}

export const dashboardService = new DashboardService();