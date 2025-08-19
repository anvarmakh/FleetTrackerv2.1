import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trailer } from '../types';

interface TrailerBasicInfoProps {
  formData: Partial<Trailer>;
  onInputChange: (field: string, value: any) => void;
}

const TrailerBasicInfo: React.FC<TrailerBasicInfoProps> = ({ formData, onInputChange }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="unit_number" className="text-sm font-medium text-gray-700 dark:text-gray-300">Unit Number *</Label>
          <Input
            id="unit_number"
            value={formData.unitNumber || ''}
            onChange={(e) => onInputChange('unitNumber', e.target.value)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="Enter unit number"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="status" className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</Label>
          <Select
            value={formData.status || 'available'}
            onValueChange={(value) => onInputChange('status', value)}
          >
            <SelectTrigger className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="loading">Loading</SelectItem>
              <SelectItem value="unloading">Unloading</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="out_of_service">Out of Service</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="make" className="text-sm font-medium text-gray-700 dark:text-gray-300">Make</Label>
          <Input
            id="make"
            value={formData.make || ''}
            onChange={(e) => onInputChange('make', e.target.value)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="e.g., Freightliner"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="model" className="text-sm font-medium text-gray-700 dark:text-gray-300">Model</Label>
          <Input
            id="model"
            value={formData.model || ''}
            onChange={(e) => onInputChange('model', e.target.value)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="e.g., Cascadia"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="year" className="text-sm font-medium text-gray-700 dark:text-gray-300">Year</Label>
          <Input
            id="year"
            type="number"
            value={formData.year || ''}
            onChange={(e) => onInputChange('year', parseInt(e.target.value) || undefined)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="e.g., 2023"
            min="1900"
            max="2030"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="vin" className="text-sm font-medium text-gray-700 dark:text-gray-300">VIN</Label>
          <Input
            id="vin"
            value={formData.vin || ''}
            onChange={(e) => onInputChange('vin', e.target.value)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="Enter VIN"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="plate" className="text-sm font-medium text-gray-700 dark:text-gray-300">License Plate</Label>
          <Input
            id="plate"
            value={formData.plate || ''}
            onChange={(e) => onInputChange('plate', e.target.value)}
            className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
            placeholder="Enter plate number"
          />
        </div>
      </div>
    </div>
  );
};

export default TrailerBasicInfo;
