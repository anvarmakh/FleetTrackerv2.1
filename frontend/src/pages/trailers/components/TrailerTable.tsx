import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, FileText, CheckCircle, AlertTriangle, Clock, MapPin, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

import { Trailer, RecentNote } from '../types';

// Category colors matching NotesModal
const categoryColors = {
  general: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  maintenance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  damage: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  repair: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  inspection: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const categoryLabels = {
  general: 'General',
  maintenance: 'Maintenance',
  damage: 'Damage',
  repair: 'Repair',
  inspection: 'Inspection',
};

interface TrailerTableProps {
  trailers: Trailer[];
  showLastSyncColumn: boolean;
  recentNotes: Record<string, RecentNote>;
  onEditTrailer: (trailer: Trailer) => void;
  onOpenNotes: (trailer: Trailer) => void;
  onOpenVehicleInfo: (trailer: Trailer) => void;
  hasActiveFilters: boolean;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
  onSort?: (key: string) => void;
  maintenancePreferences?: {
    annual_alert_threshold: number;
    midtrip_alert_threshold: number;
    brake_alert_threshold: number;
    enable_maintenance_alerts: boolean;
  } | null;
}

const TrailerTable: React.FC<TrailerTableProps> = ({
  trailers,
  showLastSyncColumn,
  recentNotes,
  onEditTrailer,
  onOpenNotes,
  onOpenVehicleInfo,
  hasActiveFilters,
  sortConfig,
  onSort,
  maintenancePreferences
}) => {

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'dispatched':
        return <MapPin className="h-4 w-4 text-blue-500" />;
      case 'maintenance':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'out_of_service':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

    const getStatusBadge = (status: string) => {
    const statusConfig = {
      available: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'text-green-600 dark:text-green-400'
      },
      dispatched: {
        icon: <MapPin className="h-4 w-4" />,
        className: 'text-blue-600 dark:text-blue-400'
      },
      maintenance: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'text-yellow-600 dark:text-yellow-400'
      },
      out_of_service: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'text-red-600 dark:text-red-400'
      }
    };

    const config = statusConfig[status.toLowerCase() as keyof typeof statusConfig] || {
      icon: <Clock className="h-4 w-4" />,
      className: 'text-muted-foreground'
    };

    return (
      <div className={`flex items-center gap-1 ${config.className}`}>
        {config.icon}
        <span className="text-xs font-medium">{status.replace(/_/g, ' ').toUpperCase()}</span>
      </div>
    );
  };

  const getGpsStatusBadge = (gpsStatus: string | null | undefined) => {
    const gpsConfig = {
      connected: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'text-green-600 dark:text-green-400'
      },
      disconnected: {
        icon: <AlertTriangle className="h-4 w-4" />,
        className: 'text-red-600 dark:text-red-400'
      },
      active: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'text-green-600 dark:text-green-400'
      },
      stopped: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'text-green-600 dark:text-green-400'
      },
      available: {
        icon: <CheckCircle className="h-4 w-4" />,
        className: 'text-green-600 dark:text-green-400'
      },
      unknown: {
        icon: <Clock className="h-4 w-4" />,
        className: 'text-gray-600 dark:text-gray-400'
      }
    };

    // Handle null/undefined gpsStatus
    if (!gpsStatus) {
      return (
        <div className="flex items-center justify-center text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
        </div>
      );
    }

    // Map stopped and active to available
    const normalizedStatus = gpsStatus.toLowerCase();
    const displayStatus = normalizedStatus === 'stopped' || normalizedStatus === 'active' ? 'available' : normalizedStatus;

    const config = gpsConfig[displayStatus as keyof typeof gpsConfig] || {
      icon: <Clock className="h-4 w-4" />,
      className: 'text-muted-foreground'
    };

    return (
      <div className={`flex items-center justify-center ${config.className}`}>
        {config.icon}
      </div>
    );
  };

  const formatLastSync = (lastSync?: string) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return '< 1h ago';
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return `${Math.floor(diffInHours / 24)}d ago`;
  };

  const getMaintenanceSummary = (trailer: Trailer) => {
    // If maintenance alerts are disabled, return good status
    if (!maintenancePreferences?.enable_maintenance_alerts) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
          <CheckCircle className="h-3 w-3" />
          Good
        </Badge>
      );
    }

    const alerts = [];
    const now = new Date();
    
    // Use preferences or default thresholds
    const annualThreshold = maintenancePreferences?.annual_alert_threshold || 30;
    const midtripThreshold = maintenancePreferences?.midtrip_alert_threshold || 14;
    const brakeThreshold = maintenancePreferences?.brake_alert_threshold || 14;
    
    // Check annual inspection - overdue or due soon (within threshold)
    if (trailer.nextAnnualInspectionDue) {
      const nextAnnual = new Date(trailer.nextAnnualInspectionDue);
      const daysUntilDue = Math.floor((nextAnnual.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        alerts.push('Annual Overdue');
      } else if (daysUntilDue <= annualThreshold) {
        alerts.push('Annual Due');
      }
    } else if (trailer.lastAnnualInspection) {
      // Fallback: if last inspection was more than 365 days ago, it's due
      const lastAnnual = new Date(trailer.lastAnnualInspection);
      const daysSince = Math.floor((now.getTime() - lastAnnual.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 365) {
        alerts.push('Annual Due');
      }
    }
    
    // Check midtrip inspection - overdue or due soon (within threshold)
    if (trailer.nextMidtripInspectionDue) {
      const nextMidtrip = new Date(trailer.nextMidtripInspectionDue);
      const daysUntilDue = Math.floor((nextMidtrip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        alerts.push('Midtrip Overdue');
      } else if (daysUntilDue <= midtripThreshold) {
        alerts.push('Midtrip Due');
      }
    }
    
    // Check brake inspection - overdue or due soon (within threshold)
    if (trailer.nextBrakeInspectionDue) {
      const nextBrake = new Date(trailer.nextBrakeInspectionDue);
      const daysUntilDue = Math.floor((nextBrake.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue < 0) {
        alerts.push('Brake Overdue');
      } else if (daysUntilDue <= brakeThreshold) {
        alerts.push('Brake Due');
      }
    }
    
    // Check tire status
    if (trailer.tireStatus === 'poor') {
      alerts.push('Tire Alert');
    }
    
    if (alerts.length === 0) {
      return (
        <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
          <CheckCircle className="h-3 w-3" />
          Good
        </Badge>
      );
    }
    
    return (
      <div className="flex flex-col gap-1">
        {alerts.map((alert, index) => (
          <Badge 
            key={index} 
            variant="outline" 
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800"
          >
            <AlertTriangle className="h-3 w-3" />
            {alert}
          </Badge>
        ))}
      </div>
    );
  };

  const getRecentNotePreview = (trailerId: string) => {
    const note = recentNotes[trailerId];
    if (!note) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span className="text-sm">No notes</span>
        </div>
      );
    }
    
    const preview = note.content.length > 50 
      ? note.content.substring(0, 50) + '...' 
      : note.content;
    
    // Get category color and label
    const categoryColor = categoryColors[note.category as keyof typeof categoryColors] || categoryColors.general;
    const categoryLabel = categoryLabels[note.category as keyof typeof categoryLabels] || 'General';
    
    return (
      <div className="space-y-1">
        <div className="flex items-start gap-2">
          <FileText className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground leading-tight">
              {preview}
            </div>
            <div className="mt-1">
              <Badge className={`${categoryColor} text-xs font-medium px-2 py-0.5`}>
                {categoryLabel}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getSortIcon = (columnKey: string) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="w-4 h-4" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ChevronUp className="w-4 h-4" />
      : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="w-full px-4 transition-opacity duration-200">
      <Table>
      <TableHeader>
        <TableRow>
          <TableHead 
            className="w-[120px] pl-6 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
            onClick={() => onSort?.('unitNumber')}
          >
            <div className="flex items-center gap-1">
              Unit #
              {getSortIcon('unitNumber')}
            </div>
          </TableHead>
          <TableHead className="w-[100px] text-center">Status</TableHead>
          <TableHead className="w-[80px] text-center">GPS</TableHead>
          <TableHead className="w-[200px]">Location</TableHead>
          <TableHead className="w-[120px]">Company</TableHead>
          {showLastSyncColumn && (
            <TableHead 
              className="w-[120px] text-center cursor-pointer hover:bg-muted/50 transition-colors duration-200"
              onClick={() => onSort?.('lastSync')}
            >
              <div className="flex items-center justify-center gap-1">
                Last Sync
                {getSortIcon('lastSync')}
              </div>
            </TableHead>
          )}
          <TableHead className="w-[140px] text-center">Maintenance</TableHead>
          <TableHead 
            className="w-[180px] text-center cursor-pointer hover:bg-muted/50 transition-colors duration-200"
            onClick={() => onSort?.('notes')}
          >
            <div className="flex items-center justify-center gap-1">
              Recent Notes
              {getSortIcon('notes')}
            </div>
          </TableHead>
          <TableHead className="w-[80px] pr-6 text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trailers.map((trailer, index) => (
          <TableRow 
            key={trailer.id || `trailer-${index}-${trailer.unitNumber || 'unknown'}`} 
            className="hover:bg-muted/50 transition-all duration-200"
          >
            <TableCell className="font-medium pl-6 w-[120px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenVehicleInfo(trailer)}
                className="h-auto p-0 font-medium text-left hover:bg-transparent hover:text-primary transition-colors duration-200 group"
                title="View vehicle info"
              >
                <span className="group-hover:scale-105 transition-transform duration-200">
                  {trailer.unitNumber}
                </span>
              </Button>
            </TableCell>
            <TableCell className="text-center w-[100px]">
              <div className="flex justify-center">
                {getStatusBadge(trailer.status)}
              </div>
            </TableCell>
            <TableCell className="text-center w-[80px]">
              <div className="flex justify-center">
                {getGpsStatusBadge(trailer.gpsStatus)}
              </div>
            </TableCell>
            <TableCell className="w-[200px]">
              <div className="truncate max-w-[180px]" title={trailer.lastAddress || 'No location'}>
                {trailer.lastAddress || 'No location'}
              </div>
            </TableCell>
            <TableCell className="w-[120px]">
              <div className="truncate max-w-[100px]" title={trailer.companyName || 'Unknown'}>
                <span 
                  className="text-sm font-medium"
                  style={{ color: trailer.companyColor || '#6b7280' }}
                >
                  {trailer.companyName || 'Unknown'}
                </span>
              </div>
            </TableCell>
            {showLastSyncColumn && (
              <TableCell className="w-[120px] text-center">
                <div className="text-sm font-medium">
                  {formatLastSync(trailer.lastSync)}
                </div>
              </TableCell>
            )}
            <TableCell className="w-[140px] text-center">
              <div className="flex justify-center">
                {getMaintenanceSummary(trailer)}
              </div>
            </TableCell>
            <TableCell className="w-[180px] text-center">
              <div className="flex justify-center">
                {getRecentNotePreview(trailer.id)}
              </div>
            </TableCell>
            <TableCell className="w-[80px] pr-6">
              <div className="flex items-center justify-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEditTrailer(trailer)}
                  className="h-7 w-7 p-0"
                  title="Edit trailer"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenNotes(trailer)}
                  className="h-7 w-7 p-0"
                  title="View notes"
                >
                  <FileText className="h-3 w-3" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    {(!Array.isArray(trailers) || trailers.length === 0) && (
      <div className="flex items-center justify-center py-12 text-center text-muted-foreground">
        <div>
          <div className="text-lg font-medium mb-2">
            {hasActiveFilters ? 'No trailers match your filters.' : 'No trailers found.'}
          </div>
          <div className="text-sm">
            {hasActiveFilters ? 'Try adjusting your filters to see more results.' : 'Add your first trailer to get started.'}
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default TrailerTable;
