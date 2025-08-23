import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Truck, 
  Calendar, 
  Hash, 
  MapPin, 
  Edit, 
  FileText, 
  Wrench, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  Building2,
  Navigation,
  Gauge,
  Settings,
  ExternalLink
} from 'lucide-react';
import { formatDateInTimezone, formatDateOnlyInTimezone } from '@/lib/utils';
import LocationEditModal from './LocationEditModal';
import TrailerEditModal from '@/pages/trailers/components/TrailerEditModal';
import NotesModal from './NotesModal';
import { maintenanceAPI } from '@/lib/api';

// Helper function to format addresses consistently
const formatAddress = (address: string | null | undefined): string => {
  if (!address || address.trim() === '') {
    return 'No location';
  }
  
  // Check if address is a JSON string and parse it
  if (address.startsWith('{') && address.endsWith('}')) {
    try {
      const parsed = JSON.parse(address);
      if (parsed.city && parsed.state) {
        return `${parsed.city}, ${parsed.state}`;
      }
      if (parsed.street && parsed.city && parsed.state) {
        return `${parsed.street}, ${parsed.city}, ${parsed.state}`;
      }
    } catch (e) {
      // If parsing fails, return the original address
    }
  }
  
  return address;
};

interface Trailer {
  id: string;
  unitNumber?: string;
  unit_number?: string;
  make?: string;
  model?: string;
  year?: number;
  vin?: string;
  plate?: string;
  status: string;
  gpsStatus?: string;
  gps_status?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  lastGpsUpdate?: string;
  last_gps_update?: string;
  lastAnnualInspection?: string;
  last_annual_inspection?: string;
  nextAnnualInspectionDue?: string;
  next_annual_inspection_due?: string;
  lastMidtripInspection?: string;
  last_midtrip_inspection?: string;
  nextMidtripInspectionDue?: string;
  next_midtrip_inspection_due?: string;
  lastBrakeInspection?: string;
  last_brake_inspection?: string;
  nextBrakeInspectionDue?: string;
  next_brake_inspection_due?: string;
  tireStatus?: string;
  tire_status?: string;
  lastTireService?: string;
  last_tire_service?: string;
  manualLocationOverride?: boolean;
  manual_location_override?: boolean;
  manualLocationNotes?: string;
  manual_location_notes?: string;
  lastLatitude?: number;
  last_latitude?: number;
  lastLongitude?: number;
  last_longitude?: number;
  lastAddress?: string;
  last_address?: string;
  locationSource?: string;
  location_source?: string;
  locationUpdatedAt?: string;
  location_updated_at?: string;
  companyId?: string;
  company_id?: string;
  companyName?: string;
  company_name?: string;
  companyColor?: string;
  company_color?: string;
  lastSync?: string;
  last_sync?: string;
}

interface VehicleInfoModalProps {
  trailer: Trailer | null;
  isOpen: boolean;
  onClose: () => void;
  onTrailerUpdated?: () => void;
}

