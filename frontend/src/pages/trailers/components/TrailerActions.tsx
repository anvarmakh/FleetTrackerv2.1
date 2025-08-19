import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Plus, Clock, Filter, X } from 'lucide-react';

interface TrailerActionsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onAddTrailer: () => void;
  onToggleLastSyncColumn: () => void;
  showLastSyncColumn: boolean;
  refreshing: boolean;
  customLocations: any[];
  onAddLocation: () => void;
  loadingLocations: boolean;
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  activeStatsFilter: string | null;
  filters: { status: string; company: string; gpsStatus: string; maintenance: string };
  activeLocationFilter: { lat: number; lng: number; name: string } | null;
}

const TrailerActions: React.FC<TrailerActionsProps> = ({
  searchTerm,
  onSearchChange,
  onRefresh,
  onAddTrailer,
  onToggleLastSyncColumn,
  showLastSyncColumn,
  refreshing,
  customLocations,
  onAddLocation,
  loadingLocations,
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  onClearFilters,
  activeStatsFilter,
  filters,
  activeLocationFilter
}) => {
  // Determine if we should show the clear button
  // Show it when any filter is active
  const shouldShowClearButton = hasActiveFilters;

  return (
    <div className="flex items-center gap-3">
      {/* Search Bar with Filter Button and Clear Button */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search trailers..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-20 h-9"
        />
        {shouldShowClearButton && (
          <Button
            onClick={onClearFilters}
            variant="ghost"
            size="sm"
            className="absolute right-8 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            title="Clear All Filters"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
        <Button
          onClick={onToggleFilters}
          variant="ghost"
          size="sm"
          className={`absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 ${
            hasActiveFilters ? 'text-primary' : 'text-muted-foreground'
          }`}
          title="Toggle Filters"
        >
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {/* Action Buttons - Aligned to the right */}
      <div className="flex items-center gap-2">
        <Button
          onClick={onAddLocation}
          disabled={loadingLocations}
          variant="outline"
          size="sm"
          className="h-9 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </Button>
        <Button 
          onClick={onRefresh}
          disabled={refreshing}
          variant="outline"
          size="sm"
          className="h-9 w-9 p-0"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
        <Button 
          onClick={onToggleLastSyncColumn}
          variant="outline"
          size="sm"
          className={`h-9 w-9 p-0 ${showLastSyncColumn ? 'bg-blue-100 text-blue-600' : ''}`}
          title="Toggle Last Sync Column"
        >
          <Clock className="w-4 h-4" />
        </Button>
        <Button
          onClick={onAddTrailer}
          className="h-9 gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Trailer
        </Button>
      </div>
    </div>
  );
};

export default TrailerActions;
