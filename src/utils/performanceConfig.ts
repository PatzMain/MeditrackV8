// Performance optimization configuration

// Cache presets for different data types
export const CACHE_PRESETS = {
  // Static data that rarely changes
  STATIC: {
    ttl: 24 * 60 * 60 * 1000, // 24 hours
    staleTime: 12 * 60 * 60 * 1000, // 12 hours
  },

  // Reference data like classifications, departments
  REFERENCE: {
    ttl: 4 * 60 * 60 * 1000, // 4 hours
    staleTime: 2 * 60 * 60 * 1000, // 2 hours
  },

  // User data and profiles
  USER_DATA: {
    ttl: 30 * 60 * 1000, // 30 minutes
    staleTime: 15 * 60 * 1000, // 15 minutes
  },

  // Dashboard and summary data
  DASHBOARD: {
    ttl: 10 * 60 * 1000, // 10 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
  },

  // Real-time data like inventory levels
  REALTIME: {
    ttl: 2 * 60 * 1000, // 2 minutes
    staleTime: 1 * 60 * 1000, // 1 minute
  },

  // Activity logs and audit data
  LOGS: {
    ttl: 5 * 60 * 1000, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
  }
};

// Pagination defaults
export const PAGINATION_CONFIG = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  INFINITE_SCROLL_THRESHOLD: 0.8, // Load more when 80% scrolled
  PREFETCH_NEXT_PAGE: true,
};

// Query optimization settings
export const QUERY_CONFIG = {
  // Retry configuration
  RETRY_COUNT: 3,
  RETRY_DELAY: 1000, // Base delay in ms
  RETRY_MULTIPLIER: 2, // Exponential backoff

  // Timeout settings
  QUERY_TIMEOUT: 30000, // 30 seconds
  FAST_QUERY_TIMEOUT: 10000, // 10 seconds for simple queries

  // Debounce settings
  SEARCH_DEBOUNCE: 300, // ms
  FILTER_DEBOUNCE: 150, // ms

  // Background refresh
  BACKGROUND_REFETCH: true,
  STALE_TIME_THRESHOLD: 5 * 60 * 1000, // 5 minutes
};

// Performance monitoring thresholds
export const PERFORMANCE_THRESHOLDS = {
  SLOW_QUERY_WARNING: 3000, // ms
  MEMORY_WARNING: 100 * 1024 * 1024, // 100MB
  CACHE_SIZE_WARNING: 1000, // number of cached items
  RENDER_WARNING: 100, // ms for component render
};

// API optimization settings
export const API_CONFIG = {
  // Concurrent request limits
  MAX_CONCURRENT_REQUESTS: 6,
  REQUEST_TIMEOUT: 30000,

  // Batch request settings
  BATCH_SIZE: 10,
  BATCH_DELAY: 50, // ms to wait before sending batch

  // Compression
  ENABLE_COMPRESSION: true,

  // Select only needed fields
  MINIMAL_SELECTS: {
    patients: 'id,patient_id,first_name,last_name,created_at',
    inventory: 'id,generic_name,brand_name,stock_quantity,status,minimum_stock_level',
    consultations: 'id,patient_id,consultation_date,diagnosis,created_at',
    users: 'id,username,first_name,last_name,role,department'
  }
};

// Image and asset optimization
export const ASSET_CONFIG = {
  // Lazy loading
  IMAGE_LAZY_LOADING: true,
  INTERSECTION_THRESHOLD: 0.1,
  ROOT_MARGIN: '50px',

  // Image optimization
  WEBP_SUPPORT: true,
  IMAGE_QUALITY: 85,
  THUMBNAIL_SIZE: 150,

  // Preloading
  PRELOAD_CRITICAL_ASSETS: true,
  PREFETCH_NEXT_ROUTE: false, // Can be enabled for better UX
};

// Development vs Production settings
export const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return {
    ENABLE_PERFORMANCE_LOGGING: isDevelopment,
    ENABLE_CACHE_DEBUGGING: isDevelopment,
    ENABLE_QUERY_DEBUGGING: isDevelopment,
    STRICT_ERROR_HANDLING: !isDevelopment,

    // Adjust cache times for development
    CACHE_TTL_MULTIPLIER: isDevelopment ? 0.1 : 1, // Shorter cache in dev

    // Development helpers
    MOCK_SLOW_QUERIES: isDevelopment && false, // Set to true to simulate slow queries
    MOCK_NETWORK_ERRORS: isDevelopment && false, // Set to true to test error handling
  };
};

// Performance optimization utilities
export const performanceUtils = {
  // Check if we should use cache
  shouldUseCache: (queryKey: string, lastFetch?: number): boolean => {
    if (!lastFetch) return true;

    const now = Date.now();
    const preset = CACHE_PRESETS.DASHBOARD; // Default preset
    return (now - lastFetch) > preset.staleTime;
  },

  // Get optimal page size based on viewport
  getOptimalPageSize: (): number => {
    const viewportHeight = window.innerHeight;
    const estimatedRowHeight = 60; // Approximate row height
    const visibleRows = Math.floor(viewportHeight / estimatedRowHeight);

    // Load 2-3 screens worth of data
    const optimalSize = Math.min(
      Math.max(visibleRows * 2, PAGINATION_CONFIG.DEFAULT_PAGE_SIZE),
      PAGINATION_CONFIG.MAX_PAGE_SIZE
    );

    return optimalSize;
  },

  // Check if device has good network conditions
  hasGoodConnection: (): boolean => {
    if ('connection' in navigator) {
      // @ts-ignore
      const connection = navigator.connection as any;
      return connection.effectiveType === '4g' && !connection.saveData;
    }
    return true; // Assume good connection if not supported
  },

  // Determine if we should prefetch data
  shouldPrefetch: (): boolean => {
    return performanceUtils.hasGoodConnection() &&
           !window.matchMedia('(prefers-reduced-data: reduce)').matches;
  },

  // Memory usage check
  checkMemoryUsage: (): { used: number; available: number; warning: boolean } => {
    if ('memory' in performance) {
      // @ts-ignore
      const memory = performance.memory as any;
      const used = memory.usedJSHeapSize;
      const available = memory.jsHeapSizeLimit - used;
      const warning = used > PERFORMANCE_THRESHOLDS.MEMORY_WARNING;

      return { used, available, warning };
    }

    return { used: 0, available: 0, warning: false };
  }
};

export default {
  CACHE_PRESETS,
  PAGINATION_CONFIG,
  QUERY_CONFIG,
  PERFORMANCE_THRESHOLDS,
  API_CONFIG,
  ASSET_CONFIG,
  getEnvironmentConfig,
  performanceUtils
};