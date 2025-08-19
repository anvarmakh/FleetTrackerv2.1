/**
 * Rate Limiter Service
 * Provides rate limiting for auto-refresh operations to prevent system overload
 */

const { RATE_LIMITING } = require('../utils/constants');
const logger = require('../utils/logger');

class RateLimiter {
    constructor() {
        this.limits = new Map();
        this.queues = new Map();
        this.processing = new Set();
    }

    /**
     * Check if operation is allowed for a tenant
     * @param {string} tenantId - Tenant ID
     * @param {string} operation - Operation type (e.g., 'gps_sync', 'maintenance')
     * @param {number} maxOperations - Maximum operations per time window
     * @param {number} windowMs - Time window in milliseconds
     * @returns {boolean} True if operation is allowed
     */
    isAllowed(tenantId, operation, maxOperations = 10, windowMs = 60000) {
        const key = `${tenantId}:${operation}`;
        const now = Date.now();
        
        if (!this.limits.has(key)) {
            this.limits.set(key, []);
        }
        
        const operations = this.limits.get(key);
        
        // Remove operations outside the time window
        const validOperations = operations.filter(timestamp => now - timestamp < windowMs);
        this.limits.set(key, validOperations);
        
        // Check if we're under the limit
        if (validOperations.length < maxOperations) {
            validOperations.push(now);
            this.limits.set(key, validOperations);
            return true;
        }
        
        return false;
    }

    /**
     * Wait for rate limit to allow operation
     * @param {string} tenantId - Tenant ID
     * @param {string} operation - Operation type
     * @param {number} maxOperations - Maximum operations per time window
     * @param {number} windowMs - Time window in milliseconds
     * @param {number} maxWaitMs - Maximum wait time in milliseconds
     * @returns {Promise<boolean>} True if operation can proceed
     */
    async waitForAllowance(tenantId, operation, maxOperations = 10, windowMs = 60000, maxWaitMs = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < maxWaitMs) {
            if (this.isAllowed(tenantId, operation, maxOperations, windowMs)) {
                return true;
            }
            
            // Wait before checking again
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        logger.warn(`Rate limit exceeded for tenant ${tenantId}, operation ${operation}`);
        return false;
    }

    /**
     * Queue operation for processing with rate limiting
     * @param {string} tenantId - Tenant ID
     * @param {string} operation - Operation type
     * @param {Function} fn - Function to execute
     * @param {Object} options - Rate limiting options
     * @returns {Promise<any>} Result of the operation
     */
    async queueOperation(tenantId, operation, fn, options = {}) {
        const {
            maxOperations = 10,
            windowMs = 60000,
            maxWaitMs = 30000,
            priority = 0
        } = options;
        
        const queueKey = `${tenantId}:${operation}`;
        
        if (!this.queues.has(queueKey)) {
            this.queues.set(queueKey, []);
        }
        
        const queue = this.queues.get(queueKey);
        
        // Create queue item
        const queueItem = {
            id: Date.now() + Math.random(),
            priority,
            fn,
            resolve: null,
            reject: null,
            timestamp: Date.now()
        };
        
        // Create promise for this operation
        const promise = new Promise((resolve, reject) => {
            queueItem.resolve = resolve;
            queueItem.reject = reject;
        });
        
        // Add to queue (sorted by priority, then timestamp)
        queue.push(queueItem);
        queue.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority; // Higher priority first
            }
            return a.timestamp - b.timestamp; // Earlier timestamp first
        });
        
        // Process queue if not already processing
        if (!this.processing.has(queueKey)) {
            this.processQueue(queueKey, maxOperations, windowMs);
        }
        
        return promise;
    }

    /**
     * Process operations in queue with rate limiting
     * @param {string} queueKey - Queue key
     * @param {number} maxOperations - Maximum operations per time window
     * @param {number} windowMs - Time window in milliseconds
     */
    async processQueue(queueKey, maxOperations, windowMs) {
        this.processing.add(queueKey);
        
        try {
            const queue = this.queues.get(queueKey);
            
            while (queue.length > 0) {
                const item = queue.shift();
                
                // Wait for rate limit allowance
                const allowed = await this.waitForAllowance(
                    queueKey.split(':')[0],
                    queueKey.split(':')[1],
                    maxOperations,
                    windowMs,
                    30000
                );
                
                if (!allowed) {
                    // Put item back at the end of queue
                    queue.push(item);
                    break;
                }
                
                // Execute operation
                try {
                    const result = await item.fn();
                    item.resolve(result);
                } catch (error) {
                    item.reject(error);
                }
                
                // Add delay between operations
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITING.BETWEEN_PROVIDERS));
            }
        } finally {
            this.processing.delete(queueKey);
        }
    }

    /**
     * Get rate limiting statistics
     * @returns {Object} Rate limiting statistics
     */
    getStats() {
        const stats = {
            activeLimits: this.limits.size,
            activeQueues: this.queues.size,
            processingQueues: this.processing.size,
            limits: {},
            queues: {}
        };
        
        // Get details for each limit
        for (const [key, operations] of this.limits) {
            const [tenantId, operation] = key.split(':');
            if (!stats.limits[tenantId]) {
                stats.limits[tenantId] = {};
            }
            stats.limits[tenantId][operation] = operations.length;
        }
        
        // Get details for each queue
        for (const [key, queue] of this.queues) {
            const [tenantId, operation] = key.split(':');
            if (!stats.queues[tenantId]) {
                stats.queues[tenantId] = {};
            }
            stats.queues[tenantId][operation] = queue.length;
        }
        
        return stats;
    }

    /**
     * Clear rate limiting data for a tenant
     * @param {string} tenantId - Tenant ID
     */
    clearTenant(tenantId) {
        // Clear limits
        for (const [key] of this.limits) {
            if (key.startsWith(`${tenantId}:`)) {
                this.limits.delete(key);
            }
        }
        
        // Clear queues
        for (const [key, queue] of this.queues) {
            if (key.startsWith(`${tenantId}:`)) {
                // Reject all pending operations
                queue.forEach(item => {
                    item.reject(new Error('Tenant cleared from rate limiter'));
                });
                this.queues.delete(key);
            }
        }
        
        // Remove from processing
        for (const key of this.processing) {
            if (key.startsWith(`${tenantId}:`)) {
                this.processing.delete(key);
            }
        }
        
        logger.info(`Cleared rate limiting data for tenant: ${tenantId}`);
    }

    /**
     * Clear all rate limiting data
     */
    clear() {
        // Reject all pending operations
        for (const [key, queue] of this.queues) {
            queue.forEach(item => {
                item.reject(new Error('Rate limiter cleared'));
            });
        }
        
        this.limits.clear();
        this.queues.clear();
        this.processing.clear();
        
        logger.info('Rate limiter cleared');
    }
}

// Create singleton instance
const rateLimiter = new RateLimiter();

module.exports = rateLimiter;
