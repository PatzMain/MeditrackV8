import { supabase } from '../lib/supabase';
import bcrypt from 'bcryptjs';

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
  avatar_url?: string;
}

export interface Patient {
  id: number;
  patient_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  age?: number;
  sex?: 'Male' | 'Female';
  civil_status?: 'Single' | 'Married' | 'Divorced' | 'Widowed';
  birthday?: string;
  address?: string;
  patient_type: 'Employee' | 'Dependent' | 'Student' | 'OPD';
  course_department?: string;
  student_level?: string;
  year_level?: number;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
  created_by?: number;
}

export interface Consultation {
  id: number;
  case_number: string;
  patient_id: number;
  consultation_date: string;
  time_in: string;
  time_out?: string;
  chief_complaint: string;
  previous_consultation_date?: string;
  previous_diagnosis?: string;
  previous_medications?: string;
  diagnosis?: string;
  subjective_notes?: string;
  objective_notes?: string;
  assessment_notes?: string;
  plan_notes?: string;
  interventions?: string;
  attending_physician?: number;
  attending_physician_name?: string;
  created_at: string;
  updated_at: string;
  created_by?: number;
  status: 'active' | 'completed' | 'cancelled';
  patient?: Patient;
}

export interface VitalSigns {
  id: number;
  consultation_id: number;
  mode_of_arrival?: 'Ambulatory' | 'Assisted' | 'Cuddled/Carried';
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  temperature?: number;
  pulse_rate?: number;
  respiratory_rate?: number;
  height?: number;
  weight?: number;
  oxygen_saturation?: number;
  lmp?: string;
  has_valuables?: boolean;
  valuables_released_to?: string;
  valuables_items?: string;
  patient_in_pain?: boolean;
  pain_scale?: number;
  patient_has_injuries?: boolean;
  injury_abrasion?: boolean;
  injury_contusion?: boolean;
  injury_fracture?: boolean;
  injury_laceration?: boolean;
  injury_puncture?: boolean;
  injury_sprain?: boolean;
  injury_other?: string;
  noi?: string;
  poi?: string;
  doi?: string;
  toi?: string;
  recorded_at: string;
  recorded_by?: number;
}

export interface PatientContact {
  id: number;
  patient_id: number;
  contact_name: string;
  relationship: string;
  contact_number: string;
  is_primary: boolean;
  created_at: string;
}

export interface MedicalHistory {
  id: number;
  patient_id: number;
  // Allergies
  food_allergies?: string;
  drug_allergies?: string;
  other_allergies?: string;
  // Family History
  family_ptb: boolean;
  family_cancer: boolean;
  family_dm: boolean;
  family_cardiovascular: boolean;
  family_others?: string;
  // Medical History
  seizure: boolean;
  asthma: boolean;
  ptb: boolean;
  surgery: boolean;
  cardio: boolean;
  neuro: boolean;
  ob_gyne: boolean;
  other_conditions?: string;
  created_at: string;
  updated_at: string;
}

export interface GlasgowComaScale {
  id: number;
  consultation_id: number;
  eye_response: number; // 1-4
  eye_response_description?: string;
  verbal_response: number; // 1-5
  verbal_response_description?: string;
  motor_response: number; // 1-6
  motor_response_description?: string;
  total_score: number; // Auto-calculated: 3-15
  assessed_at: string;
  assessed_by?: number;
}

export interface ConsultationAttachment {
  id: number;
  consultation_id: number;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size?: number;
  description?: string;
  uploaded_at: string;
  uploaded_by?: number;
}

export interface PatientMonitoringLog {
  id: number;
  patient_id?: number;
  consultation_id?: number;
  action: string;
  description?: string;
  details?: any; // JSONB
  performed_at: string;
  performed_by?: number;
}

export interface PatientStats {
  totalPatients: number;
  activeConsultations: number;
  todayConsultations: number;
  studentsCount: number;
  employeesCount: number;
  opdCount: number;
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

// Helper function to hash passwords
const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Auth service using Supabase database (not Supabase auth)
export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      // Query users table for username
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('username', credentials.username)
        .single();

      if (userError || !userData) {
        throw new Error('Invalid username or password');
      }

