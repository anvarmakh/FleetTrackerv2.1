import axios from 'axios';

// Use relative URL in production, localhost in development
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.MODE === 'production' ? '' : 'http://localhost:3000');

// TypeScript interfaces for API data
export interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationRole: string;
  tenantId: string;
  companyId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyData {
  id: string;
  name: string;
  type?: string;
  dotNumber?: string;
  mcNumber?: string;
  color?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrailerData {
  id: string;
  unitNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  status: string;
  gpsStatus: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  lastGpsUpdate?: string;
  lastSync?: string;
  companyId?: string;
  companyName?: string;
  companyColor?: string;
}

export interface NoteData {
  id: string;
  title?: string;
  content: string;
  category: 'general' | 'maintenance' | 'damage' | 'repair' | 'inspection';
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceInspectionData {
  id: string;
  trailerId: string;
  type: 'annual' | 'midtrip' | 'brake';
  date: string;
  dueDate?: string;
  status: string;
}

export interface TenantData {
  id: string;
  name: string;
  status: string;
  userCount: number;
  companyCount: number;
  trailerCount: number;
  providerCount: number;
  createdAt: string;
}

export interface TrailerParams {
  unitNumber?: string;
  status?: string;
  companyId?: string;
  gpsStatus?: string;
}

export interface MaintenanceParams {
  trailerId?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export interface NoteFilters {
  trailerId?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant ID
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    
    // Add tenant ID if available
    try {
      const user = userData ? JSON.parse(userData) : null;
      if (user?.tenantId) {
        config.headers['X-Tenant-ID'] = user.tenantId;
      }
    } catch (error) {
      console.error('Error parsing user data for tenant ID:', error);
    }
  }
  return config;
});

// Response interceptor to handle auth errors and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If token expired, try to refresh it (but prevent recursion)
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/refresh')) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // Use fetch directly to avoid recursion
          const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken }),
          });

          if (!refreshResponse.ok) {
            throw new Error('Refresh failed');
          }

          const data = await refreshResponse.json();
          const { accessToken, refreshToken: newRefreshToken } = data;
          
          // Update stored tokens
          localStorage.setItem('authToken', accessToken);
          localStorage.setItem('refreshToken', newRefreshToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear auth and redirect
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    // For other auth errors
    if (error.response?.status === 401 || 
        (error.response?.status === 403 && error.response?.data?.error?.includes('token'))) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { api };

// API functions with proper typing
export const authAPI = {
  login: (email: string, password: string, tenantId: string) =>
    api.post('/api/auth/login', { email, password, tenantId }),
  register: (userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>) =>
    api.post('/api/auth/register', userData),
  checkAuth: () =>
    api.get('/api/auth/check-auth'),
  adminLogin: (adminKey: string) =>
    api.post('/api/auth/admin-login', { adminKey }),
  logout: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/api/auth/logout', { refreshToken });
  },
  refreshToken: () => {
    const refreshToken = localStorage.getItem('refreshToken');
    return api.post('/api/auth/refresh', { refreshToken });
  },
  forgotPassword: (email: string, tenantId?: string) =>
    api.post('/api/auth/forgot-password', { email, tenantId }),
  validateResetToken: (token: string) =>
    api.get('/api/auth/validate-reset-token', { params: { token } }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/api/auth/reset-password', { token, newPassword }),
};

export const userAPI = {
  getProfile: () => api.get<UserData>('/api/user/profile'),
  updateProfile: (data: Partial<UserData>) => api.put<UserData>('/api/user/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/api/user/change-password', data),
  getUsers: () => api.get<UserData[]>('/api/users'),
  getUser: (userId: string) => api.get<UserData>(`/api/users/${userId}`),
  createUser: (userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>) => api.post<UserData>('/api/users', userData),
  updateUser: (userId: string, userData: Partial<UserData>) => api.put<UserData>(`/api/users/${userId}`, userData),
  deleteUser: (userId: string) => api.delete(`/api/users/${userId}`),
  deactivateUser: (userId: string) => api.patch(`/api/users/${userId}/deactivate`),
  activateUser: (userId: string) => api.patch(`/api/users/${userId}/activate`),
  getPermissions: () => api.get('/api/users/permissions'),
  getPermissionStructure: () => api.get('/api/users/permission-structure'),
  getUserPermissions: (userId: string) => api.get(`/api/users/${userId}/permissions`),
  updateUserPermissions: (userId: string, permissions: { blockPermissions: string[], granularPermissions: string[] }) => 
    api.put(`/api/users/${userId}/permissions`, permissions),
  getRoles: () => api.get('/api/users/roles'),
  createRole: (roleData: { displayName: string; description?: string; permissions: string[] }) => api.post('/api/users/roles', roleData),
  updateRole: (roleName: string, roleData: { displayName?: string; description?: string; permissions?: string[] }) => api.put(`/api/users/roles/${roleName}`, roleData),
  deleteRole: (roleName: string) => api.delete(`/api/users/roles/${roleName}`),
};

export const companyAPI = {
  getCompanies: () => api.get<CompanyData[]>('/api/companies'),
  getCompaniesForFilter: () => api.get<CompanyData[]>('/api/companies/filter'),
  getUserCompanies: () => api.get<CompanyData[]>('/api/companies'),
  createCompany: (data: Omit<CompanyData, 'id' | 'createdAt' | 'updatedAt'>) => api.post<CompanyData>('/api/companies', data),
  updateCompany: (id: string, data: Partial<CompanyData>) => api.put<CompanyData>(`/api/companies/${id}`, data),
  deleteCompany: (id: string) => api.delete(`/api/companies/${id}`),
  getActive: () => api.get<CompanyData[]>('/api/companies/active'),
  setActive: (id: string) => api.post(`/api/companies/${id}/activate`),
};

export const trailerAPI = {
  getTrailers: (params?: TrailerParams) => api.get<TrailerData[]>('/api/trailers', { params }),
  getTrailer: (id: string) => api.get<TrailerData>(`/api/trailers/${id}`),
  createTrailer: (data: Omit<TrailerData, 'id'>) => api.post<TrailerData>('/api/trailers', data),
  updateTrailer: (id: string, data: Partial<TrailerData>) => api.put<TrailerData>(`/api/trailers/${id}`, data),
  deleteTrailer: (id: string) => api.delete(`/api/trailers/${id}`),
  getStats: () => api.get('/api/stats'),
  getMaintenance: (params?: MaintenanceParams) => api.get<MaintenanceInspectionData[]>('/api/trailers/maintenance', { params }),
  updateLocation: (trailerId: string, locationData: any) => api.put(`/api/trailers/${trailerId}/location`, locationData),
};

export const providerAPI = {
  getProviders: () => api.get('/api/providers'),
  createProvider: (companyId: string, data: { name: string; type: string; description?: string; credentials: Record<string, string> }) => api.post(`/api/providers/${companyId}`, data),
  updateProvider: (id: string, data: Partial<{ name: string; type: string; description?: string; credentials: Record<string, string> }>) => api.put(`/api/providers/${id}`, data),
  deleteProvider: (id: string, deleteRelatedTrailers?: boolean) => api.delete(`/api/providers/${id}`, { 
    params: { deleteRelatedTrailers: deleteRelatedTrailers ? 'true' : 'false' } 
  }),
  syncProvider: (id: string) => api.post(`/api/providers/${id}/sync`),
  testProvider: (id: string) => api.post(`/api/providers/${id}/test`),
};

export const trailerCustomLocationAPI = {
  getCustomLocations: () => api.get('/api/trailer-custom-locations'),
  createCustomLocation: (data: { 
    name: string; 
    type: string; 
    address?: string; 
    lat: number; 
    lng: number; 
    color?: string; 
    icon_name?: string; 
    is_shared?: boolean; 
  }) => api.post('/api/trailer-custom-locations', data),
  updateCustomLocation: (id: string, data: Partial<{ 
    name?: string; 
    type?: string; 
    address?: string; 
    lat?: number; 
    lng?: number; 
    color?: string; 
    icon_name?: string; 
    is_shared?: boolean; 
    notes?: string 
  }>) => api.put(`/api/trailer-custom-locations/${id}`, data),
  deleteCustomLocation: (id: string) => api.delete(`/api/trailer-custom-locations/${id}`),
};

export const systemNotesAPI = {
  getNotes: (entityType: string, entityId: string) => api.get<NoteData[]>(`/api/notes/${entityType}/${entityId}`),
  createNote: (entityType: string, entityId: string, data: Omit<NoteData, 'id' | 'createdAt' | 'updatedAt'>) => api.post<NoteData>(`/api/notes/${entityType}/${entityId}`, data),
  updateNote: (id: string, data: Partial<NoteData>) => api.put<NoteData>(`/api/notes/${id}`, data),
  deleteNote: (id: string) => api.delete(`/api/notes/${id}`),
  getRecentNotes: (limit?: number, filters?: { entityType?: string; category?: string }) => api.get<NoteData[]>(`/api/notes/recent/${limit || 10}`, { params: filters }),
  getUserNotes: (userId: string, filters?: { entityType?: string; category?: string; limit?: number }) => api.get<NoteData[]>(`/api/notes/user/${userId}`, { params: filters }),
};

export const trailerCustomCompaniesAPI = {
  getCustomCompanies: () => api.get<CompanyData[]>('/api/trailer-custom-companies'),
  createCustomCompany: (data: Omit<CompanyData, 'id' | 'createdAt' | 'updatedAt'>) => api.post<CompanyData>('/api/trailer-custom-companies', data),
  updateCustomCompany: (id: string, data: Partial<CompanyData>) => api.put<CompanyData>(`/api/trailer-custom-companies/${id}`, data),
  deleteCustomCompany: (id: string) => api.delete(`/api/trailer-custom-companies/${id}`),
};

export const maintenanceAPI = {
  getMaintenancePreferences: () => api.get('/api/maintenance/preferences'),
  updateMaintenancePreferences: (data: { annualInspectionInterval: number; midtripInspectionInterval: number; brakeInspectionInterval: number; annualAlertThreshold: number; midtripAlertThreshold: number; brakeAlertThreshold: number; enableMaintenanceAlerts: boolean; enableEmailNotifications: boolean; enablePushNotifications: boolean }) => api.put('/api/maintenance/preferences', data),
  getInspections: (params?: MaintenanceParams) => api.get<MaintenanceInspectionData[]>('/api/maintenance/inspections', { params }),
  createInspection: (data: Omit<MaintenanceInspectionData, 'id'>) => api.post<MaintenanceInspectionData>('/api/maintenance/inspections', data),
  updateInspection: (id: string, data: Partial<MaintenanceInspectionData>) => api.put<MaintenanceInspectionData>(`/api/maintenance/inspections/${id}`, data),
  deleteInspection: (id: string) => api.delete(`/api/maintenance/inspections/${id}`),
  calculateDates: (trailerId: string, options?: any) => api.post(`/api/maintenance/trailers/${trailerId}/calculate-dates`, { options }),
};

export const geocodingAPI = {
  geocodeAddress: (address: string) => api.get('/api/geocode', { params: { address } }),
  reverseGeocode: (latitude: number, longitude: number) => api.post('/api/geocode/reverse', { lat: latitude, lng: longitude }),
};

export const refreshAPI = {
  refreshLocations: () => api.post('/api/refresh/manual'),
  getStatus: () => api.get('/api/refresh/status'),
};

export const adminAPI = {
  getOverview: () => api.get('/api/admin/overview'),
  getTenants: () => api.get<TenantData[]>('/api/admin/tenants'),
  createTenant: (data: { tenantName: string; email: string; firstName: string; lastName: string; password: string; companyName: string; companyColor: string }) => api.post('/api/admin/tenants', data),
  deleteTenant: (tenantId: string) => api.delete(`/api/admin/tenants/${tenantId}`),
  activateTenant: (tenantId: string) => api.patch(`/api/admin/tenants/${tenantId}/activate`),
  deactivateTenant: (tenantId: string) => api.patch(`/api/admin/tenants/${tenantId}/deactivate`),
  getOrphanedUsers: () => api.get<UserData[]>('/api/admin/orphaned-users'),
  getLogs: () => api.get('/api/admin/logs'),
  getHealth: () => api.get('/api/admin/health'),
  getUsers: () => api.get<UserData[]>('/api/admin/users'),
  createUser: (data: { email: string; tenantId: string; organizationRole: string; firstName: string; lastName: string; password: string }) => api.post('/api/admin/users', data),
  deleteUser: (userId: string) => api.delete(`/api/admin/users/${userId}`),
  deactivateUser: (userId: string) => api.patch(`/api/admin/users/${userId}/deactivate`),
  activateUser: (userId: string) => api.patch(`/api/admin/users/${userId}/activate`),

  cleanupOrphanedUsers: () => api.post('/api/admin/cleanup-orphaned-users'),
  getPermissions: () => api.get<any>('/api/admin/permissions'),
  getUserPermissions: (userId: string) => api.get<any>(`/api/admin/users/${userId}/permissions`),
  updateUserPermissions: (userId: string, permissions: { blockPermissions: string[], granularPermissions: string[] }) => 
    api.put<any>(`/api/admin/users/${userId}/permissions`, permissions),
};