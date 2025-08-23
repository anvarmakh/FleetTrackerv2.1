import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { MapPin, X, Save, RotateCcw, Palette, Tag, Building2, Globe, Search, Home, Wrench, Truck, Anchor, Star, Fuel, Store, Factory, Warehouse, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { trailerAPI, geocodingAPI, trailerCustomLocationAPI } from '@/lib/api';

interface LocationEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailer: any; // This can be either a trailer or custom location
  onLocationUpdated: () => void;
}

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

interface CustomLocationData {
  name: string;
  type: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  color: string;
  icon_name: string;
  is_shared: boolean;
}

const LOCATION_TYPES = [
  { value: 'general', label: 'General' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'depot', label: 'Depot' },
  { value: 'terminal', label: 'Terminal' },
  { value: 'yard', label: 'Yard' },
  { value: 'office', label: 'Office' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'fuel', label: 'Fuel Station' },
  { value: 'rest', label: 'Rest Area' },
  { value: 'custom', label: 'Custom' }
];

const ICON_OPTIONS = [
  { value: 'map-pin', label: 'Map Pin', icon: MapPin },
  { value: 'building', label: 'Building', icon: Building },
  { value: 'warehouse', label: 'Warehouse', icon: Warehouse },
  { value: 'factory', label: 'Factory', icon: Factory },
  { value: 'gas-station', label: 'Gas Station', icon: Fuel },
  { value: 'wrench', label: 'Maintenance', icon: Wrench },
  { value: 'home', label: 'Home', icon: Home },
  { value: 'office', label: 'Office', icon: Building2 },
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'anchor', label: 'Anchor', icon: Anchor },
  { value: 'star', label: 'Star', icon: Star }
];

const COLOR_OPTIONS = [
  { value: '#3b82f6', label: 'Blue' },
  { value: '#ef4444', label: 'Red' },
  { value: '#22c55e', label: 'Green' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Purple' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#f97316', label: 'Orange' },
  { value: '#6b7280', label: 'Gray' }
];