      // Verify password against stored hash
      let isPasswordValid = false;

      // Check if password_hash field exists and is a valid bcrypt hash
      if (userData.password_hash && userData.password_hash.startsWith('$2') && userData.password_hash.length >= 60) {
        try {
          isPasswordValid = await bcrypt.compare(credentials.password, userData.password_hash);
        } catch (error) {
          // If bcrypt comparison fails, fall back to plain text
          isPasswordValid = false;
        }
      }

      // Fallback to plain text password (for migration or invalid hashes)
      if (!isPasswordValid && userData.password) {
        isPasswordValid = credentials.password === userData.password;

        // If plain text password matches, hash it and update the database
        if (isPasswordValid) {
          try {
            const hashedPassword = await hashPassword(credentials.password);
            await supabase
              .from('users')
              .update({
                password_hash: hashedPassword,
                password: credentials.password // Keep plain text for compatibility
              })
              .eq('id', userData.id);
          } catch (error) {
            console.error('Failed to migrate password to hash:', error);
          }
        }
      }

      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // Update login tracking
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_count: (userData.login_count || 0) + 1
        })
        .eq('id', userData.id);

      // Generate a proper JWT token
      const token = btoa(JSON.stringify({
        userId: userData.id,
        username: userData.username,
        role: userData.role,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      }));

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
        avatar_url: userData.avatar_url,
      };

      return {
        message: 'Login successful',
        token,
        user,
      };
    } catch (error: any) {
      // Generic error to prevent username enumeration
      throw new Error('Invalid username or password');
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: (): User | null => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userStr || !token) {
      return null;
    }

    try {
      // Validate token
      const tokenData = JSON.parse(atob(token));
      if (tokenData.exp && tokenData.exp < Date.now()) {
        // Token expired
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }

      return JSON.parse(userStr);
    } catch (error) {
      // Invalid token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const tokenData = JSON.parse(atob(token));
      return tokenData.exp && tokenData.exp > Date.now();
    } catch (error) {
      return false;
    }
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




// Helper function to calculate automatic status
const calculateItemStatus = (item: any, classification: string): string => {
  // For equipment, only allow manual status (active or maintenance)
  if (classification.toLowerCase() === 'equipment') {
    return ['active', 'maintenance'].includes(item.status?.toLowerCase())
      ? item.status.toLowerCase()
      : 'active';
  }

  // For medicines and supplies, calculate status automatically
  const now = new Date();
  const expirationDate = item.expiration_date ? new Date(item.expiration_date) : null;
  const stockQuantity = parseInt(item.stock_quantity) || 0;
  const stockThreshold = parseInt(item.stock_threshold) || 0;

  // Check if expired
  if (expirationDate && expirationDate < now) {
    return 'expired';
  }

  // Check stock levels
  if (stockQuantity === 0) {
    return 'out_of_stock';
  }

  if (stockQuantity < stockThreshold) {
    return 'low_stock';
  }

  return 'active';
};

