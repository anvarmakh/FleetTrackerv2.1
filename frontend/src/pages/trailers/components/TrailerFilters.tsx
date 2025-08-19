import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Filter, X } from 'lucide-react';

import { TrailerFilterState } from '../types';

interface TrailerFiltersProps {
  showFilters: boolean;
  filters: TrailerFilterState;
  companies: Array<{ id: string; name: string }>;
  onToggleFilters: () => void;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

const TrailerFilters: React.FC<TrailerFiltersProps> = ({
  showFilters,
  filters,
  companies,
  onToggleFilters,
  onFilterChange,
  onClearFilters,
  hasActiveFilters
}) => {
  return (
    <div className="space-y-3 lg:space-y-4">
      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border rounded-lg p-3 lg:p-4 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onFilterChange('status', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="available">Available</option>
                <option value="dispatched">Moving</option>
                <option value="maintenance">Maintenance</option>
                <option value="out_of_service">Out of Service</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Company</label>
              <select
                value={filters.company}
                onChange={(e) => onFilterChange('company', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Companies</option>
                {companies?.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">GPS Status</label>
              <select
                value={filters.gpsStatus}
                onChange={(e) => onFilterChange('gpsStatus', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All GPS Statuses</option>
                <option value="connected">Connected</option>
                <option value="disconnected">Disconnected</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Maintenance</label>
              <select
                value={filters.maintenance}
                onChange={(e) => onFilterChange('maintenance', e.target.value)}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Maintenance</option>
                <option value="good">Good</option>
                <option value="annual_due">Annual Due</option>
                <option value="midtrip_due">Midtrip Due</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrailerFilters;
