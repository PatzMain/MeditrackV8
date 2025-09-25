import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService, User, activityService } from '../services/supabaseService';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const userProfile = await authService.getCurrentUser();
        if (userProfile) {
          setUser(userProfile);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen to auth state changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const userProfile = await authService.getCurrentUser();
          if (userProfile) {
            setUser(userProfile);
          }
        } catch (error) {
          console.error('Failed to get user profile on sign in:', error);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await authService.login({ username, password });
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);

      // Log login activity
      await activityService.logActivity({
        action: 'login',
        category: 'authentication',
        description: `User ${username} logged in`,
        severity: 'info'
      });
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    const currentUser = user;
    try {
      // Log logout activity before clearing user data
      if (currentUser) {
        await activityService.logActivity({
          action: 'logout',
          category: 'authentication',
          description: `User ${currentUser.username} logged out`,
          severity: 'info'
        });
      }

      await authService.logout();
      setUser(null);
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};