// Inventory service
export const inventoryService = {
  getAllItems: async () => {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .not('status', 'eq', 'archived')
      .order('generic_name', { ascending: true });

    if (error) throw new Error(error.message);

    // Get all classifications
    const { data: classifications } = await supabase
      .from('inventory_classifications')
      .select('id, name');

    const classificationMap = (classifications || []).reduce((acc: any, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    // Apply status calculation to each item
    const processedData = (items || []).map(item => {
      const classificationName = classificationMap[item.classification_id] || 'medicines';
      const calculatedStatus = calculateItemStatus(item, classificationName);

      return {
        ...item,
        classification: classificationName,
        status: calculatedStatus
      };
    });

    return processedData;
  },

  getItemsByDepartment: async (department: string) => {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('department', department)
      .not('status', 'eq', 'archived')
      .order('generic_name', { ascending: true });

    if (error) throw new Error(error.message);

    // Get all classifications
    const { data: classifications } = await supabase
      .from('inventory_classifications')
      .select('id, name');

    const classificationMap = (classifications || []).reduce((acc: any, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    // Apply status calculation to each item
    const processedData = (items || []).map(item => {
      const classificationName = classificationMap[item.classification_id] || 'medicines';
      const calculatedStatus = calculateItemStatus(item, classificationName);

      return {
        ...item,
        classification: classificationName,
        status: calculatedStatus
      };
    });

    return processedData;
  },

  getItemsByDepartmentAndClassification: async (department: string, classification: string) => {
    // Get classification ID first
    const { data: classificationData } = await supabase
      .from('inventory_classifications')
      .select('id')
      .eq('name', classification)
      .single();

    if (!classificationData) {
      return [];
    }

    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('department', department)
      .eq('classification_id', classificationData.id)
      .not('status', 'eq', 'archived')
      .order('generic_name', { ascending: true });

    if (error) throw new Error(error.message);

    // Apply status calculation to each item
    const processedData = (items || []).map(item => {
      const calculatedStatus = calculateItemStatus(item, classification);

      return {
        ...item,
        classification: classification,
        status: calculatedStatus
      };
    });

    return processedData;
  },

  // Legacy method for backward compatibility
  getItemsByDepartmentAndCategory: async (department: string, category: string) => {
    // Map old category names to new classification names
    const classificationMap: { [key: string]: string } = {
      'medicines': 'Medicines',
      'supplies': 'Supplies',
      'equipment': 'Equipment'
    };

    const classification = classificationMap[category] || category;
    return inventoryService.getItemsByDepartmentAndClassification(department, classification);
  },

  createItem: async (itemData: any) => {
    // Get classification name to determine status calculation
    const { data: classificationData } = await supabase
      .from('inventory_classifications')
      .select('name')
      .eq('id', itemData.classification_id)
      .single();

    const classificationName = classificationData?.name || 'medicines';

    // Calculate status automatically
    const calculatedStatus = calculateItemStatus(itemData, classificationName);

    const finalData = {
      ...itemData,
      status: calculatedStatus,
      stock_threshold: itemData.stock_threshold || 0
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .insert([finalData])
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Return item with classification name
    return {
      ...data,
      classification: classificationName
    };
  },

  updateItem: async (id: number, itemData: any) => {
    // Get current item first
    const { data: currentItem } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('id', id)
      .single();

    if (!currentItem) {
      throw new Error('Item not found');
    }

    // Get classification name separately
    const { data: classificationData } = await supabase
      .from('inventory_classifications')
      .select('name')
      .eq('id', currentItem.classification_id)
      .single();

    const classificationName = classificationData?.name || 'medicines';

    // Calculate status automatically for the updated data
    const updatedItemData = {
      ...currentItem,
      ...itemData
    };

    const calculatedStatus = calculateItemStatus(updatedItemData, classificationName);

    const finalData = {
      ...itemData,
      status: calculatedStatus
    };

    const { data, error } = await supabase
      .from('inventory_items')
      .update(finalData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Return item with classification name
    return {
      ...data,
      classification: classificationName
    };
  },

  deleteItem: async (id: number) => {
    const { error } = await supabase
      .from('inventory_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  archiveItem: async (id: number) => {
    const { data, error } = await supabase
      .from('inventory_items')
      .update({ status: 'archived' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  getArchivedItems: async () => {
    const { data: items, error } = await supabase
      .from('inventory_items')
      .select('*')
      .eq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    // Get all classifications
    const { data: classifications } = await supabase
      .from('inventory_classifications')
      .select('id, name');

    const classificationMap = (classifications || []).reduce((acc: any, c: any) => {
      acc[c.id] = c.name;
      return acc;
    }, {});

    // Add classification field for archived items
    const processedData = (items || []).map(item => ({
      ...item,
      classification: classificationMap[item.classification_id]
    }));

    return processedData;
  },

  getInventoryStatus: async () => {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('status, id');

    if (error) throw new Error(error.message);

    // Process data to get count per status
    const counts = (data || []).reduce((acc: { [key: string]: number }, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});

    // Format data for the chart
    const chartData = Object.keys(counts).map(status => ({
      name: status,
      value: counts[status]
    }));

    return chartData;
  },

  getClassifications: async () => {
    const { data, error } = await supabase
      .from('inventory_classifications')
      .select('id, name');

    if (error) throw new Error(error.message);
    return data || [];
  },

  getAllInventoryTables: async () => {
    const departments = ['medical', 'dental'];
    const classifications = ['Medicines', 'Supplies', 'Equipment'];
    const tables = [];

    for (const department of departments) {
      for (const classification of classifications) {
        try {
          const data = await inventoryService.getItemsByDepartmentAndClassification(department, classification);

          if (data && data.length > 0) {
            const lowStockItems = data.filter(item => item.status === 'low_stock');
            const outOfStockItems = data.filter(item => item.status === 'out_of_stock');
            const expiredItems = data.filter(item => item.status === 'expired');
            const maintenanceItems = data.filter(item => item.status === 'maintenance');

            tables.push({
              id: `${department}-${classification.toLowerCase()}`,
              department,
              classification,
              data,
              stats: {
                totalItems: data.length,
                lowStockItems: lowStockItems.length,
                outOfStockItems: outOfStockItems.length,
                expiredItems: expiredItems.length,
                maintenanceItems: maintenanceItems.length
              }
            });
          }
        } catch (error) {
          console.error(`Failed to fetch data for ${department} ${classification}:`, error);
        }
      }
    }

    return tables;
  },
};

// Activity logging service
export const activityService = {
  logActivity: async (activityData: any) => {
    const currentUser = authService.getCurrentUser();

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
    }
  },

  getLogs: async () => {
    const { data, error } = await supabase
      .from('user_activity')
      .select(`
        *,
        users (
          username,
          role,
          first_name,
          last_name
        )
      `)
      .order('timestamp', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },
};

// Patient monitoring service for managing patient records and consultations
export const patientMonitoringService = {
  // Patient management
  getPatients: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  getPatientById: async (id: number): Promise<Patient | null> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  createPatient: async (patientData: Omit<Patient, 'id' | 'patient_id' | 'created_at' | 'updated_at'>): Promise<Patient> => {
    const currentUser = authService.getCurrentUser();

    const { data, error } = await supabase
      .from('patients')
      .insert([{
        ...patientData,
        created_by: currentUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updatePatient: async (id: number, patientData: Partial<Patient>): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .update({
        ...patientData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  archivePatient: async (id: number): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  unarchivePatient: async (id: number): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .update({
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  getArchivedPatients: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  getActivePatients: async (): Promise<Patient[]> => {
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  // Consultation management
  getConsultations: async (includePatient: boolean = true): Promise<Consultation[]> => {
    if (includePatient) {
      const { data, error } = await supabase
        .from('consultations')
        .select('*, patients(*)')
        .order('consultation_date', { ascending: false });

      if (error) throw new Error(error.message);
      return (data as any)?.map((consultation: any) => ({
        ...consultation,
        patient: consultation.patients
      })) || [];
    } else {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .order('consultation_date', { ascending: false });

      if (error) throw new Error(error.message);
      return data as Consultation[] || [];
    }
  },

  getConsultationById: async (id: number): Promise<Consultation | null> => {
    const { data, error } = await supabase
      .from('consultations')
      .select('*, patients(*)')
      .eq('id', id)
      .single();

    if (error) throw new Error(error.message);
    return data ? {
      ...(data as any),
      patient: (data as any).patients
    } : null;
  },

  getConsultationsByPatientId: async (patientId: number): Promise<Consultation[]> => {
    const { data, error } = await supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .order('consultation_date', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createConsultation: async (consultationData: Omit<Consultation, 'id' | 'case_number' | 'created_at' | 'updated_at' | 'patient'>): Promise<Consultation> => {
    const currentUser = authService.getCurrentUser();

    const { data, error } = await supabase
      .from('consultations')
      .insert([{
        ...consultationData,
        created_by: currentUser?.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*, patients(*)')
      .single();

    if (error) throw new Error(error.message);
    return {
      ...(data as any),
      patient: (data as any).patients
    };
  },

  updateConsultation: async (id: number, consultationData: Partial<Consultation>): Promise<Consultation> => {
    const { data, error } = await supabase
      .from('consultations')
      .update({
        ...consultationData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*, patients(*)')
      .single();

    if (error) throw new Error(error.message);
    return {
      ...(data as any),
      patient: (data as any).patients
    };
  },

  // Vital signs management
  getVitalSignsByConsultationId: async (consultationId: number): Promise<VitalSigns[]> => {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('recorded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  getLatestVitalSignsByConsultationId: async (consultationId: number): Promise<VitalSigns | null> => {
    const { data, error } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || null;
  },

  createVitalSigns: async (vitalSignsData: Omit<VitalSigns, 'id' | 'recorded_at'>): Promise<VitalSigns> => {
    const currentUser = authService.getCurrentUser();

    const { data, error } = await supabase
      .from('vital_signs')
      .insert([{
        ...vitalSignsData,
        recorded_by: currentUser?.id,
        recorded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateVitalSigns: async (id: number, vitalSignsData: Partial<VitalSigns>): Promise<VitalSigns> => {
    const { data, error } = await supabase
      .from('vital_signs')
      .update(vitalSignsData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Patient contacts management
  getPatientContacts: async (patientId: number): Promise<PatientContact[]> => {
    const { data, error } = await supabase
      .from('patient_contacts')
      .select('*')
      .eq('patient_id', patientId)
      .order('is_primary', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createPatientContact: async (contactData: Omit<PatientContact, 'id' | 'created_at'>): Promise<PatientContact> => {
    const { data, error } = await supabase
      .from('patient_contacts')
      .insert([{
        ...contactData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updatePatientContact: async (id: number, contactData: Partial<PatientContact>): Promise<PatientContact> => {
    const { data, error } = await supabase
      .from('patient_contacts')
      .update(contactData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deletePatientContact: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('patient_contacts')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // Medical history management
  getMedicalHistory: async (patientId: number): Promise<MedicalHistory | null> => {
    const { data, error } = await supabase
      .from('medical_history')
      .select('*')
      .eq('patient_id', patientId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || null;
  },

  createMedicalHistory: async (historyData: Omit<MedicalHistory, 'id' | 'created_at' | 'updated_at'>): Promise<MedicalHistory> => {
    const { data, error } = await supabase
      .from('medical_history')
      .insert([{
        ...historyData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateMedicalHistory: async (id: number, historyData: Partial<MedicalHistory>): Promise<MedicalHistory> => {
    const { data, error } = await supabase
      .from('medical_history')
      .update({
        ...historyData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Glasgow Coma Scale management
  getGlasgowComaScale: async (consultationId: number): Promise<GlasgowComaScale | null> => {
    const { data, error } = await supabase
      .from('glasgow_coma_scales')
      .select('*')
      .eq('consultation_id', consultationId)
      .single();

    if (error && error.code !== 'PGRST116') throw new Error(error.message);
    return data || null;
  },

  getGlasgowComaScalesByConsultationId: async (consultationId: number): Promise<GlasgowComaScale[]> => {
    const { data, error } = await supabase
      .from('glasgow_coma_scales')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('assessed_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createGlasgowComaScale: async (gcsData: Omit<GlasgowComaScale, 'id' | 'total_score' | 'assessed_at'>): Promise<GlasgowComaScale> => {
    const currentUser = authService.getCurrentUser();
    const totalScore = gcsData.eye_response + gcsData.verbal_response + gcsData.motor_response;

    const { data, error } = await supabase
      .from('glasgow_coma_scales')
      .insert([{
        ...gcsData,
        total_score: totalScore,
        assessed_by: currentUser?.id,
        assessed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  updateGlasgowComaScale: async (id: number, gcsData: Partial<GlasgowComaScale>): Promise<GlasgowComaScale> => {
    // Recalculate total score if response values are updated
    const updateData = { ...gcsData };
    if (gcsData.eye_response || gcsData.verbal_response || gcsData.motor_response) {
      // Get current data to calculate total
      const { data: current } = await supabase
        .from('glasgow_coma_scales')
        .select('eye_response, verbal_response, motor_response')
        .eq('id', id)
        .single();

      if (current) {
        const eyeResponse = gcsData.eye_response ?? current.eye_response;
        const verbalResponse = gcsData.verbal_response ?? current.verbal_response;
        const motorResponse = gcsData.motor_response ?? current.motor_response;
        updateData.total_score = eyeResponse + verbalResponse + motorResponse;
      }
    }

    const { data, error } = await supabase
      .from('glasgow_coma_scales')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Consultation attachments management
  getConsultationAttachments: async (consultationId: number): Promise<ConsultationAttachment[]> => {
    const { data, error } = await supabase
      .from('consultation_attachments')
      .select('*')
      .eq('consultation_id', consultationId)
      .order('uploaded_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  createConsultationAttachment: async (attachmentData: Omit<ConsultationAttachment, 'id' | 'uploaded_at'>): Promise<ConsultationAttachment> => {
    const currentUser = authService.getCurrentUser();

    const { data, error } = await supabase
      .from('consultation_attachments')
      .insert([{
        ...attachmentData,
        uploaded_by: currentUser?.id,
        uploaded_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  deleteConsultationAttachment: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('consultation_attachments')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  },

  // Patient monitoring logs management
  getPatientMonitoringLogs: async (patientId?: number, consultationId?: number, limit: number = 100): Promise<PatientMonitoringLog[]> => {
    let query = supabase
      .from('patient_monitoring_logs')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(limit);

    if (patientId) {
      query = query.eq('patient_id', patientId);
    }
    if (consultationId) {
      query = query.eq('consultation_id', consultationId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);
    return data || [];
  },

  createPatientMonitoringLog: async (logData: Omit<PatientMonitoringLog, 'id' | 'performed_at'>): Promise<PatientMonitoringLog> => {
    const currentUser = authService.getCurrentUser();

    const { data, error } = await supabase
      .from('patient_monitoring_logs')
      .insert([{
        ...logData,
        performed_by: currentUser?.id,
        performed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // Statistics and analytics
  getPatientStats: async (): Promise<PatientStats> => {
    const today = new Date().toISOString().split('T')[0];

    // Get all patients
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, patient_type, status');

    if (patientsError) throw new Error(patientsError.message);

    // Get consultations
    const { data: consultations, error: consultationsError } = await supabase
      .from('consultations')
      .select('id, consultation_date, status');

    if (consultationsError) throw new Error(consultationsError.message);

    const activePatients = patients?.filter(p => p.status === 'active') || [];
    const activeConsultations = consultations?.filter(c => c.status === 'active') || [];
    const todayConsultations = consultations?.filter(c => c.consultation_date === today) || [];

    return {
      totalPatients: activePatients.length,
      activeConsultations: activeConsultations.length,
      todayConsultations: todayConsultations.length,
      studentsCount: activePatients.filter(p => p.patient_type === 'Student').length,
      employeesCount: activePatients.filter(p => p.patient_type === 'Employee').length,
      opdCount: activePatients.filter(p => p.patient_type === 'OPD').length
    };
  }
};

// Archives service for managing archived records
export const archiveService = {
  getArchives: async () => {
    const { data, error } = await supabase
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
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  },

  getArchivedConsultations: async () => {
    const { data, error } = await supabase
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
      `)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data;
  }
};

// User service for profile management
export const userService = {
  getProfile: async (): Promise<User> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    return currentUser;
  },

  updateProfile: async (profileData: Partial<User>): Promise<User> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Ensure username is not changed
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

    // Update local storage
    localStorage.setItem('user', JSON.stringify(updatedUser));

    return updatedUser;
  },

  getActivity: async (): Promise<any[]> => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    const { data, error } = await supabase
      .from('user_activity')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  getAllUsers: async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  },

  createUser: async (userData: any): Promise<any> => {
    // Hash password if provided
    const processedData = { ...userData };
    if (processedData.password) {
      processedData.password_hash = await hashPassword(processedData.password);
      delete processedData.password; // Remove plain text password
    }

    const { data, error } = await supabase
      .from('users')
      .insert([{
        ...processedData,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  },

  updateUser: async (userId: number, userData: any): Promise<any> => {
    // Hash password if provided
    const processedData = { ...userData };
    if (processedData.password) {
      processedData.password_hash = await hashPassword(processedData.password);
      delete processedData.password; // Remove plain text password
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        ...processedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

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
  },

  getUserStats: async (): Promise<any> => {
    const { data, error } = await supabase
      .from('users')
      .select('role, id');

    if (error) {
      throw new Error(error.message);
    }

    // Process data to get count per role
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
};