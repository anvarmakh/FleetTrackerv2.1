export interface Trailer {
  id: string;
  unitNumber: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  status: string;
  gpsStatus: string;
  lastGpsUpdate?: string;
  lastSync?: string;
  lastAnnualInspection?: string;
  nextAnnualInspectionDue?: string;
  lastMidtripInspection?: string;
  nextMidtripInspectionDue?: string;
  lastBrakeInspection?: string;
  nextBrakeInspectionDue?: string;
  tireStatus?: string;
  lastTireService?: string;
  companyId?: string;
  companyName?: string;
  companyColor?: string;
  manualLocationOverride?: boolean;
  manualLocationNotes?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  lastAddress?: string;
  maintenance?: {
    lastAnnualInspection?: string;
    lastMidtripInspection?: string;
    alertCount?: number;
  };
}

export interface Stats {
  totalTrailers: number;
  activeTrailers: number;
  inactiveTrailers: number;
  maintenanceAlerts: number;
  nonCompanyOwned: number;
}

export interface RecentNote {
  id: string;
  title?: string;
  content: string;
  category: 'general' | 'maintenance' | 'damage' | 'repair' | 'inspection';
  createdAt: string;
}

export interface CustomLocation {
  id: string;
  name: string;
  type?: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  color?: string;
  iconName?: string;
  icon_name?: string;
  isShared?: boolean;
  is_shared?: boolean;
  notes?: string;
  trailerCount?: number;
}

export interface TrailerFilterState {
  status: string;
  company: string;
  gpsStatus: string;
  maintenance: string;
}
