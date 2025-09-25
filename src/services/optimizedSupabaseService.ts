import { supabase } from '../lib/supabase';
import { cacheService, CACHE_TTL } from './cacheService';

export interface User {
  id: number;
  username: string;
  role: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  license_number?: string;
  specialization?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// Optimized Auth service with caching
export const optimizedAuthService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      // Don't cache login attempts for security reasons
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', credentials.username)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid username or password');
      }

      if (!credentials.password || credentials.password.length < 3) {
        throw new Error('Invalid username or password');
      }

      const token = `token_${userData.id}_${Date.now()}`;

      const user: User = {
        id: userData.id,
        username: userData.username,
        role: userData.role,
        first_name: userData.first_name,
        last_name: userData.last_name,
        phone: userData.phone,
        department: userData.department,
        position: userData.position,
        employee_id: userData.employee_id,
        license_number: userData.license_number,
        specialization: userData.specialization,
      };

      return {
        message: 'Login successful',
        token,
        user,
      };
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Clear all cache on logout
    cacheService.clearAll();
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('token');
  },

  getSession: async () => {
    return null;
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return { data: { subscription: { unsubscribe: () => {} } } };
  },

  changePassword: async (passwordData: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(passwordData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to change password');
    }

    return response.json();
  },
};

// Optimized Patient service with caching and pagination



