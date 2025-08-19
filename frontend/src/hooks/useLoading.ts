// ============================================================================
// LOADING STATE MANAGEMENT HOOKS
// ============================================================================

import { useState, useCallback } from 'react';

interface LoadingState {
  [key: string]: boolean;
}

export function useLoading(initialStates: LoadingState = {}) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>(initialStates);

  const setLoading = useCallback((key: string, isLoading: boolean) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: isLoading,
    }));
  }, []);

  const startLoading = useCallback((key: string) => {
    setLoading(key, true);
  }, [setLoading]);

  const stopLoading = useCallback((key: string) => {
    setLoading(key, false);
  }, [setLoading]);

  const isLoading = useCallback((key: string) => {
    return loadingStates[key] || false;
  }, [loadingStates]);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some(loading => loading);
  }, [loadingStates]);

  const resetAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  const withLoading = useCallback(async <T>(
    key: string,
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    startLoading(key);
    try {
      const result = await asyncFn();
      return result;
    } finally {
      stopLoading(key);
    }
  }, [startLoading, stopLoading]);

  return {
    loadingStates,
    setLoading,
    startLoading,
    stopLoading,
    isLoading,
    isAnyLoading,
    resetAll,
    withLoading,
  };
}

// Specialized loading hooks for common patterns
export function usePageLoading() {
  const { loadingStates, setLoading, startLoading, stopLoading, isLoading, withLoading } = useLoading({
    initial: true,
    refreshing: false,
  });

  const loadData = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('initial', asyncFn);
  }, [withLoading]);

  const refreshData = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('refreshing', asyncFn);
  }, [withLoading]);

  return {
    loading: isLoading('initial'),
    refreshing: isLoading('refreshing'),
    loadData,
    refreshData,
    setLoading,
    startLoading,
    stopLoading,
  };
}

export function useModalLoading() {
  const { loadingStates, setLoading, startLoading, stopLoading, isLoading, withLoading } = useLoading({
    submitting: false,
    loading: false,
  });

  const submit = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('submitting', asyncFn);
  }, [withLoading]);

  const load = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('loading', asyncFn);
  }, [withLoading]);

  return {
    submitting: isLoading('submitting'),
    loading: isLoading('loading'),
    submit,
    load,
    setLoading,
    startLoading,
    stopLoading,
  };
}

export function useTableLoading() {
  const { loadingStates, setLoading, startLoading, stopLoading, isLoading, withLoading } = useLoading({
    loading: true,
    refreshing: false,
    deleting: false,
    updating: false,
  });

  const loadData = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('loading', asyncFn);
  }, [withLoading]);

  const refreshData = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('refreshing', asyncFn);
  }, [withLoading]);

  const deleteItem = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('deleting', asyncFn);
  }, [withLoading]);

  const updateItem = useCallback(async <T>(
    asyncFn: () => Promise<T>
  ): Promise<T> => {
    return withLoading('updating', asyncFn);
  }, [withLoading]);

  return {
    loading: isLoading('loading'),
    refreshing: isLoading('refreshing'),
    deleting: isLoading('deleting'),
    updating: isLoading('updating'),
    loadData,
    refreshData,
    deleteItem,
    updateItem,
    setLoading,
    startLoading,
    stopLoading,
  };
}
