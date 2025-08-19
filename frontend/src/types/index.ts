// ============================================================================
// CENTRALIZED TYPE DEFINITIONS
// ============================================================================

// User Types
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  organizationRole?: string;
  systemRole?: string;
  tenantId?: string;
  companyId?: string;
  companyName?: string;
  createdAt?: string;
  lastLogin?: string;
  isActive?: boolean;
  phone?: string;
  timezone?: string;
  language?: string;
}

export interface UserProfile extends User {
  phone: string;
  timezone: string;
  language: string;
}

export interface UserPermissions {
  [key: string]: boolean;
}

// Role Management Types
export interface Role {
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isCustom: boolean;
  canBeAssignedBy: string[];
}

export interface PermissionCategory {
  name: string;
  permissions: string[];
}

export interface NewUser {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: string;
  companyId: string;
  password: string;
}

export interface NewRole {
  displayName: string;
  description: string;
  permissions: string[];
}

// Company Types
export interface Company {
  id: string;
  name: string;
  type?: string;
  dotNumber?: string;
  mcNumber?: string;
  color?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  tenantId?: string;
}

export interface CustomCompany {
  id: string;
  name: string;
  tenantId: string;
  createdByUserId: string;
  createdAt: string;
  isCustom: boolean;
}

// Trailer Types
export interface Trailer {
  id: string;
  unitNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  license_plate?: string;
  status: string;
  gpsStatus: string;
  gps_status?: string;
  lastGpsUpdate?: string;
  last_gps_update?: string;
  lastSync?: string;
  last_sync?: string;
  lastAnnualInspection?: string;
  last_annual_inspection?: string;
  lastMidtripInspection?: string;
  last_midtrip_inspection?: string;
  tireStatus?: string;
  tire_status?: string;
  lastTireService?: string;
  last_tire_service?: string;
  nextMidtripInspectionDue?: string;
  next_midtrip_inspection_due?: string;
  companyId?: string;
  company_id?: string;
  companyName?: string;
  company_name?: string;
  companyColor?: string;
  company_color?: string;
  tenantId?: string;
  tenant_id?: string;
  manualLocationOverride?: boolean;
  manual_location_override?: boolean;
  manualLocationNotes?: string;
  manual_location_notes?: string;
  lastLatitude?: number;
  last_longitude?: number;
  lastLongitude?: number;
  last_latitude?: number;
  lastAddress?: string;
  last_address?: string;
  maintenance?: {
    lastAnnualInspection?: string;
    lastMidtripInspection?: string;
    alertCount?: number;
  };
}

// Provider Types
export interface Provider {
  id: string;
  name: string;
  type: string;
  status: string;
  last_sync?: string;
  lastSync?: string;
  trailer_count?: number;
  trailerCount?: number;
  error_message?: string;
  errorMessage?: string;
  description?: string;
  company_id?: string;
  companyId?: string;
  company_name?: string;
  companyName?: string;
}

export interface EditingProvider {
  id: string;
  name: string;
  type: string;
  description?: string;
  company_id?: string;
  apiKey?: string;
  username?: string;
  password?: string;
  nspireId?: string;
  apiToken?: string;
  apiUrl?: string;
}

// Tenant Types
export interface Tenant {
  tenantId: string;
  tenantName: string;
  status?: string;
  userCount: number;
  activeUserCount: number;
  companyCount: number;
  trailerCount: number;
  providerCount: number;
  lastActivity: string;
  createdAt: string;
  users: User[];
  companies: Company[];
  providers: Provider[];
}

// Note Types
export interface Note {
  id: string;
  title?: string;
  content: string;
  category: 'general' | 'maintenance' | 'damage' | 'repair' | 'inspection';
  createdAt: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface RecentNote extends Note {
  // Additional fields for recent notes display
}

// Location Types
export interface CustomLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  address?: string;
  notes?: string;
  trailerCount?: number;
  type?: string;
  color?: string;
  icon_name?: string;
  is_shared?: boolean;
  company_id?: string;
  user_id?: string;
  tenant_id?: string;
}

// Maintenance Types
export interface MaintenanceInspection {
  id: string;
  trailerId: string;
  type: 'annual' | 'midtrip' | 'brake';
  date: string;
  dueDate?: string;
  status: string;
}

export interface MaintenancePreferences {
  id?: string;
  tenant_id?: string;
  annual_inspection_interval: number;
  midtrip_inspection_interval: number;
  brake_inspection_interval: number;
  annual_alert_threshold: number;
  midtrip_alert_threshold: number;
  brake_alert_threshold: number;
  enable_maintenance_alerts: boolean;
  enable_email_notifications: boolean;
  enable_push_notifications: boolean;
  created_at?: string;
  updated_at?: string;
}

// Stats Types
export interface TrailerStats {
  totalTrailers: number;
  activeTrailers: number;
  inactiveTrailers: number;
  maintenanceAlerts: number;
  nonCompanyOwned: number;
}

export interface AdminOverview {
  totalTenants: number;
  totalUsers: number;
  totalCompanies: number;
  totalTrailers: number;
  systemStatus: string;
}

// System Types
export interface SystemLog {
  id: number;
  timestamp: string;
  level: string;
  message: string;
  tenant: string;
}

export interface SystemHealth {
  database: {
    status: string;
    latency?: number;
    error?: string;
  };
  server: {
    status: string;
    uptime: number;
    uptimeStatus: string;
    uptimeWarning?: string;
  };
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

// API Parameter Types
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

// Form Data Types
export interface TrailerFormData {
  unitNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  license_plate?: string;
  company_id?: string;
  status: string;
}

// UI Component Types
export interface IconComponent {
  (props: React.SVGProps<SVGSVGElement>): JSX.Element;
}

// Dialog/Modal Types
export interface DeleteDialogState {
  isOpen: boolean;
  item: any;
  type: string;
}

export interface ActivateDeactivateDialogState {
  isOpen: boolean;
  item: any;
  action: 'activate' | 'deactivate';
  type: string;
}

// Constants
export const COMPANY_TYPES = [
  { value: 'carrier', label: 'Carrier' },
  { value: 'broker', label: 'Broker' },
  { value: 'shipper', label: 'Shipper' },
  { value: 'logistics', label: 'Logistics' },
  { value: 'other', label: 'Other' }
] as const;

export const PROVIDER_TYPES = [
  { value: 'spireon', label: 'Spireon' },
  { value: 'skybitz', label: 'Skybitz' },
  { value: 'samsara', label: 'Samsara' }
] as const;

export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' }
] as const;

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' }
] as const;

export const TRAILER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'out_of_service', label: 'Out of Service' }
] as const;

export const GPS_STATUSES = [
  { value: 'connected', label: 'Connected' },
  { value: 'disconnected', label: 'Disconnected' },
  { value: 'error', label: 'Error' }
] as const;

// User Preferences Types
export interface UserPreferences {
  timezone: string;
  language: string;
  theme: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  display: {
    showTrailerCount: boolean;
    showLastSync: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
}

export const REFRESH_INTERVALS = [
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '300', label: '5 minutes' }
] as const;

export const PRESET_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'
] as const;