const VehicleInfoModal: React.FC<VehicleInfoModalProps> = ({
  trailer,
  isOpen,
  onClose,
  onTrailerUpdated
}) => {
  const [locationEditOpen, setLocationEditOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [maintenancePreferences, setMaintenancePreferences] = useState<{
    annual_alert_threshold: number;
    midtrip_alert_threshold: number;
    brake_alert_threshold: number;
    enable_maintenance_alerts: boolean;
  } | null>(null);

  const handleLocationUpdated = () => {
    if (onTrailerUpdated) {
      onTrailerUpdated();
    }
  };

  // Load maintenance preferences
  useEffect(() => {
    const loadMaintenancePreferences = async () => {
      try {
        const response = await maintenanceAPI.getMaintenancePreferences();
        if (response.data && response.data.success) {
          setMaintenancePreferences(response.data.data);
        }
      } catch (error) {
        // Error loading maintenance preferences
        // Set default preferences if loading fails
        setMaintenancePreferences({
          annual_alert_threshold: 30,
          midtrip_alert_threshold: 14,
          brake_alert_threshold: 14,
          enable_maintenance_alerts: true
        });
      }
    };

    if (isOpen) {
      loadMaintenancePreferences();
    }
  }, [isOpen]);

  const handleTrailerUpdated = () => {
    if (onTrailerUpdated) {
      onTrailerUpdated();
    }
  };

  if (!trailer) return null;

  // Normalize trailer data to handle both camelCase and snake_case properties
  const normalizedTrailer = {
    ...trailer,
    unitNumber: trailer.unitNumber || trailer.unit_number,
    gpsStatus: trailer.gpsStatus || trailer.gps_status,
    lastGpsUpdate: trailer.lastGpsUpdate || trailer.last_gps_update,
    lastAnnualInspection: trailer.lastAnnualInspection || trailer.last_annual_inspection,
    nextAnnualInspectionDue: trailer.nextAnnualInspectionDue || trailer.next_annual_inspection_due,
    lastMidtripInspection: trailer.lastMidtripInspection || trailer.last_midtrip_inspection,
    nextMidtripInspectionDue: trailer.nextMidtripInspectionDue || trailer.next_midtrip_inspection_due,
    lastBrakeInspection: trailer.lastBrakeInspection || trailer.last_brake_inspection,
    nextBrakeInspectionDue: trailer.nextBrakeInspectionDue || trailer.next_brake_inspection_due,
    tireStatus: trailer.tireStatus || trailer.tire_status,
    lastTireService: trailer.lastTireService || trailer.last_tire_service,
    manualLocationOverride: trailer.manualLocationOverride || trailer.manual_location_override,
    manualLocationNotes: trailer.manualLocationNotes || trailer.manual_location_notes,
    lastLatitude: trailer.lastLatitude || trailer.last_latitude,
    lastLongitude: trailer.lastLongitude || trailer.last_longitude,
    lastAddress: trailer.lastAddress || trailer.last_address,
    locationSource: trailer.locationSource || trailer.location_source || 'gps',
    locationUpdatedAt: trailer.locationUpdatedAt || trailer.location_updated_at,
    companyName: trailer.companyName || trailer.company_name,
    companyColor: trailer.companyColor || trailer.company_color,
    lastSync: trailer.lastSync || trailer.last_sync,
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set';
    const userTimezone = localStorage.getItem('userTimezone') || 'America/Chicago';
    return formatDateOnlyInTimezone(dateString, userTimezone, true); // Show timezone indicator
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    const userTimezone = localStorage.getItem('userTimezone') || 'America/Chicago';
    return formatDateInTimezone(dateString, userTimezone, {}, true); // Show timezone indicator
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
        text: 'Available'
      },
      dispatched: {
        icon: <MapPin className="h-4 w-4" />,
        className: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        text: 'Dispatched'
      },
      maintenance: {
        icon: <Wrench className="h-4 w-4" />,
        className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        text: 'Maintenance'
      },
      out_of_service: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
        text: 'Out of Service'
      }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
      text: status.replace(/_/g, ' ').toUpperCase()
    };

    return (
      <Badge variant="outline" className={`flex items-center gap-1 px-3 py-1 ${config.className}`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getGpsStatusBadge = (gpsStatus: string) => {
    const gpsConfig = {
      connected: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
        text: 'Connected'
      },
      disconnected: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
        text: 'Disconnected'
      },
      unknown: {
        icon: <Clock className="h-4 w-4" />,
        className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
        text: 'Unknown'
      }
    };

    const config = gpsConfig[gpsStatus.toLowerCase() as keyof typeof gpsConfig] || {
      icon: <Clock className="h-4 w-4" />,
      className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
      text: 'Unknown'
    };

    return (
      <Badge variant="outline" className={`flex items-center gap-1 px-3 py-1 ${config.className}`}>
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getTireStatusBadge = (status?: string) => {
    const variants: Record<string, { className: string; text: string }> = {
      good: {
        className: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
        text: 'Good'
      },
      fair: {
        className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
        text: 'Fair'
      },
      poor: {
        className: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
        text: 'Poor'
      },
      unknown: {
        className: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-200 dark:border-gray-700',
        text: 'Unknown'
      }
    };

    const config = variants[status || 'unknown'] || variants.unknown;

    return (
      <Badge variant="outline" className={`px-3 py-1 ${config.className}`}>
        {config.text}
      </Badge>
    );
  };

  const getMaintenanceAlerts = () => {
    // If maintenance alerts are disabled, return empty array
    if (!maintenancePreferences?.enable_maintenance_alerts) {
      return [];
    }

    const alerts = [];
    const now = new Date();

    // Use preferences or default thresholds
    const annualThreshold = maintenancePreferences?.annual_alert_threshold || 30;
    const midtripThreshold = maintenancePreferences?.midtrip_alert_threshold || 14;
    const brakeThreshold = maintenancePreferences?.brake_alert_threshold || 14;

    if (normalizedTrailer.nextAnnualInspectionDue) {
      const nextAnnual = new Date(normalizedTrailer.nextAnnualInspectionDue);
      if (nextAnnual < now) {
        alerts.push({ type: 'Annual Inspection', due: nextAnnual, severity: 'high' });
      } else if (nextAnnual.getTime() - now.getTime() < annualThreshold * 24 * 60 * 60 * 1000) {
        alerts.push({ type: 'Annual Inspection', due: nextAnnual, severity: 'medium' });
      }
    }

    if (normalizedTrailer.nextMidtripInspectionDue) {
      const nextMidtrip = new Date(normalizedTrailer.nextMidtripInspectionDue);
      if (nextMidtrip < now) {
        alerts.push({ type: 'Midtrip Inspection', due: nextMidtrip, severity: 'high' });
      } else if (nextMidtrip.getTime() - now.getTime() < midtripThreshold * 24 * 60 * 60 * 1000) {
        alerts.push({ type: 'Midtrip Inspection', due: nextMidtrip, severity: 'medium' });
      }
    }

    if (normalizedTrailer.nextBrakeInspectionDue) {
      const nextBrake = new Date(normalizedTrailer.nextBrakeInspectionDue);
      if (nextBrake < now) {
        alerts.push({ type: 'Brake Inspection', due: nextBrake, severity: 'high' });
      } else if (nextBrake.getTime() - now.getTime() < brakeThreshold * 24 * 60 * 60 * 1000) {
        alerts.push({ type: 'Brake Inspection', due: nextBrake, severity: 'medium' });
      }
    }

    if (normalizedTrailer.tireStatus === 'poor') {
      alerts.push({ type: 'Tire Service', severity: 'high' });
    }

    return alerts;
  };

  const maintenanceAlerts = getMaintenanceAlerts();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-primary" />
              <span>Trailer Information</span>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-lg font-bold text-primary">
                {normalizedTrailer.unitNumber}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Status and Actions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">Status</div>
                {getStatusBadge(normalizedTrailer.status)}
              </div>
              <Separator orientation="vertical" className="h-8" />
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-1">GPS</div>
                {getGpsStatusBadge(normalizedTrailer.gpsStatus || 'unknown')}
              </div>
              {normalizedTrailer.companyName && (
                <>
                  <Separator orientation="vertical" className="h-8" />
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Company</div>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: normalizedTrailer.companyColor || '#6b7280' }}
                    >
                      {normalizedTrailer.companyName}
                    </span>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditModalOpen(true)}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNotesModalOpen(true)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Notes
              </Button>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Vehicle Details */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Truck className="h-4 w-4" />
                    Vehicle Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-muted-foreground">Year:</span>
                      <div className="mt-1">{normalizedTrailer.year || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Make:</span>
                      <div className="mt-1">{normalizedTrailer.make || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Model:</span>
                      <div className="mt-1">{normalizedTrailer.model || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">VIN:</span>
                      <div className="mt-1 font-mono text-xs">{normalizedTrailer.vin || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Plate:</span>
                      <div className="mt-1 font-mono text-xs">{normalizedTrailer.plate || 'Not specified'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-muted-foreground">Tire Status:</span>
                      <div className="mt-1">{getTireStatusBadge(normalizedTrailer.tireStatus)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* GPS & Location */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Navigation className="h-4 w-4" />
                    GPS & Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Last Sync:</span>
                      <span className="text-sm">{formatDateTime(normalizedTrailer.lastSync)}</span>
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Current Location:</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocationEditOpen(true)}
                        className="gap-2"
                      >
                        <Edit className="h-3 w-3" />
                        Edit
                      </Button>
                    </div>
                    {/* Display location with proper source detection */}
                    {(() => {
                      const isManualOverride = normalizedTrailer.locationSource === 'manual' && normalizedTrailer.manualLocationNotes;
                      const locationText = formatAddress(normalizedTrailer.lastAddress || normalizedTrailer.address);
                      
                      if (isManualOverride) {
                        return (
                          <>
                            <Badge variant="secondary" className="mb-2 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400">
                              Manual Override
                            </Badge>
                            <div className="text-sm">
                              {locationText}
                              <span className="ml-2 text-xs text-yellow-600 dark:text-yellow-400">
                                (Manual)
                              </span>
                            </div>
                          </>
                        );
                      } else {
                        return (
                          <div className="text-sm">
                            {locationText}
                            <span className="ml-2 text-xs text-muted-foreground">
                              (GPS)
                            </span>
                          </div>
                        );
                      }
                    })()}
                    {(normalizedTrailer.lastLatitude && normalizedTrailer.lastLongitude) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {normalizedTrailer.lastLatitude.toFixed(4)}, {normalizedTrailer.lastLongitude.toFixed(4)}
                      </div>
                    )}
                    {normalizedTrailer.locationUpdatedAt && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Updated: {formatDateTime(normalizedTrailer.locationUpdatedAt)}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Maintenance Information */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Wrench className="h-4 w-4" />
                    Maintenance Records
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Last Annual Inspection:</span>
                      <span>{formatDate(normalizedTrailer.lastAnnualInspection)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Next Annual Due:</span>
                      <span>{formatDate(normalizedTrailer.nextAnnualInspectionDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Last Midtrip Inspection:</span>
                      <span>{formatDate(normalizedTrailer.lastMidtripInspection)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Next Midtrip Due:</span>
                      <span>{formatDate(normalizedTrailer.nextMidtripInspectionDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Last Brake Inspection:</span>
                      <span>{formatDate(normalizedTrailer.lastBrakeInspection)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Next Brake Due:</span>
                      <span>{formatDate(normalizedTrailer.nextBrakeInspectionDue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium text-muted-foreground">Last Tire Service:</span>
                      <span>{formatDate(normalizedTrailer.lastTireService)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Maintenance Alerts */}
              {maintenanceAlerts.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Maintenance Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {maintenanceAlerts.map((alert, index) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg border ${
                            alert.severity === 'high'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-400'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="font-medium">{alert.type}</span>
                          </div>
                          {alert.due && (
                            <div className="text-sm mt-1">
                              Due: {formatDate(alert.due)}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Location Edit Modal */}
      <LocationEditModal
        isOpen={locationEditOpen}
        onClose={() => setLocationEditOpen(false)}
        trailer={normalizedTrailer}
        onLocationUpdated={handleLocationUpdated}
      />

      {/* Edit Trailer Modal */}
      <TrailerEditModal
        trailer={normalizedTrailer}
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleTrailerUpdated}
        onDelete={handleTrailerUpdated}
      />

      {/* Notes Modal */}
      <NotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        trailerId={normalizedTrailer.id}
        trailerName={normalizedTrailer.unitNumber}
        onNoteChange={onTrailerUpdated}
      />
    </Dialog>
  );
};

export default VehicleInfoModal; 