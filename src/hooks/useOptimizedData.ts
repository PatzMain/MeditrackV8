import { useState, useEffect, useCallback, useRef } from 'react';
import { cacheService } from '../services/cacheService';

interface UseOptimizedDataOptions<T> {
  enabled?: boolean;
  retryCount?: number;
  retryDelay?: number;
  staleTime?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseOptimizedDataReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
}

export function useOptimizedData<T>(
  queryKey: string,
  queryFn: () => Promise<T>,
  options: UseOptimizedDataOptions<T> = {}
): UseOptimizedDataReturn<T> {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    staleTime = 5 * 60 * 1000, // 5 minutes
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchData = useCallback(async (): Promise<void> => {
    if (!enabled || !mountedRef.current) return;

    // Check cache first
    const cachedData = cacheService.get(queryKey);
    if (cachedData) {
      setData(cachedData);
      setIsStale(false);
      onSuccess?.(cachedData);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn();

      if (!mountedRef.current) return;

      // Cache the result
      cacheService.set(queryKey, result, staleTime);

      setData(result);
      setIsStale(false);
      retryCountRef.current = 0;
      onSuccess?.(result);
    } catch (err) {
      if (!mountedRef.current) return;

      const error = err instanceof Error ? err : new Error('Unknown error');

      // Retry logic
      if (retryCountRef.current < retryCount) {
        retryCountRef.current++;
        setTimeout(() => {
          if (mountedRef.current) {
            fetchData();
          }
        }, retryDelay * retryCountRef.current);
        return;
      }

      setError(error);
      onError?.(error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [queryKey, queryFn, enabled, retryCount, retryDelay, staleTime, onSuccess, onError]);

  // Check if data is stale
  useEffect(() => {
    const checkStale = () => {
      if (data) {
        const cached = cacheService.get(queryKey);
        setIsStale(!cached);
      }
    };

    const interval = setInterval(checkStale, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [data, queryKey]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = useCallback(async (): Promise<void> => {
    // Clear cache for this query
    cacheService.clear(queryKey);
    retryCountRef.current = 0;
    await fetchData();
  }, [queryKey, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
  };
}

// Hook for paginated data
interface UsePaginatedDataOptions<T> extends UseOptimizedDataOptions<T> {
  pageSize?: number;
  initialPage?: number;
}

interface UsePaginatedDataReturn<T> extends UseOptimizedDataReturn<T> {
  page: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount: number;
  nextPage: () => void;
  previousPage: () => void;
  goToPage: (page: number) => void;
}

export function usePaginatedData<T>(
  queryKey: string,
  queryFn: (page: number, pageSize: number) => Promise<{ data: T; count: number }>,
  options: UsePaginatedDataOptions<T> = {}
): UsePaginatedDataReturn<T> {
  const { pageSize = 20, initialPage = 1, ...restOptions } = options;
  const [page, setPage] = useState(initialPage);
  const [totalCount, setTotalCount] = useState(0);

  const paginatedQueryFn = useCallback(async () => {
    const result = await queryFn(page, pageSize);
    setTotalCount(result.count);
    return result.data;
  }, [queryFn, page, pageSize]);

  const {
    data,
    loading,
    error,
    refetch,
    isStale,
  } = useOptimizedData(
    `${queryKey}_page_${page}_size_${pageSize}`,
    paginatedQueryFn,
    restOptions
  );

  const hasNextPage = page * pageSize < totalCount;
  const hasPreviousPage = page > 1;

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(totalCount / pageSize)) {
      setPage(newPage);
    }
  }, [totalCount, pageSize]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    page,
    hasNextPage,
    hasPreviousPage,
    totalCount,
    nextPage,
    previousPage,
    goToPage,
  };
}

// Hook for infinite scroll data
interface UseInfiniteDataReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useInfiniteData<T>(
  queryKey: string,
  queryFn: (page: number, pageSize: number) => Promise<{ data: T[]; count: number }>,
  pageSize: number = 20
): UseInfiniteDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchPage = useCallback(async (pageNumber: number, reset = false) => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const cacheKey = `${queryKey}_infinite_page_${pageNumber}_size_${pageSize}`;
      const cachedResult = cacheService.get(cacheKey);

      let result: { data: T[]; count: number };
      if (cachedResult) {
        result = cachedResult;
      } else {
        result = await queryFn(pageNumber, pageSize);
        cacheService.set(cacheKey, result);
      }

      setTotalCount(result.count);
      setHasNextPage(pageNumber * pageSize < result.count);

      if (reset) {
        setData(result.data);
      } else {
        setData(prev => [...prev, ...result.data]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setLoading(false);
    }
  }, [queryKey, queryFn, pageSize, loading]);

  const fetchNextPage = useCallback(async () => {
    if (hasNextPage && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      await fetchPage(nextPage);
    }
  }, [hasNextPage, loading, page, fetchPage]);

  const refetch = useCallback(async () => {
    // Clear infinite cache
    cacheService.clearByPattern(`${queryKey}_infinite`);
    setPage(1);
    await fetchPage(1, true);
  }, [queryKey, fetchPage]);

  useEffect(() => {
    fetchPage(1, true);
  }, []);

  return {
    data,
    loading,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  };
}