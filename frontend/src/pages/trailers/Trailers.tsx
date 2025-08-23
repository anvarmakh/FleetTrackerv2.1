import React, { useState, useEffect, useCallback } from 'react';
import { trailerAPI, trailerCustomLocationAPI, systemNotesAPI, companyAPI, geocodingAPI, trailerCustomCompaniesAPI, maintenanceAPI } from '@/lib/api';
import Navigation from '@/components/Navigation';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useGpsSync } from '@/hooks/useGpsSync';
import TrailerEditModal from './components/TrailerEditModal';
import ManualTrailerModal from '@/components/ManualTrailerModal';
import VehicleInfoModal from '@/components/VehicleInfoModal';
import LocationEditModal from '@/components/LocationEditModal';
import NotesModal from '@/components/NotesModal';

// Import the new components
import {
  TrailerTable,
  TrailerFilters,
  TrailerStats,
  TrailerActions,
  TrailerMap
} from './components';

import { Trailer, Stats, RecentNote, CustomLocation, TrailerFilterState } from './types';

const Trailers = () => {
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [filteredTrailers, setFilteredTrailers] = useState<Trailer[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalTrailers: 0,
    activeTrailers: 0,
    inactiveTrailers: 0,
    maintenanceAlerts: 0,
    nonCompanyOwned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showLastSyncColumn, setShowLastSyncColumn] = useState(true);
  const [filters, setFilters] = useState<TrailerFilterState>({
    status: '',
    company: '',
    maintenance: ''
  });
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [isVehicleInfoModalOpen, setIsVehicleInfoModalOpen] = useState(false);
  const [vehicleInfoTrailer, setVehicleInfoTrailer] = useState<Trailer | null>(null);
  const [isLocationEditModalOpen, setIsLocationEditModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<CustomLocation | null>(null);
  const [customLocations, setCustomLocations] = useState<CustomLocation[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [selectedTrailerForNotes, setSelectedTrailerForNotes] = useState<Trailer | null>(null);
  const [recentNotes, setRecentNotes] = useState<Record<string, RecentNote>>({});
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [locationAddresses, setLocationAddresses] = useState<Record<string, string>>({});
  const [locationCityStates, setLocationCityStates] = useState<Record<string, string>>({});
  const [activeLocationFilter, setActiveLocationFilter] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [activeStatsFilter, setActiveStatsFilter] = useState<string | null>(null);
  const [maintenancePreferences, setMaintenancePreferences] = useState<{
    annual_alert_threshold: number;
    midtrip_alert_threshold: number;
    brake_alert_threshold: number;
    enable_maintenance_alerts: boolean;
  } | null>(null);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Sorting function
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        return prev.direction === 'asc' 
          ? { key, direction: 'desc' }
          : null;
      }
      return { key, direction: 'asc' };
    });
  };
  
  const { toast } = useToast();

  // Function to calculate distance between two points in miles
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Function to count trailers within 2 miles of a location
  const getTrailersNearLocation = useCallback((locationLat: number, locationLng: number): number => {
    return trailers.filter(trailer => {
      // Use lastLatitude/lastLongitude from GPS provider, fallback to latitude/longitude
      // Convert to numbers in case they're strings
      const trailerLat = parseFloat(trailer.lastLatitude || trailer.latitude || '0');
      const trailerLng = parseFloat(trailer.lastLongitude || trailer.longitude || '0');
      
      if (isNaN(trailerLat) || isNaN(trailerLng) || trailerLat === 0 || trailerLng === 0) return false;
      const distance = calculateDistance(locationLat, locationLng, trailerLat, trailerLng);
      
      // Debug logging for NRG Yard location
      if (locationLat === 41.6909 && locationLng === -87.9382) {
        console.log(`Trailer ${trailer.unitNumber}: lat=${trailerLat}, lng=${trailerLng}, distance=${distance.toFixed(2)} miles`);
      }
      
      return distance <= 2;
    }).length;
  }, [trailers]);

  // Function to handle clicking on trailer count in location table
  const handleLocationTrailerCountClick = (location: CustomLocation) => {
    // Use the same coordinate logic as getTrailersNearLocation
    const locationLat = Number(location.lat || location.latitude);
    const locationLng = Number(location.lng || location.longitude);
    
    if (activeLocationFilter && 
        activeLocationFilter.lat === locationLat && 
        activeLocationFilter.lng === locationLng) {
      // If clicking the same location, clear the filter
      setActiveLocationFilter(null);
      toast({
        title: "Filter Cleared",
        description: `Showing all trailers`,
      });
    } else {
      // Set new location filter
      const newFilter = {
        lat: locationLat,
        lng: locationLng,
        name: location.name
      };
      setActiveLocationFilter(newFilter);
      toast({
        title: "Location Filter Applied",
        description: `Showing trailers near ${location.name}`,
      });
    }
  };

  // Function to handle clicking on stats cards
  const handleStatsCardClick = (filterType: string) => {
    if (activeStatsFilter === filterType) {
      // If clicking the same filter, clear it
      setActiveStatsFilter(null);
      toast({
        title: "Filter Cleared",
        description: "Showing all trailers",
      });
    } else {
      // Set new stats filter
      setActiveStatsFilter(filterType);
      toast({
        title: "Filter Applied",
        description: `Showing ${filterType.toLowerCase()} trailers`,
      });
    }
  };

  // Function to convert coordinates to address format using backend API
  const getAddressFromCoordinates = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await geocodingAPI.reverseGeocode(lat, lng);
      
      if (response.data.success && response.data.data) {
        return response.data.data.formatted_address || 'Unknown location';
      }
      
      return 'Unknown location';
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return 'Unknown location';
    }
  };

  // Load maintenance preferences
  const loadMaintenancePreferences = useCallback(async () => {
    try {
      const response = await maintenanceAPI.getMaintenancePreferences();
      if (response.data && response.data.success) {
        setMaintenancePreferences(response.data.data);
      }
    } catch (error) {
              // Handle 403 errors gracefully for users without maintenance_settings_view permission
      if (error.response?.status === 403) {
        console.log('User does not have permission to view maintenance preferences, using defaults');
      } else {
        console.error('Error loading maintenance preferences:', error);
      }
      // Set default preferences if loading fails or access denied
      setMaintenancePreferences({
        annual_alert_threshold: 30,
        midtrip_alert_threshold: 14,
        brake_alert_threshold: 14,
        enable_maintenance_alerts: true
      });
    }
  }, []);

  // Load recent notes - optimized to load in parallel
  const loadRecentNotes = useCallback(async (trailerList: Trailer[]) => {
    try {
      const notesMap: Record<string, RecentNote> = {};
      
      // Only load notes for trailers that are likely to have them (active trailers)
      const trailersWithNotes = trailerList.filter(trailer => 
        ['available', 'dispatched'].includes(trailer.status.toLowerCase())
      );
      
      if (trailersWithNotes.length === 0) {
        setRecentNotes(notesMap);
        return;
      }
      
      // Load notes for active trailers in parallel
      const notePromises = trailersWithNotes.map(async (trailer) => {
        try {
          const response = await systemNotesAPI.getNotes('trailer', trailer.id);
          if (response.data.success && response.data.data.length > 0) {
            return { trailerId: trailer.id, note: response.data.data[0] };
          }
        } catch (error) {
          // Handle 404/403 errors silently - trailer might not have notes or user might not have access
          if (error.response?.status === 404 || error.response?.status === 403) {
            // This is expected for trailers without notes or access restrictions
            // Don't log these errors to avoid console spam
            return null;
          } else {
            // Only log unexpected errors
            console.error(`Unexpected error loading notes for trailer ${trailer.id}:`, error);
          }
        }
        return null;
      });
      
      const results = await Promise.all(notePromises);
      results.forEach(result => {
        if (result) {
          notesMap[result.trailerId] = result.note;
        }
      });
      
      setRecentNotes(notesMap);
    } catch (error) {
      console.error('Error loading recent notes:', error);
    }
  }, []);

  // Load custom locations
  const loadCustomLocations = useCallback(async (currentTrailers?: any[]) => {
    // Prevent multiple simultaneous calls
    if (loadingLocations) return;
    
    try {
      setLoadingLocations(true);
      const response = await trailerCustomLocationAPI.getCustomLocations();
      
      if (response.data.success) {
        const locations = response.data.data;
        const trailersToUse = currentTrailers || trailers;
        
        // Calculate trailer counts for each location using direct calculation
        const locationsWithCounts = locations.map((location: CustomLocation) => {
          const locationLat = Number(location.lat || location.latitude);
          const locationLng = Number(location.lng || location.longitude);
          
          // Count trailers within 2 miles directly
          const count = trailersToUse.filter(trailer => {
            const trailerLat = parseFloat(trailer.lastLatitude || trailer.latitude || '0');
            const trailerLng = parseFloat(trailer.lastLongitude || trailer.longitude || '0');
            
            if (isNaN(trailerLat) || isNaN(trailerLng) || trailerLat === 0 || trailerLng === 0) return false;
            
            const distance = calculateDistance(locationLat, locationLng, trailerLat, trailerLng);
            
            // Enhanced debug logging for NRG Yard and specific trailers
            if (location.name === 'NRG Yard' || trailer.unitNumber === '905830' || trailer.unitNumber === 'DV7571') {
              console.log(`🔍 ${location.name} - Trailer ${trailer.unitNumber}:`, {
                trailerLat,
                trailerLng,
                distance: distance.toFixed(2),
                withinRange: distance <= 2,
                address: trailer.lastAddress || trailer.address,
                lastAddress: trailer.lastAddress,
                currentAddress: trailer.address,
                hasValidCoords: !isNaN(trailerLat) && !isNaN(trailerLng) && trailerLat !== 0 && trailerLng !== 0
              });
            }
            
            return distance <= 2;
          }).length;
          
          // Debug logging for NRG Yard
          if (location.name === 'NRG Yard') {
            console.log(`🏠 NRG Yard Summary:`, {
              locationLat,
              locationLng,
              trailerCount: count,
              totalTrailers: trailersToUse.length,
              trailersWithValidCoords: trailersToUse.filter(t => {
                const lat = parseFloat(t.lastLatitude || t.latitude || '0');
                const lng = parseFloat(t.lastLongitude || t.longitude || '0');
                return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
              }).length
            });
          }
          
          return {
            ...location,
            trailerCount: count
          };
        });
        
        setCustomLocations(locationsWithCounts);
      }
    } catch (error) {
      console.error('Error loading custom locations:', error);
    } finally {
      setLoadingLocations(false);
    }
  }, [trailers, loadingLocations, calculateDistance]);

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load maintenance preferences first
      await loadMaintenancePreferences();
      
      // Load trailers
      const trailersResponse = await trailerAPI.getTrailers();
      
      // Handle different response structures
      let trailerData = [];
      if (trailersResponse.data && trailersResponse.data.success) {
        trailerData = trailersResponse.data.data || [];
      } else if (Array.isArray(trailersResponse.data)) {
        trailerData = trailersResponse.data;
      }
      
      setTrailers(trailerData);
      
      // Debug logging to check location data
      console.log('🔄 Frontend - Loaded trailers:', trailerData.length);
      if (trailerData.length > 0) {
        const sampleTrailer = trailerData[0];
        console.log('🔄 Frontend - Sample trailer location data:', {
          unitNumber: sampleTrailer.unitNumber,
          lastAddress: sampleTrailer.lastAddress,
          lastLatitude: sampleTrailer.lastLatitude,
          lastLongitude: sampleTrailer.lastLongitude,
          address: sampleTrailer.address,
          latitude: sampleTrailer.latitude,
          longitude: sampleTrailer.longitude
        });
      }
      
      // Load recent notes for each trailer
      await loadRecentNotes(trailerData);

      // Load companies
      const companiesResponse = await companyAPI.getCompaniesForFilter();
      
      let companies = [];
      if (companiesResponse.data && companiesResponse.data.success) {
        companies = companiesResponse.data.companies || companiesResponse.data.data || [];
      } else if (Array.isArray(companiesResponse.data)) {
        // Direct array response
        companies = companiesResponse.data;
      }
      
      setCompanies(companies);

      // Load custom locations after trailers are loaded to ensure accurate counts
      await loadCustomLocations(trailerData);

    } catch (error) {
      console.error('🔄 Frontend - Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load trailer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]); // Only depend on toast, not other functions

  // Use the shared GPS sync hook (after loadData is defined)
  const { refreshing, handleRefresh } = useGpsSync(loadData);

  // Calculate stats
  const calculateStats = useCallback(() => {
    const totalTrailers = trailers.length;
    const activeTrailers = trailers.filter(t => 
      ['available', 'dispatched'].includes(t.status.toLowerCase())
    ).length;
    const inactiveTrailers = trailers.filter(t => 
      ['maintenance', 'out_of_service'].includes(t.status.toLowerCase())
    ).length;
    const maintenanceAlerts = trailers.filter(t => hasMaintenanceAlerts(t)).length;
    const nonCompanyOwned = trailers.filter(t => 
      t.companyId && t.companyId.startsWith('trailer_custom_comp_')
    ).length;

    setStats({
      totalTrailers,
      activeTrailers,
      inactiveTrailers,
      maintenanceAlerts,
      nonCompanyOwned,
    });
  }, [trailers]);

  // Apply filters and sorting
  const applyFiltersAndSorting = useCallback(() => {
    let filtered = [...trailers];
    


    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trailer =>
        trailer.unitNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.vin?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.plate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(trailer => 
        trailer.status.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Apply company filter
    if (filters.company) {
      filtered = filtered.filter(trailer => 
        trailer.companyId === filters.company
      );
    }



    // Apply maintenance filter
    if (filters.maintenance) {
              // console.log('Applying maintenance filter:', filters.maintenance);
      filtered = filtered.filter(trailer => {
        const hasAlerts = hasMaintenanceAlerts(trailer);
        const hasAnnual = hasAnnualDue(trailer);
        const hasMidtrip = hasMidtripDue(trailer);
        
                  // console.log(`Trailer ${trailer.unitNumber}: alerts=${hasAlerts}, annual=${hasAnnual}, midtrip=${hasMidtrip}`);
        
        switch (filters.maintenance) {
          case 'good':
            return !hasAlerts;
          case 'annual_due':
            return hasAnnual;
          case 'midtrip_due':
            return hasMidtrip;
          case 'overdue':
            return hasAlerts;
          default:
            return true;
        }
      });
              // console.log('Filtered trailers count:', filtered.length);
    }

    // Apply location filter
    if (activeLocationFilter) {
      filtered = filtered.filter(trailer => {
        // Use lastLatitude/lastLongitude from GPS provider, fallback to latitude/longitude
        // Convert to numbers in case they're strings
        const trailerLat = parseFloat(trailer.lastLatitude || trailer.latitude || '0');
        const trailerLng = parseFloat(trailer.lastLongitude || trailer.longitude || '0');
        
        if (isNaN(trailerLat) || isNaN(trailerLng) || trailerLat === 0 || trailerLng === 0) return false;
        const distance = calculateDistance(
          activeLocationFilter.lat, 
          activeLocationFilter.lng, 
          trailerLat, 
          trailerLng
        );
        return distance <= 2;
      });
    }

    // Apply stats filter
    if (activeStatsFilter) {
      filtered = filtered.filter(trailer => {
        switch (activeStatsFilter) {
          case 'active':
            return ['available', 'dispatched'].includes(trailer.status.toLowerCase());
          case 'inactive':
            return ['maintenance', 'out_of_service'].includes(trailer.status.toLowerCase());
          case 'maintenance':
            return hasMaintenanceAlerts(trailer);
          case 'custom':
            return trailer.companyId && trailer.companyId.startsWith('trailer_custom_comp_');
          default:
            return true;
        }
      });
    }

    // Apply sorting
    if (sortConfig) {
      filtered = filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortConfig.key) {
          case 'unitNumber':
            aValue = a.unitNumber?.toLowerCase() || '';
            bValue = b.unitNumber?.toLowerCase() || '';
            break;
          case 'company':
            aValue = a.companyName?.toLowerCase() || '';
            bValue = b.companyName?.toLowerCase() || '';
            break;
          case 'status':
            aValue = a.status?.toLowerCase() || '';
            bValue = b.status?.toLowerCase() || '';
            break;
          case 'gpsStatus':
            aValue = a.gpsStatus?.toLowerCase() || '';
            bValue = b.gpsStatus?.toLowerCase() || '';
            break;
          case 'location':
            aValue = a.address?.toLowerCase() || '';
            bValue = b.address?.toLowerCase() || '';
            break;
          case 'lastSync':
            aValue = a.lastSync ? new Date(a.lastSync).getTime() : 0;
            bValue = b.lastSync ? new Date(b.lastSync).getTime() : 0;
            break;
          case 'maintenance':
            aValue = hasMaintenanceAlerts(a) ? 1 : 0;
            bValue = hasMaintenanceAlerts(b) ? 1 : 0;
            break;
          case 'notes':
            aValue = recentNotes[a.id]?.content?.toLowerCase() || '';
            bValue = recentNotes[b.id]?.content?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    setFilteredTrailers(filtered);
  }, [trailers, searchTerm, filters, activeLocationFilter, activeStatsFilter, sortConfig, recentNotes]);

  // Helper functions for maintenance filtering
  const hasMaintenanceAlerts = (trailer: Trailer): boolean => {
    // If maintenance alerts are disabled, return false
    if (!maintenancePreferences?.enable_maintenance_alerts) {
      return false;
    }
    
    const now = new Date();
    
    // Check annual inspection - overdue or due soon (within threshold)
    if (trailer.lastAnnualInspection) {
      const lastAnnual = new Date(trailer.lastAnnualInspection);
      const daysSince = Math.floor((now.getTime() - lastAnnual.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 365) return true;
    }
    
    // Check next annual inspection due - overdue or due soon (within threshold)
    if (trailer.nextAnnualInspectionDue) {
      const nextAnnual = new Date(trailer.nextAnnualInspectionDue);
      const daysUntilDue = Math.floor((nextAnnual.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0 || daysUntilDue <= (maintenancePreferences?.annual_alert_threshold || 30)) return true;
    }
    
    // Check next midtrip inspection due - overdue or due soon (within threshold)
    if (trailer.nextMidtripInspectionDue) {
      const nextMidtrip = new Date(trailer.nextMidtripInspectionDue);
      const daysUntilDue = Math.floor((nextMidtrip.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0 || daysUntilDue <= (maintenancePreferences?.midtrip_alert_threshold || 14)) return true;
    }
    
    // Check brake inspection due - overdue or due soon (within threshold)
    if (trailer.nextBrakeInspectionDue) {
      const nextBrake = new Date(trailer.nextBrakeInspectionDue);
      const daysUntilDue = Math.floor((nextBrake.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilDue < 0 || daysUntilDue <= (maintenancePreferences?.brake_alert_threshold || 14)) return true;
    }
    
    // Check tire status
    if (trailer.tireStatus === 'poor') return true;
    
    return false;
  };

  const hasAnnualDue = (trailer: Trailer): boolean => {
    const now = new Date();
    
    // Check if annual inspection is overdue
    if (trailer.lastAnnualInspection) {
      const lastAnnual = new Date(trailer.lastAnnualInspection);
      const daysSince = Math.floor((now.getTime() - lastAnnual.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 365) return true;
    }
    
    // Check if next annual inspection is due
    if (trailer.nextAnnualInspectionDue) {
      const nextAnnual = new Date(trailer.nextAnnualInspectionDue);
      if (nextAnnual < now) return true;
    }
    
    return false;
  };

  const hasMidtripDue = (trailer: Trailer): boolean => {
    const now = new Date();
    
    // Check if midtrip inspection is due
    if (trailer.nextMidtripInspectionDue) {
      const nextMidtrip = new Date(trailer.nextMidtripInspectionDue);
      if (nextMidtrip < now) return true;
    }
    
    return false;
  };

  // Event handlers

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      status: '',
      company: '',
      gpsStatus: '',
      maintenance: ''
    });
    setActiveLocationFilter(null);
    setActiveStatsFilter(null);
    setSearchTerm('');
  };

  const handleEditTrailer = (trailer: Trailer) => {
    setSelectedTrailer(trailer);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedTrailer(null);
  };

  const handleSaveTrailer = async (trailerId: string, data: any) => {
    try {
      await trailerAPI.updateTrailer(trailerId, data);
      toast({
        title: "Success",
        description: "Trailer updated successfully",
      });
      await loadData();
    } catch (error) {
      console.error('Error saving trailer:', error);
      toast({
        title: "Error",
        description: "Failed to update trailer",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTrailer = async (trailerId: string) => {
    try {
      await trailerAPI.deleteTrailer(trailerId);
      toast({
        title: "Success",
        description: "Trailer deleted successfully",
      });
      await loadData();
    } catch (error) {
      console.error('Error deleting trailer:', error);
      toast({
        title: "Error",
        description: "Failed to delete trailer",
        variant: "destructive",
      });
    }
  };

  const handleAddTrailer = () => {
    setIsManualModalOpen(true);
  };

  const handleCloseManualModal = () => {
    setIsManualModalOpen(false);
  };

  const handleCreateTrailer = async (trailerData: any) => {
    try {
      await trailerAPI.createTrailer(trailerData);
      toast({
        title: "Success",
        description: "Trailer created successfully",
      });
      await loadData();
    } catch (error) {
      console.error('Error creating trailer:', error);
      toast({
        title: "Error",
        description: "Failed to create trailer",
        variant: "destructive",
      });
    }
  };

  const handleOpenNotes = (trailer: Trailer) => {
    setSelectedTrailerForNotes(trailer);
    setIsNotesModalOpen(true);
  };

  const handleOpenVehicleInfo = (trailer: Trailer) => {
    setVehicleInfoTrailer(trailer);
    setIsVehicleInfoModalOpen(true);
  };

  const handleCloseVehicleInfo = () => {
    setIsVehicleInfoModalOpen(false);
    setVehicleInfoTrailer(null);
  };

  const handleCloseNotes = () => {
    setIsNotesModalOpen(false);
    setSelectedTrailerForNotes(null);
  };

  const handleNoteChange = async () => {
    // Refresh recent notes for all trailers
    await loadRecentNotes(trailers);
  };

  const handleEditLocation = (location: CustomLocation) => {
    setSelectedLocation(location);
    setIsLocationEditModalOpen(true);
  };

  const handleCloseLocationEditModal = () => {
    setIsLocationEditModalOpen(false);
    setSelectedLocation(null);
  };

  const handleDeleteLocation = async (locationId: string) => {
    try {
      await trailerCustomLocationAPI.deleteCustomLocation(locationId);
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      await loadCustomLocations(trailers);
    } catch (error) {
      console.error('Error deleting location:', error);
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      });
    }
  };

  const handleAddLocation = async () => {
    try {
      const newLocation = {
        name: `Location ${customLocations.length + 1}`,
        lat: 37.7749 + (customLocations.length * 0.1),
        lng: -122.4194 + (customLocations.length * 0.1),
        address: `San Francisco, CA ${customLocations.length + 1}`,
        color: '#8b5cf6',
        icon_name: 'map-pin',
        type: 'yard'
      };
      await trailerCustomLocationAPI.createCustomLocation(newLocation);
      await loadCustomLocations(trailers);
      toast({
        title: "Location Added",
        description: `${newLocation.name} has been added`,
        variant: "default",
      });
    } catch (error: unknown) {
      console.error('Error creating location:', error);
      let errorMessage = "Failed to create location";
      
      if (error && typeof error === 'object' && 'response' in error && 
          typeof error.response === 'object' && error.response) {
        const response = error.response as { status?: number; data?: { error?: string } };
        if (response.status === 401) {
          errorMessage = "Please log in to create locations";
        } else if (response.data?.error) {
          errorMessage = response.data.error;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Effects
  useEffect(() => {
    loadData();
  }, []); // Only run once on mount

  useEffect(() => {
    calculateStats();
  }, [trailers]); // Only run when trailers change

  useEffect(() => {
    applyFiltersAndSorting();
  }, [trailers, searchTerm, filters, activeLocationFilter, activeStatsFilter, sortConfig, recentNotes]); // Direct dependencies

  // Reload custom locations when trailers change
  useEffect(() => {
    if (trailers.length > 0) {
      const timeoutId = setTimeout(() => {
        loadCustomLocations(trailers);
      }, 100); // Small delay to prevent rapid re-renders
      
      return () => clearTimeout(timeoutId);
    }
  }, [trailers]); // Only depend on trailers, not loadCustomLocations

  const hasActiveFilters = Object.values(filters).some(value => value !== '') || 
    activeLocationFilter !== null || 
    activeStatsFilter !== null || 
    searchTerm !== '';

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trailers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 lg:p-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Trailers</h1>
          
                     {/* Actions and Search - Top Right */}
           <TrailerActions
             searchTerm={searchTerm}
             onSearchChange={setSearchTerm}
             onRefresh={handleRefresh}
             onAddTrailer={handleAddTrailer}
             onToggleLastSyncColumn={() => setShowLastSyncColumn(!showLastSyncColumn)}
             showLastSyncColumn={showLastSyncColumn}
             refreshing={refreshing}
             customLocations={customLocations}
             onAddLocation={handleAddLocation}
             loadingLocations={loadingLocations}
             showFilters={showFilters}
             onToggleFilters={() => setShowFilters(!showFilters)}
             hasActiveFilters={hasActiveFilters}
             onClearFilters={handleClearFilters}
             activeStatsFilter={activeStatsFilter}
             filters={filters}
             activeLocationFilter={activeLocationFilter}
           />
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <TrailerStats
            stats={stats}
            activeStatsFilter={activeStatsFilter}
            onStatsCardClick={handleStatsCardClick}
          />
        </div>

        {/* Custom Locations Table */}
        <div className="mb-8">
          <TrailerMap
            customLocations={customLocations}
            activeLocationFilter={activeLocationFilter}
            onLocationTrailerCountClick={handleLocationTrailerCountClick}
            onEditLocation={handleEditLocation}
            onDeleteLocation={handleDeleteLocation}
            loadingLocations={loadingLocations}
          />
        </div>

        {/* Filters */}
        <div className="mb-8">
          <TrailerFilters
            showFilters={showFilters}
            filters={filters}
            companies={companies}
            onToggleFilters={() => setShowFilters(!showFilters)}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Trailer Table */}
        <div className="mb-8">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <div className="text-muted-foreground">Loading trailers...</div>
                    </div>
                  </div>
                ) : (
                  <TrailerTable
                    trailers={filteredTrailers}
                    showLastSyncColumn={showLastSyncColumn}
                    recentNotes={recentNotes}
                    onEditTrailer={handleEditTrailer}
                    onOpenNotes={handleOpenNotes}
                    onOpenVehicleInfo={handleOpenVehicleInfo}
                    hasActiveFilters={hasActiveFilters}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    maintenancePreferences={maintenancePreferences}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <TrailerEditModal
        trailer={selectedTrailer}
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleSaveTrailer}
        onDelete={handleDeleteTrailer}
      />

      <ManualTrailerModal
        isOpen={isManualModalOpen}
        onClose={handleCloseManualModal}
        onSave={handleCreateTrailer}
        companies={companies}
      />

      <VehicleInfoModal
        trailer={vehicleInfoTrailer}
        isOpen={isVehicleInfoModalOpen}
        onClose={() => setIsVehicleInfoModalOpen(false)}
        onTrailerUpdated={loadData}
      />

      <LocationEditModal
        trailer={selectedLocation}
        isOpen={isLocationEditModalOpen}
        onClose={handleCloseLocationEditModal}
        onLocationUpdated={() => {
          loadData();
        }}
      />

      <NotesModal
        isOpen={isNotesModalOpen}
        onClose={handleCloseNotes}
        trailerId={selectedTrailerForNotes?.id || ''}
        trailerName={selectedTrailerForNotes?.unitNumber}
        onNoteChange={handleNoteChange}
      />
    </div>
  );
};

export default Trailers;
