import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { trailerAPI, companyAPI, trailerCustomCompaniesAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Map from '@/components/Map';
import Navigation from '@/components/Navigation';
import { RefreshCw, Truck, MapPin, AlertTriangle, CheckCircle, Search, Building2, ChevronDown, Filter, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useGpsSync } from '@/hooks/useGpsSync';
import { extractCityState } from '@/lib/utils';

interface Stats {
  totalTrailers: number;
  activeTrailers: number;
  inactiveTrailers: number;
  maintenanceAlerts: number;
}

interface Trailer {
  id: string;
  unit_number?: string;
  unitNumber?: string;
  lastLatitude?: number;
  lastLongitude?: number;
  status: string;
  gps_status?: string;
  gpsStatus?: string;
  companyId?: string;
  companyName?: string;
  companyColor?: string;
  lastAddress?: string;
  address?: string;
}

interface MarketCluster {
  id: string;
  latitude: number;
  longitude: number;
  trailers: Trailer[];
  totalCount: number;
  availableCount: number;
  dispatchedCount: number;
  inactiveCount: number;
  marketName: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Redirect SystemAdmin users to admin dashboard
  useEffect(() => {
    const isSystemAdmin = user?.organizationRole === 'systemAdmin';
    if (isSystemAdmin) {
      navigate('/admin');
    }
  }, [user, navigate]);
  
  const [stats, setStats] = useState<Stats>({
    totalTrailers: 0,
    activeTrailers: 0,
    inactiveTrailers: 0,
    maintenanceAlerts: 0,
  });
  const [trailers, setTrailers] = useState<Trailer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarketSummary, setShowMarketSummary] = useState(true);
  const [showMarketDropdown, setShowMarketDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    company: ''
  });
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; type?: string; color?: string }>>([]);
  const { toast } = useToast();

  // Add sorting state
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.market-dropdown')) {
        setShowMarketDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Function to calculate distance between two points in miles
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Function to group trailers into market clusters
  const createMarketClusters = useCallback((trailers: Trailer[]): MarketCluster[] => {
    const clusters: MarketCluster[] = [];
    const CLUSTER_RADIUS = 50; // 50 miles radius for clustering
    const MIN_CLUSTER_SIZE = 3; // Only merge if there are more than 3 trailers

    trailers.forEach((trailer) => {
      if (!trailer.lastLatitude || !trailer.lastLongitude) return;

      // Find existing cluster within radius
      let foundCluster = false;
      for (const cluster of clusters) {
        const distance = calculateDistance(
          cluster.latitude,
          cluster.longitude,
          trailer.lastLatitude,
          trailer.lastLongitude
        );

        if (distance <= CLUSTER_RADIUS) {
          // Add trailer to existing cluster
          cluster.trailers.push(trailer);
          cluster.totalCount++;
          
          // Update counts
          if (trailer.status === 'available') {
            cluster.availableCount++;
          } else if (trailer.status === 'dispatched') {
            cluster.dispatchedCount++;
          } else {
            cluster.inactiveCount++;
          }

          // Update cluster center (average position)
          cluster.latitude = cluster.trailers.reduce((sum, t) => sum + t.lastLatitude, 0) / cluster.trailers.length;
          cluster.longitude = cluster.trailers.reduce((sum, t) => sum + t.lastLongitude, 0) / cluster.trailers.length;

          foundCluster = true;
          break;
        }
      }

      // Create new cluster if no nearby cluster found
      if (!foundCluster) {
        // Extract market name from address using centralized utility
        const address = trailer.lastAddress || trailer.address || '';
        const marketName = extractCityState(address);

        const newCluster: MarketCluster = {
          id: `cluster_${trailer.lastLatitude}_${trailer.lastLongitude}`,
          latitude: trailer.lastLatitude,
          longitude: trailer.lastLongitude,
          trailers: [trailer],
          totalCount: 1,
          availableCount: trailer.status === 'available' ? 1 : 0,
          dispatchedCount: trailer.status === 'dispatched' ? 1 : 0,
          inactiveCount: trailer.status !== 'available' && trailer.status !== 'dispatched' ? 1 : 0,
          marketName: marketName
        };
        clusters.push(newCluster);
      }
    });

    // Filter clusters to only show those with more than MIN_CLUSTER_SIZE trailers
    // For clusters with 3 or fewer trailers, we'll show individual markers instead
    return clusters.filter(cluster => cluster.totalCount > MIN_CLUSTER_SIZE).sort((a, b) => b.totalCount - a.totalCount);
  }, []);

  // Memoize filtered trailers to prevent unnecessary re-renders
  const filteredTrailers = useMemo(() => {
    let filtered = trailers.filter(trailer => {
      const matchesSearch = searchTerm === '' || 
        trailer.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.unitNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trailer.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filters.status === '' || trailer.status === filters.status;
      const matchesCompany = filters.company === '' || trailer.companyId === filters.company;
      
      return matchesSearch && matchesStatus && matchesCompany;
    });

    // Apply sorting if configured
    if (sortConfig) {
      filtered.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'unitNumber':
            aValue = a.unit_number || a.unitNumber || '';
            bValue = b.unit_number || b.unitNumber || '';
            break;
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'company':
            aValue = a.companyName || '';
            bValue = b.companyName || '';
            break;
          case 'lastSync':
            aValue = (a as any).last_sync || (a as any).lastSync || '';
            bValue = (b as any).last_sync || (b as any).lastSync || '';
            break;
          default:
            aValue = a[sortConfig.key as keyof Trailer] || '';
            bValue = b[sortConfig.key as keyof Trailer] || '';
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
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

    return filtered;
  }, [trailers, searchTerm, filters.status, filters.company, sortConfig]);

  // Memoize market clusters to prevent unnecessary re-renders
  const marketClusters = useMemo(() => {
    return createMarketClusters(filteredTrailers);
  }, [createMarketClusters, filteredTrailers]);

  // Memoize the Map component props to prevent unnecessary re-renders
  const mapTrailers = useMemo(() => {
    return filteredTrailers;
  }, [filteredTrailers]);

  // Stable callback for market dropdown toggle
  const toggleMarketDropdown = useCallback(() => {
    setShowMarketDropdown(prev => !prev);
  }, []);

  // Memoize market dropdown to prevent unnecessary re-renders
  const marketDropdownContent = useMemo(() => {
    if (!showMarketSummary || marketClusters.length === 0) return null;
    
    return (
      <div className="relative market-dropdown">
        <Button 
          onClick={toggleMarketDropdown}
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-xs font-medium text-foreground hover:bg-accent ml-2"
        >
          <Building2 className="w-3 h-3" />
          <ChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${showMarketDropdown ? 'rotate-180' : ''}`} />
        </Button>
        
        {/* Dropdown Content */}
        {showMarketDropdown && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-background border border-border rounded-lg shadow-lg z-50">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-foreground">Market Summary</span>
                <Badge variant="secondary" className="text-xs">
                  {marketClusters.length} markets
                </Badge>
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {marketClusters.map((cluster) => (
                  <div key={cluster.id} className="flex items-center justify-between p-2 bg-accent/50 rounded text-xs hover:bg-accent transition-colors">
                    <span className="font-medium text-foreground break-words">{cluster.marketName}</span>
                    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                      {cluster.totalCount}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }, [showMarketSummary, marketClusters, showMarketDropdown, toggleMarketDropdown]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [statsResponse, trailersResponse, companiesResponse, customCompaniesResponse] = await Promise.all([
        trailerAPI.getStats(),
        trailerAPI.getTrailers(),
        companyAPI.getCompaniesForFilter(),
        trailerCustomCompaniesAPI.getCustomCompanies(),
      ]);

      // Handle different response structures with proper type assertions
      const trailersData = (trailersResponse as any).data?.data || (trailersResponse as any).data?.trailers || trailersResponse.data || [];
      const companiesData = (companiesResponse as any).data?.companies || (companiesResponse as any).data?.data || companiesResponse.data || [];
      const customCompaniesData = (customCompaniesResponse as any).data?.data || [];
      
      // Combine regular companies and custom companies for filtering
      const allCompanies = [
        ...companiesData.map((company: any) => ({
          id: company.id,
          name: company.name,
          type: 'regular',
          color: company.color || '#3b82f6' // Default blue for regular companies
        })),
        ...customCompaniesData.map((customCompany: any) => ({
          id: customCompany.id,
          name: customCompany.name,
          type: 'custom',
          color: customCompany.color || '#6b7280'
        }))
      ];
      
      // Create a map of company IDs to colors for quick lookup
      const companyColorMap: Record<string, string> = {};
      allCompanies.forEach(company => {
        companyColorMap[company.id] = company.color || '#6b7280';
      });
      
      // Add company colors to trailers
      const trailersWithColors = trailersData.map((trailer: any) => {
        // Try different possible company ID field names
        const companyId = trailer.companyId || trailer.company_id || trailer.companyId;
        let companyColor = companyColorMap[companyId] || '#6b7280';
        
        // If no color found and there's only one company, use that company's color
        if (companyColor === '#6b7280' && allCompanies.length === 1) {
          companyColor = allCompanies[0].color;
        }
        
        return {
          ...trailer,
          companyColor: companyColor
        };
      });
      
      setStats((statsResponse as any).data?.data || (statsResponse as any).data || {});
      setTrailers(trailersWithColors);
      setCompanies(allCompanies);
      
      // Market clusters will be automatically updated via useMemo when trailers change
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      toast({
        title: "Error loading dashboard",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [createMarketClusters, toast]);

  // Use the shared GPS sync hook (after loadDashboardData is defined)
  const { refreshing, handleRefresh } = useGpsSync(loadDashboardData);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);



  const clearFilters = () => {
    setFilters({ status: '', company: '' });
    setSearchTerm('');
  };

  const hasActiveFilters = filters.status !== '' || filters.company !== '' || searchTerm !== '';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Full Screen Map Container */}
      <div className="relative h-[calc(100vh-80px)]">
        <Map trailers={mapTrailers} />
        
                 {/* Stats and Market Summary Overlay */}
         <div className="absolute top-4 left-4 z-10">
           <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                                         <div className="flex items-center space-x-6">
                {/* Market Summary Dropdown - Most Left */}
                {marketDropdownContent}

                <div className="border-l border-border pl-4">
                  <div className="flex items-center space-x-2">
                    <Truck className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Total:</span>
                    <span className="text-sm font-bold text-foreground">{stats.totalTrailers}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-xs font-medium text-muted-foreground">Alerts:</span>
                  <span className="text-sm font-bold text-warning">{stats.maintenanceAlerts}</span>
                </div>
                
                <div className="border-l border-gray-300 pl-4">
                  <Button 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                  >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
           </div>
         </div>

        {/* Search and Filter Controls */}
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg">
            <div className="flex items-center p-3">
              <Search className="w-4 h-4 text-muted-foreground mr-3" />
              <input
                type="text"
                placeholder="Search trailers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none text-sm w-64 placeholder:text-muted-foreground/60 text-foreground"
              />
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="ghost"
                size="sm"
                className={`ml-2 h-8 w-8 p-0 ${showFilters ? 'bg-primary/20 text-primary' : ''}`}
              >
                <Filter className="w-4 h-4" />
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={clearFilters}
                  variant="ghost"
                  size="sm"
                  className="ml-1 h-8 w-8 p-0 text-destructive hover:text-destructive/80"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
            
            {/* Filter Panel */}
            {showFilters && (
              <div className="border-t border-border p-3 space-y-3">
                                 <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className="text-xs font-medium text-foreground mb-1 block">Status</label>
                     <select
                       value={filters.status}
                       onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                       className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                     >
                                               <option value="">All Statuses</option>
                        <option value="available">Available</option>
                        <option value="dispatched">Moving</option>
                        <option value="maintenance">Maintenance</option>
                        <option value="out_of_service">Out of Service</option>
                     </select>
                   </div>
                   
                   <div>
                     <label className="text-xs font-medium text-foreground mb-1 block">Company</label>
                     <select
                       value={filters.company}
                       onChange={(e) => setFilters({ ...filters, company: e.target.value })}
                       className="w-full text-xs border border-border rounded px-2 py-1 bg-background text-foreground"
                     >
                       <option value="">All Companies ({companies.length})</option>
                       {companies && companies.length > 0 ? (
                         companies.map(company => (
                           <option key={company.id} value={company.id}>
                             {company.type === 'custom' ? `📋 ${company.name} (Custom)` : company.name}
                           </option>
                         ))
                       ) : (
                         <option value="" disabled>No companies available</option>
                       )}
                     </select>
                   </div>
                 </div>
                
                {hasActiveFilters && (
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Showing {filteredTrailers.length} of {trailers.length} trailers</span>
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs"
                    >
                      Clear All
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default Dashboard;