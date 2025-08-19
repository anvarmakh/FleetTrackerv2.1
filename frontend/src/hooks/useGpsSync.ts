import { useState } from 'react';
import { refreshAPI } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface UseGpsSyncReturn {
  refreshing: boolean;
  handleRefresh: () => Promise<void>;
}

/**
 * Custom hook for GPS sync functionality
 * Uses the consolidated refresh service for consistent behavior
 */
export const useGpsSync = (onRefreshComplete?: () => void): UseGpsSyncReturn => {
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
              console.log('📍 Starting location refresh...');
        
        // Use the location refresh service
        const response = await refreshAPI.refreshLocations();
        
        if (response.data.success) {
          console.log('✅ Location refresh started successfully');
          
          toast({
            title: "Location Refresh Started",
            description: `Location refresh initiated for ${response.data.stats?.providers || 0} providers across ${response.data.stats?.companies || 0} companies`,
          });
        
        // Call the completion callback to reload data
        if (onRefreshComplete) {
          console.log('🔄 Reloading dashboard data after GPS sync...');
          await onRefreshComplete();
        }
      } else {
        console.error('❌ Failed to start manual refresh:', response.data.error);
        toast({
          title: "Sync Error",
          description: response.data.error || "Failed to start GPS sync",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error('❌ GPS sync error:', error);
      toast({
        title: "Sync Error",
        description: "Failed to start GPS sync",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  return {
    refreshing,
    handleRefresh
  };
};
