import { useState, useEffect, useCallback } from 'react';
import { trailerAPI, companyAPI, trailerCustomCompaniesAPI, systemNotesAPI, geocodingAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { TrailerData, CompanyData, NoteData } from '@/lib/api';

interface TrailerStats {
  totalTrailers: number;
  activeTrailers: number;
  inactiveTrailers: number;
  maintenanceAlerts: number;
  nonCompanyOwned: number;
}

interface TrailerFilters {
  status: string;
  company: string;
  gpsStatus: string;
  maintenance: string;
}

interface UseTrailersReturn {
  // State
  trailers: TrailerData[];
  filteredTrailers: TrailerData[];
  stats: TrailerStats;
  companies: CompanyData[];
  loading: boolean;
  refreshing: boolean;
  searchTerm: string;
  showFilters: boolean;
  filters: TrailerFilters;
  recentNotes: Record<string, NoteData>;
  
  // Actions
  setSearchTerm: (term: string) => void;
  setShowFilters: (show: boolean) => void;
  setFilters: (filters: TrailerFilters) => void;
  refreshData: () => Promise<void>;
  loadData: () => Promise<void>;
  getAddressFromCoordinates: (lat: number, lng: number) => Promise<string>;
  getCityStateFromCoordinates: (lat: number, lng: number) => Promise<string>;
  loadRecentNotes: (trailers: TrailerData[]) => Promise<void>;
}

export const useTrailers = (): UseTrailersReturn => {
  const [trailers, setTrailers] = useState<TrailerData[]>([]);
  const [filteredTrailers, setFilteredTrailers] = useState<TrailerData[]>([]);
  const [stats, setStats] = useState<TrailerStats>({
    totalTrailers: 0,
    activeTrailers: 0,
    inactiveTrailers: 0,
    maintenanceAlerts: 0,
    nonCompanyOwned: 0,
  });
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<TrailerFilters>({
    status: '',
    company: '',
    gpsStatus: '',
    maintenance: ''
  });
  const [recentNotes, setRecentNotes] = useState<Record<string, NoteData>>({});
  
  const { toast } = useToast();

  // Function to convert coordinates to address format using backend API
  const getAddressFromCoordinates = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await geocodingAPI.reverseGeocode(lat, lng);
      if (response.data.success && response.data.data && response.data.data.formatted_address) {
        return response.data.data.formatted_address;
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting address from coordinates:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  // Function to get city and state from coordinates
  const getCityStateFromCoordinates = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await geocodingAPI.reverseGeocode(lat, lng);
      if (response.data.success && response.data.data) {
        const { city, state } = response.data.data;
        if (city && state) {
          return `${city}, ${state}`;
        }
      }
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch (error) {
      console.error('Error getting city/state from coordinates:', error);
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }, []);

  // Load recent notes for trailers
  const loadRecentNotes = useCallback(async (trailers: TrailerData[]) => {
    try {
      // Load recent notes for each trailer in parallel for better performance
      const notePromises = trailers.map(async (trailer) => {
        try {
          const response = await systemNotesAPI.getNotes({ trailerId: trailer.id, limit: 1 });
          const notes = response.data.data || response.data.notes || [];
          return { trailerId: trailer.id, note: notes[0] };
        } catch (error) {
          console.error(`Error loading notes for trailer ${trailer.id}:`, error);
          return { trailerId: trailer.id, note: null };
        }
      });

      const noteResults = await Promise.all(notePromises);
      const notesMap: Record<string, NoteData> = {};
      
      noteResults.forEach(({ trailerId, note }) => {
        if (note) {
          notesMap[trailerId] = note;
        }
      });
      
      setRecentNotes(notesMap);
    } catch (error) {
      console.error('Error loading recent notes:', error);
    }
  }, []);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [trailersResponse, statsResponse, companiesResponse, customCompaniesResponse] = await Promise.all([
        trailerAPI.getTrailers(),
        trailerAPI.getStats(),
        companyAPI.getUserCompanies(),
        trailerCustomCompaniesAPI.getCustomCompanies()
      ]);
      
      // Fix: Access the correct data structure from API responses
      const trailersData = trailersResponse.data.data || trailersResponse.data.trailers || [];
      
      setTrailers(trailersData);
      
      // Set stats from backend (now includes non-company owned calculation)
      const statsData = statsResponse.data.data || statsResponse.data;
      setStats(statsData);
      
      const companiesData = companiesResponse.data.companies || companiesResponse.data.data || companiesResponse.data || [];
      const customCompaniesData = customCompaniesResponse.data.data || [];
      
      // Combine regular companies and custom companies for filtering
      const allCompanies = [
        ...companiesData,
        ...customCompaniesData.map((customCompany: CompanyData) => ({
          id: customCompany.id,
          name: customCompany.name,
          type: 'custom',
          color: customCompany.color || '#6b7280'
        }))
      ];
      
      setCompanies(allCompanies);
      
      // Load recent notes after trailers are loaded
      await loadRecentNotes(trailersData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load trailer data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadRecentNotes, toast]);

  // Refresh data
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadData();
      toast({
        title: "Success",
        description: "Data refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [loadData, toast]);

  // Filter trailers based on search term and filters
  useEffect(() => {
    let filtered = trailers;

    // Apply search filter
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(trailer => {
        const unitNumber = (trailer.unitNumber || '').toLowerCase();
        const make = (trailer.make || '').toLowerCase();
        const model = (trailer.model || '').toLowerCase();
        const vin = (trailer.vin || '').toLowerCase();
        const plate = (trailer.plate || '').toLowerCase();
        const address = (trailer.address || '').toLowerCase();
        const companyName = (trailer.companyName || '').toLowerCase();
        
        return unitNumber.includes(query) ||
               make.includes(query) ||
               model.includes(query) ||
               vin.includes(query) ||
               plate.includes(query) ||
               address.includes(query) ||
               companyName.includes(query);
      });
    }

    // Apply status filter
    if (filters.status) {
      filtered = filtered.filter(trailer => trailer.status === filters.status);
    }

    // Apply company filter
    if (filters.company) {
      filtered = filtered.filter(trailer => trailer.companyId === filters.company);
    }

    // Apply GPS status filter
    if (filters.gpsStatus) {
      filtered = filtered.filter(trailer => trailer.gpsStatus === filters.gpsStatus);
    }

    // Apply maintenance filter
    if (filters.maintenance) {
      filtered = filtered.filter(trailer => {
        if (filters.maintenance === 'overdue') {
          return trailer.maintenance?.alertCount && trailer.maintenance.alertCount > 0;
        }
        return true;
      });
    }

    setFilteredTrailers(filtered);
  }, [trailers, searchTerm, filters]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    // State
    trailers,
    filteredTrailers,
    stats,
    companies,
    loading,
    refreshing,
    searchTerm,
    showFilters,
    filters,
    recentNotes,
    
    // Actions
    setSearchTerm,
    setShowFilters,
    setFilters,
    refreshData,
    loadData,
    getAddressFromCoordinates,
    getCityStateFromCoordinates,
    loadRecentNotes,
  };
};

