import { useState, useEffect } from 'react';
import { Trailer } from '../types';

interface LocationData {
  latitude: number | null;
  longitude: number | null;
  address: string;
}

export const useTrailerForm = (trailer: Trailer | null) => {
  const [formData, setFormData] = useState<Partial<Trailer>>({});
  const [locationData, setLocationData] = useState<LocationData>({
    latitude: null,
    longitude: null,
    address: ''
  });

  useEffect(() => {
    if (trailer) {
      setFormData({
        unitNumber: trailer.unitNumber || '',
        make: trailer.make || '',
        model: trailer.model || '',
        year: trailer.year || undefined,
        vin: trailer.vin || '',
        plate: trailer.plate || '',
        status: trailer.status || 'available',
        lastAnnualInspection: trailer.lastAnnualInspection || '',
        nextAnnualInspectionDue: trailer.nextAnnualInspectionDue || '',
        lastMidtripInspection: trailer.lastMidtripInspection || '',
        nextMidtripInspectionDue: trailer.nextMidtripInspectionDue || '',
        lastBrakeInspection: trailer.lastBrakeInspection || '',
        nextBrakeInspectionDue: trailer.nextBrakeInspectionDue || '',
        tireStatus: trailer.tireStatus || 'unknown',
        lastTireService: trailer.lastTireService || '',
        manualLocationOverride: Boolean(trailer.manualLocationOverride),
        manualLocationNotes: trailer.manualLocationNotes || ''
      });

      setLocationData({
        latitude: trailer.lastLatitude || null,
        longitude: trailer.lastLongitude || null,
        address: trailer.lastAddress || ''
      });
    }
  }, [trailer]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationDataChange = (data: LocationData) => {
    setLocationData(data);
  };

  const getUpdateData = () => {
    return {
      ...formData,
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      address: locationData.address,
      manualLocationOverride: Boolean(formData.manualLocationOverride),
      manualLocationNotes: formData.manualLocationNotes
    };
  };

  return {
    formData,
    locationData,
    handleInputChange,
    handleLocationDataChange,
    getUpdateData
  };
};
