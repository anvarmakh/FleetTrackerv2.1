import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MapPin, Edit, Trash2, Warehouse, Building2, Home, Car, Factory, Store, Building, Anchor, Plane, Train, Wrench, Star, Fuel, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { CustomLocation } from '../types';

interface TrailerMapProps {
  customLocations: CustomLocation[];
  activeLocationFilter: { lat: number; lng: number; name: string } | null;
  onLocationTrailerCountClick: (location: CustomLocation) => void;
  onEditLocation: (location: CustomLocation) => void;
  onDeleteLocation: (locationId: string) => void;
  loadingLocations: boolean;
}

const TrailerMap: React.FC<TrailerMapProps> = ({
  customLocations,
  activeLocationFilter,
  onLocationTrailerCountClick,
  onEditLocation,
  onDeleteLocation,
  loadingLocations
}) => {
  const getLocationIcon = (location: CustomLocation) => {
    const iconMap: { [key: string]: React.ComponentType<any> } = {
      'map-pin': MapPin,
      'building': Building,
      'warehouse': Warehouse,
      'factory': Factory,
      'gas-station': Fuel,
      'wrench': Wrench,
      'home': Home,
      'office': Building2,
      'truck': Truck,
      'anchor': Anchor,
      'star': Star
    };

    const iconName = location.iconName || location.icon_name || 'map-pin';
    const IconComponent = iconMap[iconName] || MapPin;
    
    return (
      <IconComponent 
        className="w-4 h-4" 
        style={{ color: location.color || '#6b7280' }}
      />
    );
  };

  const getLocationType = (location: CustomLocation) => {
    const typeMap: { [key: string]: string } = {
      'general': 'General',
      'warehouse': 'Warehouse',
      'depot': 'Depot',
      'terminal': 'Terminal',
      'yard': 'Yard',
      'office': 'Office',
      'maintenance': 'Maintenance',
      'fuel': 'Fuel Station',
      'rest': 'Rest Area',
      'custom': 'Custom'
    };

    return typeMap[location.type || 'general'] || 'General';
  };

  return (
    <Card>
      <CardContent className="p-0">
        {customLocations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p>No custom locations found</p>
            <p className="text-sm">Add locations to track trailer clusters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14%] pl-8">
                    <div className="flex items-center gap-2">
                      Location
                      {loadingLocations && (
                        <div className="animate-spin rounded-full h-3 w-3 border-b border-primary"></div>
                      )}
                    </div>
                  </TableHead>
                  <TableHead className="w-[12%] text-center">Type</TableHead>
                  <TableHead className="w-[12%] text-center">Trailer Count</TableHead>
                  <TableHead className="w-[30%]">Address</TableHead>
                  <TableHead className="w-[13%]">Coordinates</TableHead>
                  <TableHead className="w-[15%] px-2 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customLocations.map((location) => {
                  const isActive = activeLocationFilter && 
                    activeLocationFilter.lat === (location.lat || location.latitude) && 
                    activeLocationFilter.lng === (location.lng || location.longitude);

                  return (
                    <TableRow 
                      key={location.id} 
                      className={`hover:bg-muted/50 transition-all duration-200 ${
                        isActive ? 'bg-blue-500/10 dark:bg-blue-400/20 border-blue-200 dark:border-blue-300' : ''
                      }`}
                    >
                      <TableCell className="pl-8">
                        <div className="flex items-center gap-3">
                          <div className="text-muted-foreground">
                            {getLocationIcon(location)}
                          </div>
                          <div>
                            <div className="font-medium text-sm">{location.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-xs">
                          {getLocationType(location)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onLocationTrailerCountClick(location)}
                          className={`h-6 px-2 text-base font-black ${
                            isActive 
                              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                              : 'hover:bg-gray-100'
                          }`}
                        >
                          {location.trailerCount || 0}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="truncate">
                          {location.address || 'No address'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {(location.lat || location.latitude || 0).toFixed(4)}, {(location.lng || location.longitude || 0).toFixed(4)}
                        </div>
                      </TableCell>
                      <TableCell className="px-2">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditLocation(location)}
                            className="h-7 w-7 p-0"
                            title="Edit location"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteLocation(location.id)}
                            className="h-7 w-7 p-0 text-red-600 hover:text-red-700"
                            title="Delete location"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrailerMap;
