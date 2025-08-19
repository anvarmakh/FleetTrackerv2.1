import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '@/lib/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationRole?: string;
  systemRole?: string;
  tenantId?: string;
  companyId?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, tenantId: string) => Promise<void>;
  adminLogin: (adminKey: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: User) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  adminLogin: async () => {},
  logout: async () => {},
  updateUser: () => {},
  isAuthenticated: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to ensure user data is properly typed
  const normalizeUserData = (userData: Record<string, unknown>): User => {
    return {
      id: (userData.id || '') as string,
      email: (userData.email || '') as string,
      firstName: (userData.firstName || '') as string,
      lastName: (userData.lastName || '') as string,
      organizationRole: (userData.organizationRole || '') as string,
      systemRole: (userData.systemRole || '') as string,
      tenantId: (userData.tenantId || '') as string,
      companyId: (userData.companyId || '') as string,
    };
  };

  const checkAuthStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        // Check if this is an admin user by looking at the token
        const userData = localStorage.getItem('userData');
        if (userData) {
          try {
            const user = JSON.parse(userData);
            const normalizedUser = normalizeUserData(user);
            setUser(normalizedUser);
          } catch (error) {
            console.error('Failed to parse user data:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
          }
        } else {
          // For regular users, check auth with backend
          try {
            const response = await authAPI.checkAuth();
            // User data loaded successfully
            const user = response.data.user;
            if (user) {
              localStorage.setItem('userData', JSON.stringify(user));
              setUser(user);
            } else {
                          // Clear invalid data
            localStorage.removeItem('authToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userData');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      // Clear invalid data on any error
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  const login = async (email: string, password: string, tenantId: string) => {
    const response = await authAPI.login(email, password, tenantId);
    const { accessToken, refreshToken, user } = response.data;
    
    if (!accessToken || !user) {
      throw new Error('Invalid login response');
    }
    
    // Store tokens and user data
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(user));
    setUser(user);
  };

  const adminLogin = async (adminKey: string) => {
    const response = await authAPI.adminLogin(adminKey);
    const { accessToken, refreshToken, user } = response.data;
    
    if (!accessToken || !user) {
      throw new Error('Invalid admin login response');
    }
    
    // Store tokens and user data
    localStorage.setItem('authToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('userData', JSON.stringify(user));
    setUser(user);
  };

  const logout = async () => {
    try {
      // Call backend logout to revoke tokens
      await authAPI.logout();
    } catch (error) {
      // Even if logout API fails, we still want to clear local storage
      console.error('Logout API call failed:', error);
    } finally {
      // Always clear local storage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      setUser(null);
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
    localStorage.setItem('userData', JSON.stringify(userData));
  };

  const value = {
    user,
    loading,
    login,
    adminLogin,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  return context;
};
