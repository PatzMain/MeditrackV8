import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL!;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database types for TypeScript
export interface User {
  id: number;
  username: string;
  password: string;
  role: 'admin' | 'superadmin';
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  license_number?: string;
  specialization?: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: number;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  address?: string;
  emergency_contact?: string;
  blood_type?: string;
  allergies?: string;
  medical_history?: string;
  current_medications?: string;
  created_at: string;
  updated_at: string;
}

export interface Consultation {
  id: number;
  patient_id: number;
  doctor_id: number;
  consultation_date: string;
  symptoms: string;
  diagnosis?: string;
  treatment_plan?: string;
  notes?: string;
  vital_signs?: any;
  created_at: string;
  updated_at: string;
}

export interface MedicalRecord {
  id: number;
  patient_id: number;
  consultation_id?: number;
  record_type: 'lab_result' | 'prescription' | 'imaging' | 'procedure' | 'note';
  title: string;
  description: string;
  file_url?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface InventoryItem {
  id: number;
  name: string;
  category: 'medicine' | 'supply' | 'equipment';
  description?: string;
  quantity: number;
  unit: string;
  price: number;
  supplier?: string;
  expiry_date?: string;
  batch_number?: string;
  location?: string;
  minimum_stock: number;
  status: 'available' | 'low_stock' | 'expired' | 'out_of_stock';
  created_at: string;
  updated_at: string;
}

export interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  category?: string;
  description?: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  severity: 'info' | 'warning' | 'error';
  details?: any;
}