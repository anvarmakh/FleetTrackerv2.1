/**
 * Cache Service
 * Provides in-memory caching for frequently accessed data to improve performance
 */

const { CACHE_KEYS, CACHE_TTL } = require('../utils/constants');
const logger = require('../utils/logger');

class CacheService {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };
        
        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Get value from cache
     * @param {string} key - Cache key
     * @param {string} tenantId - Tenant ID for multi-tenant caching
     * @returns {any} Cached value or null if not found/expired
     */
    get(key, tenantId = null) {
        const cacheKey = this.buildKey(key, tenantId);
        const item = this.cache.get(cacheKey);
        
        if (!item) {
            this.stats.misses++;
            return null;
        }
        
        // Check if expired
        if (Date.now() > item.expiresAt) {
            this.delete(key, tenantId);
            this.stats.misses++;
            return null;
        }
        
        this.stats.hits++;
        return item.value;
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {string} tenantId - Tenant ID for multi-tenant caching
     * @param {number} ttl - Time to live in seconds (optional, uses default from constants)
     */
    set(key, value, tenantId = null, ttl = null) {
        const cacheKey = this.buildKey(key, tenantId);
        const ttlSeconds = ttl || CACHE_TTL[key] || 300; // Default 5 minutes
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        
        // Clear existing timer if any
        if (this.timers.has(cacheKey)) {
            clearTimeout(this.timers.get(cacheKey));
        }
        
        // Set cache item
        this.cache.set(cacheKey, {
            value,
            expiresAt,
            createdAt: Date.now(),
            ttl: ttlSeconds
        });
        
        // Set timer for automatic cleanup
        const timer = setTimeout(() => {
            this.delete(key, tenantId);
        }, ttlSeconds * 1000);
        
        this.timers.set(cacheKey, timer);
        this.stats.sets++;
        
        logger.debug(`Cache set: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @param {string} tenantId - Tenant ID for multi-tenant caching
     */
    delete(key, tenantId = null) {
        const cacheKey = this.buildKey(key, tenantId);
        
        // Clear timer
        if (this.timers.has(cacheKey)) {
            clearTimeout(this.timers.get(cacheKey));
            this.timers.delete(cacheKey);
        }
        
        // Remove from cache
        this.cache.delete(cacheKey);
        this.stats.deletes++;
        
        logger.debug(`Cache deleted: ${cacheKey}`);
    }

    /**
     * Clear all cache entries for a tenant
     * @param {string} tenantId - Tenant ID
     */
    clearTenant(tenantId) {
        const keysToDelete = [];
        
        for (const [key] of this.cache) {
            if (key.includes(`:tenant:${tenantId}`)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            // Extract original key and tenant from cache key
            const parts = key.split(':tenant:');
            const originalKey = parts[0];
            const keyTenantId = parts[1];
            this.delete(originalKey, keyTenantId);
        });
        
        logger.info(`Cleared cache for tenant: ${tenantId} (${keysToDelete.length} entries)`);
    }

    /**
     * Clear all cache entries
     */
    clear() {
        // Clear all timers
        for (const timer of this.timers.values()) {
            clearTimeout(timer);
        }
        
        const size = this.cache.size;
        this.cache.clear();
        this.timers.clear();
        
        logger.info(`Cache cleared: ${size} entries`);
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const totalRequests = this.stats.hits + this.stats.misses;
        const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests * 100).toFixed(2) : 0;
        
        return {
            ...this.stats,
            totalRequests,
            hitRate: `${hitRate}%`,
            currentSize: this.cache.size,
            activeTimers: this.timers.size
        };
    }

    /**
     * Get cache keys (for debugging)
     * @returns {Array} Array of cache keys
     */
    getKeys() {
        return Array.from(this.cache.keys());
    }

    /**
     * Build cache key with tenant prefix
     * @param {string} key - Original key
     * @param {string} tenantId - Tenant ID
     * @returns {string} Full cache key
     */
    buildKey(key, tenantId) {
        return tenantId ? `${key}:tenant:${tenantId}` : key;
    }

    /**
     * Start periodic cleanup of expired entries
     */
    startCleanupInterval() {
        // Clean up expired entries every 5 minutes
        setInterval(() => {
            this.cleanupExpired();
        }, 5 * 60 * 1000);
    }

    /**
     * Remove expired cache entries
     */
    cleanupExpired() {
        const now = Date.now();
        const keysToDelete = [];
        
        for (const [key, item] of this.cache) {
            if (now > item.expiresAt) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            // Extract original key and tenant from cache key
            const parts = key.split(':tenant:');
            const originalKey = parts[0];
            const tenantId = parts[1] || null;
            this.delete(originalKey, tenantId);
        });
        
        if (keysToDelete.length > 0) {
            logger.debug(`Cleanup removed ${keysToDelete.length} expired cache entries`);
        }
    }

    /**
     * Cache wrapper for async functions
     * @param {string} key - Cache key
     * @param {Function} fn - Async function to cache
     * @param {string} tenantId - Tenant ID
     * @param {number} ttl - Time to live in seconds
     * @returns {Promise<any>} Cached or fresh result
     */
    async cached(key, fn, tenantId = null, ttl = null) {
        // Try to get from cache first
        const cached = this.get(key, tenantId);
        if (cached !== null) {
            return cached;
        }
        
        // Execute function and cache result
        try {
            const result = await fn();
            this.set(key, result, tenantId, ttl);
            return result;
        } catch (error) {
            logger.error(`Cache function error for key ${key}:`, error);
            throw error;
        }
    }

    /**
     * Invalidate cache entries by pattern
     * @param {string} pattern - Pattern to match keys (supports wildcards)
     * @param {string} tenantId - Tenant ID
     */
    invalidatePattern(pattern, tenantId = null) {
        const keysToDelete = [];
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        
        for (const [key] of this.cache) {
            const parts = key.split(':tenant:');
            const originalKey = parts[0];
            const keyTenantId = parts[1] || null;
            
            // Check if key matches pattern and tenant
            if (regex.test(originalKey) && (!tenantId || keyTenantId === tenantId)) {
                keysToDelete.push({ key: originalKey, tenantId: keyTenantId });
            }
        }
        
        keysToDelete.forEach(({ key, tenantId }) => {
            this.delete(key, tenantId);
        });
        
        logger.info(`Invalidated ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
    }
}

// Create singleton instance
const cacheService = new CacheService();

module.exports = cacheService;
