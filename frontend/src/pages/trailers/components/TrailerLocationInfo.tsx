import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Search, MapPin } from 'lucide-react';
import { Trailer } from '../types';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

interface TrailerLocationInfoProps {
  formData: Partial<Trailer>;
  locationData: LocationData;
  isGeocoding: boolean;
  onInputChange: (field: string, value: any) => void;
  onLocationDataChange: (data: LocationData) => void;
  onGeocodeAddress: () => void;
  onReverseGeocode: () => void;
  originalGpsAddress?: string;
}

const TrailerLocationInfo: React.FC<TrailerLocationInfoProps> = ({
  formData,
  locationData,
  isGeocoding,
  onInputChange,
  onLocationDataChange,
  onGeocodeAddress,
  onReverseGeocode,
  originalGpsAddress
}) => {
  // Auto-fill "Manual" in location notes when coordinates or address are manually entered
  const handleLocationDataChange = (data: LocationData) => {
    onLocationDataChange(data);
  };

  // Handle coordinate changes
  const handleCoordinateChange = (data: LocationData) => {
    onLocationDataChange(data);
  };

  // Handle manual address entry
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddress = e.target.value;
    handleLocationDataChange({ ...locationData, address: newAddress });
  };
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="address" className="text-sm font-medium text-gray-700 dark:text-gray-300">Address</Label>
        <div className="flex gap-2">
                     <Input
             id="address"
             value={locationData.address}
             onChange={handleAddressChange}
             className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
             placeholder="Enter address"
           />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onGeocodeAddress}
            disabled={isGeocoding || !locationData.address.trim()}
            className="px-3"
            title="Geocode address to coordinates"
          >
            {isGeocoding ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">Coordinates</Label>
        <div className="flex gap-2">
                     <Input
             id="latitude"
             type="number"
             step="any"
             value={locationData.latitude || ''}
             onChange={(e) => handleCoordinateChange({ ...locationData, latitude: parseFloat(e.target.value) || null })}
             className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
             placeholder="Latitude"
           />
           <Input
             id="longitude"
             type="number"
             step="any"
             value={locationData.longitude || ''}
             onChange={(e) => handleCoordinateChange({ ...locationData, longitude: parseFloat(e.target.value) || null })}
             className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
             placeholder="Longitude"
           />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReverseGeocode}
            disabled={isGeocoding || locationData.latitude === null || locationData.longitude === null}
            className="px-3"
            title="Get address from coordinates"
          >
            {isGeocoding ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            ) : (
              <MapPin className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="manual_notes" className="text-sm font-medium text-gray-700 dark:text-gray-300">Location Notes</Label>
        <Input
          id="manual_notes"
          value={formData.manualLocationNotes || ''}
          onChange={(e) => onInputChange('manualLocationNotes', e.target.value)}
          className="h-9 text-sm border-gray-300 dark:border-gray-600 focus:border-primary focus:ring-primary"
          placeholder="Location notes..."
        />
      </div>
    </div>
  );
};

export default TrailerLocationInfo;
