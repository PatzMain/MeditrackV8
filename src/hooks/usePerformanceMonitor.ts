import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  apiCallCount: number;
  cacheHitRate: number;
}

export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>(Date.now());
  const renderCount = useRef<number>(0);
  const apiCallCount = useRef<number>(0);
  const cacheHits = useRef<number>(0);
  const totalCacheAttempts = useRef<number>(0);

  useEffect(() => {
    renderCount.current++;

    // Log performance metrics in development
    if (process.env.NODE_ENV === 'development') {
      const renderTime = Date.now() - startTime.current;
      console.log(`🔍 Performance Monitor - ${componentName}:`, {
        renderCount: renderCount.current,
        renderTime: `${renderTime}ms`,
        apiCallCount: apiCallCount.current,
        cacheHitRate: totalCacheAttempts.current > 0
          ? `${((cacheHits.current / totalCacheAttempts.current) * 100).toFixed(1)}%`
          : 'N/A'
      });
    }
  });

  const trackApiCall = useCallback(() => {
    apiCallCount.current++;
  }, []);

  const trackCacheHit = useCallback(() => {
    cacheHits.current++;
    totalCacheAttempts.current++;
  }, []);

  const trackCacheMiss = useCallback(() => {
    totalCacheAttempts.current++;
  }, []);

  const getMetrics = useCallback((): PerformanceMetrics => {
    return {
      loadTime: Date.now() - startTime.current,
      renderTime: renderCount.current,
      apiCallCount: apiCallCount.current,
      cacheHitRate: totalCacheAttempts.current > 0
        ? (cacheHits.current / totalCacheAttempts.current) * 100
        : 0
    };
  }, []);

  // Web Vitals monitoring
  useEffect(() => {
    if ('web-vital' in window) {
      // @ts-ignore
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  }, []);

  return {
    trackApiCall,
    trackCacheHit,
    trackCacheMiss,
    getMetrics
  };
};

// Performance optimization utilities
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Intersection Observer for lazy loading
export const useIntersectionObserver = (
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
) => {
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!targetRef.current) return;

    observerRef.current = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '20px',
      ...options
    });

    observerRef.current.observe(targetRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);

  return targetRef;
};

// Memory usage monitoring (for development)
export const useMemoryMonitor = () => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
      const logMemory = () => {
        // @ts-ignore
        const memory = performance.memory;
        console.log('🧠 Memory Usage:', {
          used: `${Math.round(memory.usedJSHeapSize / 1048576)}MB`,
          total: `${Math.round(memory.totalJSHeapSize / 1048576)}MB`,
          limit: `${Math.round(memory.jsHeapSizeLimit / 1048576)}MB`
        });
      };

      const interval = setInterval(logMemory, 30000); // Log every 30 seconds
      return () => clearInterval(interval);
    }
  }, []);
};