// Optimized Inventory service with aggressive caching
export const optimizedInventoryService = {
  getAllItems: async (page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'inventory',
      'getAllItems',
      async () => {
        let query = supabase
          .from('inventory_view')
          .select('*', { count: 'exact' })
          .not('status', 'eq', 'archived')
          .order('generic_name', { ascending: true });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.MEDIUM
    );
  },

  getItemsByDepartment: async (department: string, page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'inventory',
      'getItemsByDepartment',
      async () => {
        let query = supabase
          .from('inventory_view')
          .select('*', { count: 'exact' })
          .eq('department', department)
          .not('status', 'eq', 'archived')
          .order('generic_name', { ascending: true });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { department, page, limit },
      CACHE_TTL.MEDIUM
    );
  },

  getItemsByDepartmentAndClassification: async (
    department: string,
    classification: string,
    page?: number,
    limit?: number
  ) => {
    return cacheService.cachedCall(
      'inventory',
      'getItemsByDepartmentAndClassification',
      async () => {
        let query = supabase
          .from('inventory_view')
          .select('*', { count: 'exact' })
          .eq('department', department)
          .eq('classification', classification)
          .not('status', 'eq', 'archived')
          .order('generic_name', { ascending: true });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { department, classification, page, limit },
      CACHE_TTL.MEDIUM
    );
  },

  createItem: async (itemData: any) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .insert([itemData])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Clear inventory cache
    cacheService.clearByPattern('inventory');

    return data;
  },

  updateItem: async (id: number, itemData: any) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update(itemData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Clear inventory cache
    cacheService.clearByPattern('inventory');

    return data;
  },

  deleteItem: async (id: number) => {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);

    // Clear inventory cache
    cacheService.clearByPattern('inventory');
  },

  archiveItem: async (id: number) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Clear inventory cache
    cacheService.clearByPattern('inventory');

    return data;
  },

  getArchivedItems: async (page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'inventory',
      'getArchivedItems',
      async () => {
        let query = supabase
          .from('inventory_view')
          .select('*', { count: 'exact' })
          .eq('status', 'archived')
          .order('created_at', { ascending: false });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.LONG
    );
  },

  getInventoryStatus: async () => {
    return cacheService.cachedCall(
      'inventory',
      'getInventoryStatus',
      async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('status, id');

        if (error) throw new Error(error.message);

        const counts = (data || []).reduce((acc: { [key: string]: number }, item) => {
          acc[item.status] = (acc[item.status] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.keys(counts).map(status => ({
          name: status,
          value: counts[status]
        }));

        return chartData;
      },
      undefined,
      CACHE_TTL.LONG
    );
  },

  getClassifications: async () => {
    return cacheService.cachedCall(
      'inventory',
      'getClassifications',
      async () => {
        const { data, error } = await supabase
          .from('inventory_classifications')
          .select('id, name');

        if (error) throw new Error(error.message);
        return data || [];
      },
      undefined,
      CACHE_TTL.STATIC // Classifications rarely change
    );
  },
};

// Optimized Activity service
export const optimizedActivityService = {
  logActivity: async (activityData: any) => {
    const currentUser = optimizedAuthService.getCurrentUser();

    if (currentUser) {
      const { error } = await supabase
        .from('user_activity')
        .insert([
          {
            ...activityData,
            user_id: currentUser.id,
            timestamp: new Date().toISOString(),
          },
        ]);

      if (error) {
        console.error('Failed to log activity:', error);
      }

      // Clear logs cache since new activity was added
      cacheService.clearByPattern('activity_getLogs');
    }
  },

  getLogs: async (page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'activity',
      'getLogs',
      async () => {
        let query = supabase
          .from('user_activity')
          .select(`
            *,
            users (
              username,
              role,
              first_name,
              last_name
            )
          `, { count: 'exact' })
          .order('timestamp', { ascending: false });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.SHORT
    );
  },
};

// Optimized User service
export const optimizedUserService = {
  getProfile: async (): Promise<User> => {
    const currentUser = optimizedAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return currentUser;
  },

  updateProfile: async (profileData: Partial<User>): Promise<User> => {
    const currentUser = optimizedAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    delete profileData.username;

    const { data, error } = await supabase
      .from('users')
      .update(profileData)
      .eq('id', currentUser.id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const updatedUser: User = {
      id: data.id,
      username: data.username,
      role: data.role,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      department: data.department,
      position: data.position,
      employee_id: data.employee_id,
      license_number: data.license_number,
      specialization: data.specialization,
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));

    // Clear user cache
    cacheService.clearByPattern('user');

    return updatedUser;
  },

  getActivity: async (page?: number, limit?: number): Promise<any[]> => {
    const currentUser = optimizedAuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    return cacheService.cachedCall(
      'user',
      'getActivity',
      async () => {
        let query = supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('timestamp', { ascending: false });

        if (page && limit) {
          query = query.limit(limit);
        } else {
          query = query.limit(50);
        }

        const { data, error } = await query;

        if (error) {
          throw new Error(error.message);
        }

        return data || [];
      },
      { userId: currentUser.id, page, limit },
      CACHE_TTL.SHORT
    );
  },

  getAllUsers: async (page?: number, limit?: number): Promise<any> => {
    return cacheService.cachedCall(
      'user',
      'getAllUsers',
      async () => {
        let query = supabase
          .from('users')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) {
          throw new Error(error.message);
        }

        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.MEDIUM
    );
  },

  createUser: async (userData: any): Promise<any> => {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...userData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Clear users cache
    cacheService.clearByPattern('user_getAllUsers');
    cacheService.clearByPattern('user_getUserStats');

    return data;
  },

  updateUser: async (userId: number, userData: any): Promise<any> => {
    const { data, error } = await supabase
      .from('users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Clear users cache
    cacheService.clearByPattern('user_getAllUsers');
    cacheService.clearByPattern('user_getUserStats');

    return data;
  },

  deleteUser: async (userId: number): Promise<void> => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (error) {
      throw new Error(error.message);
    }

    // Clear users cache
    cacheService.clearByPattern('user_getAllUsers');
    cacheService.clearByPattern('user_getUserStats');
  },

  getUserStats: async (): Promise<any> => {
    return cacheService.cachedCall(
      'user',
      'getUserStats',
      async () => {
        const { data, error } = await supabase
          .from('users')
          .select('role, id');

        if (error) {
          throw new Error(error.message);
        }

        const roleCounts = (data || []).reduce((acc: { [key: string]: number }, user) => {
          acc[user.role] = (acc[user.role] || 0) + 1;
          return acc;
        }, {});

        return {
          totalUsers: data?.length || 0,
          roleCounts,
          chartData: Object.keys(roleCounts).map(role => ({
            name: role,
            value: roleCounts[role]
          }))
        };
      },
      undefined,
      CACHE_TTL.LONG
    );
  },
};

// Archives service with caching
export const optimizedArchiveService = {
  getArchives: async (page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'archive',
      'getArchives',
      async () => {
        let query = supabase
          .from('medical_records')
          .select(`
            *,
            patients (
              patient_id,
              first_name,
              last_name
            ),
            users (
              username,
              first_name,
              last_name
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.LONG
    );
  },

  getArchivedConsultations: async (page?: number, limit?: number) => {
    return cacheService.cachedCall(
      'archive',
      'getArchivedConsultations',
      async () => {
        let query = supabase
          .from('consultations')
          .select(`
            *,
            patients (
              patient_id,
              first_name,
              last_name
            ),
            users (
              username,
              first_name,
              last_name
            )
          `, { count: 'exact' })
          .order('created_at', { ascending: false });

        if (page && limit) {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          query = query.range(from, to);
        }

        const { data, error, count } = await query;

        if (error) throw new Error(error.message);
        return { data: data || [], count: count || 0 };
      },
      { page, limit },
      CACHE_TTL.LONG
    );
  }
};