// ============================================================================
// REUSABLE API HOOKS
// ============================================================================

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export function useApi<T = any>() {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });
  const { toast } = useToast();

  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
      showToast?: boolean;
    }
  ) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await apiCall();
      
      if (response.success) {
        setState({
          data: response.data || null,
          loading: false,
          error: null,
        });
        
        if (options?.showToast !== false && options?.successMessage) {
          toast({
            title: "Success",
            description: options.successMessage,
          });
        }
        
        return response;
      } else {
        const errorMsg = options?.errorMessage || response.error || 'Operation failed';
        setState({
          data: null,
          loading: false,
          error: errorMsg,
        });
        
        if (options?.showToast !== false) {
          toast({
            title: "Error",
            description: errorMsg,
            variant: "destructive",
          });
        }
        
        return response;
      }
    } catch (error) {
      const errorMsg = options?.errorMessage || 'An unexpected error occurred';
      setState({
        data: null,
        loading: false,
        error: errorMsg,
      });
      
      if (options?.showToast !== false) {
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      }
      
      return { success: false, error: errorMsg };
    }
  }, [toast]);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hooks for common operations
export function useCreateApi<T = any>() {
  const api = useApi<T>();
  
  const create = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>,
    entityName: string = 'Item'
  ) => {
    return api.execute(apiCall, {
      successMessage: `${entityName} created successfully`,
      errorMessage: `Failed to create ${entityName.toLowerCase()}`,
    });
  }, [api]);
  
  return {
    ...api,
    create,
  };
}

export function useUpdateApi<T = any>() {
  const api = useApi<T>();
  
  const update = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>,
    entityName: string = 'Item'
  ) => {
    return api.execute(apiCall, {
      successMessage: `${entityName} updated successfully`,
      errorMessage: `Failed to update ${entityName.toLowerCase()}`,
    });
  }, [api]);
  
  return {
    ...api,
    update,
  };
}

export function useDeleteApi() {
  const api = useApi();
  
  const remove = useCallback(async (
    apiCall: () => Promise<ApiResponse<any>>,
    entityName: string = 'Item'
  ) => {
    return api.execute(apiCall, {
      successMessage: `${entityName} deleted successfully`,
      errorMessage: `Failed to delete ${entityName.toLowerCase()}`,
    });
  }, [api]);
  
  return {
    ...api,
    remove,
  };
}

export function useFetchApi<T = any>() {
  const api = useApi<T>();
  
  const fetch = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>,
    entityName: string = 'Data'
  ) => {
    return api.execute(apiCall, {
      errorMessage: `Failed to fetch ${entityName.toLowerCase()}`,
      showToast: false, // Don't show success toast for fetch operations
    });
  }, [api]);
  
  return {
    ...api,
    fetch,
  };
}
