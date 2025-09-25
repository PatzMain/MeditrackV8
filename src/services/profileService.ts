import { supabase } from '../lib/supabase';
import { authService, User } from './supabaseService';
import bcrypt from 'bcryptjs';

// User Profile Interface - Based exactly on SQL schema from users sql.txt
export interface UserProfile extends User {
  id: number;
  username: string;
  role: 'admin' | 'superadmin';
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  position?: string;
  employee_id?: string;
  license_number?: string;
  specialization?: string;
  created_at?: string;
  updated_at?: string;
  avatar_url?: string;
  bio?: string;
  gender?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  last_login?: string;
  login_count?: number;
}

export interface PasswordChangeRequest {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

// Profile Service - Clean implementation based on SQL schema
export const profileService = {
  // Profile Management
  async getFullProfile(): Promise<UserProfile> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    try {
      // Get user data from the database with only the fields that exist in SQL schema
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          username,
          role,
          first_name,
          last_name,
          phone,
          department,
          position,
          employee_id,
          license_number,
          specialization,
          created_at,
          updated_at,
          avatar_url,
          bio,
          gender,
          emergency_contact_name,
          emergency_contact_phone,
          emergency_contact_relationship,
          last_login,
          login_count
        `)
        .eq('id', currentUser.id)
        .single();

      if (userError) {
        console.warn('Could not fetch user data from database:', userError);
        return currentUser as UserProfile;
      }

      return userData as UserProfile;
    } catch (error) {
      console.error('Error fetching full profile:', error);
      // Return the current user data as fallback
      return currentUser as UserProfile;
    }
  },

  async updateProfile(profileData: Partial<UserProfile>): Promise<UserProfile> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Only allow fields that exist in the database schema
    const allowedFields = [
      'first_name', 'last_name', 'phone', 'department', 'position',
      'employee_id', 'license_number', 'specialization', 'avatar_url',
      'bio', 'gender', 'emergency_contact_name', 'emergency_contact_phone',
      'emergency_contact_relationship'
    ];

    // Filter out any fields not in our schema and system fields
    const userData: any = {};
    allowedFields.forEach(field => {
      if (profileData[field as keyof UserProfile] !== undefined) {
        userData[field] = profileData[field as keyof UserProfile];
      }
    });

    // Update main user data
    const { error: userError } = await supabase
      .from('users')
      .update({
        ...userData,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (userError) {
      throw new Error(userError.message);
    }

    // Update local storage
    const fullProfile = await this.getFullProfile();
    localStorage.setItem('user', JSON.stringify(fullProfile));

    return fullProfile;
  },

  // Avatar Management
  async uploadAvatar(file: File): Promise<string> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // For now, create a mock avatar URL using a data URL since storage bucket might not be set up
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataUrl = e.target?.result as string;
          await this.updateProfile({ avatar_url: dataUrl });
          resolve(dataUrl);
        } catch (error: any) {
          reject(new Error(error.message || 'Failed to process avatar'));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  },

  async removeAvatar(): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    // Update profile to remove avatar URL
    await this.updateProfile({ avatar_url: undefined });
  },

  // Password Management
  async changePassword(passwordData: PasswordChangeRequest): Promise<void> {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('No authenticated user');
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      throw new Error('New passwords do not match');
    }

    if (passwordData.new_password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }

    // Get current user data to verify current password
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password, password_hash')
      .eq('id', currentUser.id)
      .single();

    if (fetchError || !userData) {
      throw new Error('Failed to verify current password');
    }

    // Verify current password
    let isCurrentPasswordValid = false;

    // Check if password_hash field exists and is a valid bcrypt hash
    if (userData.password_hash && userData.password_hash.startsWith('$2') && userData.password_hash.length >= 60) {
      try {
        isCurrentPasswordValid = await bcrypt.compare(passwordData.current_password, userData.password_hash);
      } catch (error) {
        // If bcrypt comparison fails, fall back to plain text
        isCurrentPasswordValid = false;
      }
    }

    // Fallback to plain text password (for migration or invalid hashes)
    if (!isCurrentPasswordValid && userData.password) {
      isCurrentPasswordValid = passwordData.current_password === userData.password;
    }

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const saltRounds = 12;
    const hashedNewPassword = await bcrypt.hash(passwordData.new_password, saltRounds);

    // Update password hash in the database
    const { error } = await supabase
      .from('users')
      .update({
        password_hash: hashedNewPassword,
        password: passwordData.new_password, // Keep plain text for compatibility (will be removed in future migration)
        updated_at: new Date().toISOString()
      })
      .eq('id', currentUser.id);

    if (error) {
      throw new Error(error.message);
    }
  }
};

export default profileService;