const LocationEditModal: React.FC<LocationEditModalProps> = ({
  isOpen,
  onClose,
  trailer,
  onLocationUpdated
}) => {
  const { toast } = useToast();
  const [isCustomLocation, setIsCustomLocation] = useState(false);
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    address: ''
  });
  const [customLocationData, setCustomLocationData] = useState<CustomLocationData>({
    name: '',
    type: 'general',
    address: '',
    latitude: null,
    longitude: null,
    color: '#3b82f6',
    icon_name: 'map-pin',
    is_shared: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  useEffect(() => {
    if (trailer && isOpen) {
      // Check if this is a custom location or trailer
      const isCustom = trailer.name && trailer.type;
      setIsCustomLocation(isCustom);

      if (isCustom) {
        // Custom location
        setCustomLocationData({
          name: trailer.name || '',
          type: trailer.type || 'general',
          address: trailer.address || '',
          latitude: trailer.latitude || trailer.lat || null,
          longitude: trailer.longitude || trailer.lng || null,
          color: trailer.color || '#3b82f6',
          icon_name: trailer.iconName || trailer.icon_name || 'map-pin',
          is_shared: trailer.is_shared || false
        });
      } else {
        // Trailer location
        setLocationData({
          latitude: trailer.last_latitude || trailer.latitude || null,
          longitude: trailer.last_longitude || trailer.longitude || null,
          address: trailer.last_address || trailer.address || ''
        });
      }
    }
  }, [trailer, isOpen]);



  const handleSave = async () => {
    if (!trailer) return;

    if (isCustomLocation) {
      await handleSaveCustomLocation();
    } else {
      await handleSaveTrailerLocation();
    }
  };

  const handleSaveTrailerLocation = async () => {
    if (locationData.latitude === null || locationData.longitude === null) {
      toast({
        title: "Validation Error",
        description: "Latitude and longitude are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await trailerAPI.updateLocation(trailer.id, locationData);
      
      if (response.data.success) {
        toast({
          title: "Location Updated",
          description: "Trailer location has been updated successfully",
        });
        onLocationUpdated();
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to update location');
      }
    } catch (error: unknown) {
              // Error updating location
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCustomLocation = async () => {
    if (!customLocationData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Location name is required",
        variant: "destructive",
      });
      return;
    }

    if (customLocationData.latitude === null || customLocationData.longitude === null) {
      toast({
        title: "Validation Error",
        description: "Latitude and longitude are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      const response = await trailerCustomLocationAPI.updateCustomLocation(trailer.id, {
        name: customLocationData.name,
        type: customLocationData.type,
        address: customLocationData.address,
        lat: customLocationData.latitude,
        lng: customLocationData.longitude,
        color: customLocationData.color,
        icon_name: customLocationData.icon_name,
        is_shared: customLocationData.is_shared
      });
      
      if (response.data.success) {
        toast({
          title: "Location Updated",
          description: "Custom location has been updated successfully",
        });
        onLocationUpdated();
        onClose();
      } else {
        throw new Error(response.data.error || 'Failed to update location');
      }
    } catch (error: unknown) {
              // Error updating custom location
      const errorMessage = error instanceof Error ? error.message : 'Failed to update location';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeocodeAddress = async () => {
    const address = isCustomLocation ? customLocationData.address : locationData.address;
    
    if (!address.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an address to geocode",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeocoding(true);
      const response = await geocodingAPI.geocodeAddress(address);
      
      if (response.data.success && response.data.data) {
        const { lat, lng } = response.data.data;
        
        if (isCustomLocation) {
          setCustomLocationData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        } else {
          setLocationData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
          }));
        }
        
        toast({
          title: "Address Geocoded",
          description: "Coordinates have been updated from the address",
        });
      } else {
        toast({
          title: "Geocoding Failed",
          description: "Could not find coordinates for this address",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
              // Error geocoding address
      const errorMessage = error instanceof Error ? error.message : 'Failed to geocode address';
      toast({
        title: "Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleReverseGeocode = async () => {
    const lat = isCustomLocation ? customLocationData.latitude : locationData.latitude;
    const lng = isCustomLocation ? customLocationData.longitude : locationData.longitude;
    
    if (lat === null || lng === null) {
      toast({
        title: "Validation Error",
        description: "Please enter coordinates to reverse geocode",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGeocoding(true);
      const response = await geocodingAPI.reverseGeocode(lat, lng);
      
      if (response.data.success && response.data.data) {
        const address = response.data.data.formatted_address || '';
        
        if (isCustomLocation) {
          setCustomLocationData(prev => ({
            ...prev,
            address: address
          }));
        } else {
          setLocationData(prev => ({
            ...prev,
            address: address
          }));
        }
        
        toast({
          title: "Coordinates Geocoded",
          description: "Address has been updated from the coordinates",
        });
      } else {
        toast({
          title: "Reverse Geocoding Failed",
          description: "Could not find address for these coordinates",
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
              // Error reverse geocoding
      const errorMessage = error instanceof Error ? error.message : 'Failed to reverse geocode coordinates';
      toast({
        title: "Reverse Geocoding Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGeocoding(false);
    }
  };

    const renderCustomLocationForm = () => (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-semibold">Location Name *</Label>
          <Input
            id="name"
            placeholder="Enter location name"
            value={customLocationData.name}
            onChange={(e) => setCustomLocationData(prev => ({
              ...prev,
              name: e.target.value
            }))}
            className="h-10 border-gray-300 focus:border-primary focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-semibold text-gray-700">Type</Label>
            <Select
              value={customLocationData.type}
              onValueChange={(value) => setCustomLocationData(prev => ({
                ...prev,
                type: value
              }))}
            >
              <SelectTrigger className="h-10 border-gray-300 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">Shared Location</Label>
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="is_shared"
                checked={customLocationData.is_shared}
                onCheckedChange={(checked) => setCustomLocationData(prev => ({
                  ...prev,
                  is_shared: checked as boolean
                }))}
              />
              <Label htmlFor="is_shared" className="text-sm text-gray-600 cursor-pointer">
                Make this location visible to all users
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Full Address</Label>
          <div className="flex gap-3">
            <Input
              id="address"
              placeholder="Enter full address"
              value={customLocationData.address}
              onChange={(e) => setCustomLocationData(prev => ({
                ...prev,
                address: e.target.value
              }))}
              className="h-10 border-gray-300 focus:border-primary focus:ring-primary flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGeocodeAddress}
              disabled={isGeocoding}
              className="p-2 h-10 w-10 hover:bg-primary hover:text-white transition-colors"
              title="Geocode Address"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Coordinates */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="latitude" className="text-sm font-semibold text-gray-700">Latitude *</Label>
            <Input
              id="latitude"
              type="number"
              step="any"
              placeholder="e.g., 40.7128"
              value={customLocationData.latitude || ''}
              onChange={(e) => setCustomLocationData(prev => ({
                ...prev,
                latitude: e.target.value ? parseFloat(e.target.value) : null
              }))}
              className="h-10 border-gray-300 focus:border-primary focus:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="longitude" className="text-sm font-semibold text-gray-700">Longitude *</Label>
            <div className="flex gap-2">
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="e.g., -74.0060"
                value={customLocationData.longitude || ''}
                onChange={(e) => setCustomLocationData(prev => ({
                  ...prev,
                  longitude: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="h-10 border-gray-300 focus:border-primary focus:ring-primary flex-1"
              />
              {(customLocationData.latitude !== null && customLocationData.longitude !== null) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReverseGeocode}
                  disabled={isGeocoding}
                  className="p-2 h-10 w-10 hover:bg-primary hover:text-white transition-colors"
                  title="Get Address from Coordinates"
                >
                  <Search className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color" className="text-sm font-semibold text-gray-700">Color</Label>
            <Select
              value={customLocationData.color}
              onValueChange={(value) => setCustomLocationData(prev => ({
                ...prev,
                color: value
              }))}
            >
              <SelectTrigger className="h-10 border-gray-300 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Select color" />
              </SelectTrigger>
              <SelectContent>
                {COLOR_OPTIONS.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300" 
                        style={{ backgroundColor: color.value }}
                      />
                      <span className="font-medium">{color.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="icon" className="text-sm font-semibold text-gray-700">Icon</Label>
            <Select
              key={`icon-${customLocationData.color}`}
              value={customLocationData.icon_name}
              onValueChange={(value) => setCustomLocationData(prev => ({
                ...prev,
                icon_name: value
              }))}
            >
              <SelectTrigger className="h-10 border-gray-300 focus:border-primary focus:ring-primary">
                <SelectValue placeholder="Select icon">
                  {customLocationData.icon_name && (() => {
                    const selectedIcon = ICON_OPTIONS.find(icon => icon.value === customLocationData.icon_name);
                    if (selectedIcon) {
                      const IconComponent = selectedIcon.icon;
                      return (
                        <div className="flex items-center gap-2">
                          <IconComponent 
                            className="w-4 h-4" 
                            style={{ color: customLocationData.color || '#6b7280' }}
                          />
                          <span>{selectedIcon.label}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ICON_OPTIONS.map((icon) => {
                  const IconComponent = icon.icon;
                  return (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent 
                          className="w-4 h-4" 
                          style={{ color: customLocationData.color || '#6b7280' }}
                        />
                        <span className="font-medium">{icon.label}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrailerLocationForm = () => (
    <div className="space-y-6">
      {/* Current Location Status */}
      {trailer?.manual_location_override && (
        <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Manual Override Active
          </Badge>
          <span className="text-sm text-yellow-700 font-medium">
            This trailer's location is manually set
          </span>
        </div>
      )}



      {/* Address */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-semibold text-gray-700">Address</Label>
          <div className="flex gap-3">
            <Input
              id="address"
              placeholder="Enter address to geocode"
              value={locationData.address}
              onChange={(e) => setLocationData(prev => ({
                ...prev,
                address: e.target.value
              }))}
              className="h-10 border-gray-300 focus:border-primary focus:ring-primary flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGeocodeAddress}
              disabled={isGeocoding}
              className="p-2 h-10 w-10 hover:bg-primary hover:text-white transition-colors"
              title="Geocode Address"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Coordinates */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude" className="text-sm font-semibold text-gray-700">Latitude</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="e.g., 40.7128"
                value={locationData.latitude || ''}
                onChange={(e) => setLocationData(prev => ({
                  ...prev,
                  latitude: e.target.value ? parseFloat(e.target.value) : null
                }))}
                className="h-10 border-gray-300 focus:border-primary focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude" className="text-sm font-semibold text-gray-700">Longitude</Label>
              <div className="flex gap-2">
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="e.g., -74.0060"
                  value={locationData.longitude || ''}
                  onChange={(e) => setLocationData(prev => ({
                    ...prev,
                    longitude: e.target.value ? parseFloat(e.target.value) : null
                  }))}
                  className="h-10 border-gray-300 focus:border-primary focus:ring-primary flex-1"
                />
                {(locationData.latitude !== null && locationData.longitude !== null) && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleReverseGeocode}
                    disabled={isGeocoding}
                    className="p-2 h-10 w-10 hover:bg-primary hover:text-white transition-colors"
                    title="Get Address from Coordinates"
                  >
                    <Search className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-xl">
            {isCustomLocation ? (
              <>
                <Building2 className="w-6 h-6 text-primary" />
                Edit Custom Location - {trailer?.name}
              </>
            ) : (
              <>
                <MapPin className="w-6 h-6 text-primary" />
                Edit Trailer Location - {trailer?.unit_number || trailer?.unitNumber}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {isCustomLocation 
              ? `Update the details for custom location "${trailer?.name}". You can modify the location information, appearance, and sharing settings.`
              : `Manually update the location for trailer ${trailer?.unit_number || trailer?.unitNumber}. This will override GPS data and mark the location as manually set.`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {isCustomLocation ? renderCustomLocationForm() : renderTrailerLocationForm()}
        </div>

        <div className="flex justify-between items-center pt-6 border-t border-gray-200">
          <div className="flex gap-3">
            {/* Clear Override button removed */}
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="hover:bg-gray-50 transition-colors h-10 px-6"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isLoading}
              className="gap-2 bg-primary hover:bg-primary/90 transition-colors h-10 px-6"
            >
              <Save className="w-4 h-4" />
              {isLoading ? 'Saving...' : 'Save Location'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LocationEditModal; 