// Cache Service for API Response Optimization
class CacheService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes default

  // Generate cache key from function name and parameters
  private generateKey(service: string, method: string, params?: any): string {
    const paramStr = params ? JSON.stringify(params) : '';
    return `${service}_${method}_${paramStr}`;
  }

  // Set cache with custom TTL
  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  // Get cached data if still valid
  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  // Check if cache exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // Clear specific cache
  clear(key: string): void {
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll(): void {
    this.cache.clear();
  }

  // Clear cache by pattern (service or method)
  clearByPattern(pattern: string): void {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  // Wrapper function to cache API calls
  async cachedCall<T>(
    service: string,
    method: string,
    apiCall: () => Promise<T>,
    params?: any,
    ttl?: number
  ): Promise<T> {
    const key = this.generateKey(service, method, params);
    const cached = this.get(key);

    if (cached) {
      return cached;
    }

    try {
      const data = await apiCall();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Export singleton instance
export const cacheService = new CacheService();

// Cache TTL constants for different data types
export const CACHE_TTL = {
  SHORT: 30 * 1000,      // 30 seconds - for frequently changing data
  MEDIUM: 5 * 60 * 1000,  // 5 minutes - for moderately changing data
  LONG: 30 * 60 * 1000,   // 30 minutes - for rarely changing data
  STATIC: 24 * 60 * 60 * 1000, // 24 hours - for static data like classifications
};