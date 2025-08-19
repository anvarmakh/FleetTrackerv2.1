/**
 * Database Security Monitoring Service
 * Monitors database operations for potential security issues and provides alerts
 */

const logger = require('../utils/logger');

class DatabaseSecurityMonitor {
    constructor() {
        this.suspiciousQueries = [];
        this.failedQueries = [];
        this.rateLimitViolations = new Map();
        this.maxQueriesPerMinute = 100;
        this.maxFailedQueriesPerMinute = 10;
    }

    /**
     * Monitor query execution for security issues
     * @param {string} query - SQL query being executed
     * @param {Array} params - Query parameters
     * @param {string} userId - User ID executing the query
     * @param {string} source - Source of the query (e.g., 'trailer-manager', 'user-manager')
     */
    monitorQuery(query, params, userId, source) {
        try {
            // Check for suspicious patterns
            this.checkSuspiciousPatterns(query, userId, source);
            
            // Check rate limiting
            this.checkRateLimit(userId);
            
            // Log query for audit trail
            this.logQuery(query, params, userId, source);
            
        } catch (error) {
            logger.error('Database security monitoring error:', error);
        }
    }

    /**
     * Record failed query for security analysis
     * @param {string} query - Failed SQL query
     * @param {Error} error - Error that occurred
     * @param {string} userId - User ID
     * @param {string} source - Source of the query
     */
    recordFailedQuery(query, error, userId, source) {
        const failedQuery = {
            query,
            error: error.message,
            userId,
            source,
            timestamp: new Date(),
            ip: this.getClientIP()
        };

        this.failedQueries.push(failedQuery);
        
        // Keep only last 100 failed queries
        if (this.failedQueries.length > 100) {
            this.failedQueries.shift();
        }

        // Check for potential attack patterns
        this.analyzeFailedQueries();
    }

    /**
     * Check for suspicious SQL patterns
     * @param {string} query - SQL query to analyze
     * @param {string} userId - User ID
     * @param {string} source - Source of the query
     */
    checkSuspiciousPatterns(query, userId, source) {
        const suspiciousPatterns = [
            /union\s+select/i,
            /drop\s+table/i,
            /delete\s+from/i,
            /insert\s+into/i,
            /update\s+set/i,
            /alter\s+table/i,
            /create\s+table/i,
            /exec\s*\(/i,
            /xp_cmdshell/i,
            /sp_executesql/i
        ];

        for (const pattern of suspiciousPatterns) {
            if (pattern.test(query)) {
                const alert = {
                    type: 'SUSPICIOUS_QUERY',
                    query,
                    userId,
                    source,
                    pattern: pattern.source,
                    timestamp: new Date(),
                    severity: 'HIGH'
                };

                this.suspiciousQueries.push(alert);
                logger.warn('🚨 Suspicious database query detected:', alert);
                
                // In production, you might want to block the query or send alerts
                if (process.env.NODE_ENV === 'production') {
                    this.sendSecurityAlert(alert);
                }
            }
        }
    }

    /**
     * Check rate limiting for database queries
     * @param {string} userId - User ID
     */
    checkRateLimit(userId) {
        const now = Date.now();
        const minuteAgo = now - 60000;

        if (!this.rateLimitViolations.has(userId)) {
            this.rateLimitViolations.set(userId, []);
        }

        const userQueries = this.rateLimitViolations.get(userId);
        
        // Remove queries older than 1 minute
        const recentQueries = userQueries.filter(timestamp => timestamp > minuteAgo);
        
        if (recentQueries.length > this.maxQueriesPerMinute) {
            logger.warn(`🚨 Rate limit exceeded for user ${userId}: ${recentQueries.length} queries in 1 minute`);
            
            // In production, you might want to temporarily block the user
            if (process.env.NODE_ENV === 'production') {
                this.sendRateLimitAlert(userId, recentQueries.length);
            }
        }

        // Update user's query count
        recentQueries.push(now);
        this.rateLimitViolations.set(userId, recentQueries);
    }

    /**
     * Analyze failed queries for attack patterns
     */
    analyzeFailedQueries() {
        const now = Date.now();
        const minuteAgo = now - 60000;
        
        // Get failed queries from the last minute
        const recentFailures = this.failedQueries.filter(
            fq => fq.timestamp.getTime() > minuteAgo
        );

        // Group by user
        const failuresByUser = new Map();
        recentFailures.forEach(failure => {
            if (!failuresByUser.has(failure.userId)) {
                failuresByUser.set(failure.userId, []);
            }
            failuresByUser.get(failure.userId).push(failure);
        });

        // Check for users with too many failed queries
        for (const [userId, failures] of failuresByUser) {
            if (failures.length > this.maxFailedQueriesPerMinute) {
                logger.warn(`🚨 High failure rate for user ${userId}: ${failures.length} failed queries in 1 minute`);
                
                // Check for SQL injection attempts
                const injectionAttempts = failures.filter(failure => 
                    /union|select|drop|delete|insert|update|alter|create|exec/i.test(failure.query)
                );

                if (injectionAttempts.length > 0) {
                    logger.error(`🚨 Potential SQL injection attempt by user ${userId}:`, injectionAttempts);
                    
                    if (process.env.NODE_ENV === 'production') {
                        this.sendInjectionAlert(userId, injectionAttempts);
                    }
                }
            }
        }
    }

    /**
     * Log query for audit trail
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @param {string} userId - User ID
     * @param {string} source - Source of the query
     */
    logQuery(query, params, userId, source) {
        // In production, you might want to log to a separate audit database
        if (process.env.NODE_ENV === 'production') {
            logger.info('Database query executed:', {
                query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                paramCount: params.length,
                userId,
                source,
                timestamp: new Date().toISOString()
            });
        }
    }

    /**
     * Send security alert (placeholder for production implementation)
     * @param {Object} alert - Security alert object
     */
    sendSecurityAlert(alert) {
        // In production, implement actual alerting (email, Slack, etc.)
        console.error('🚨 SECURITY ALERT:', alert);
    }

    /**
     * Send rate limit alert
     * @param {string} userId - User ID
     * @param {number} queryCount - Number of queries
     */
    sendRateLimitAlert(userId, queryCount) {
        console.error(`🚨 RATE LIMIT ALERT: User ${userId} exceeded limit with ${queryCount} queries`);
    }

    /**
     * Send injection attempt alert
     * @param {string} userId - User ID
     * @param {Array} attempts - Injection attempts
     */
    sendInjectionAlert(userId, attempts) {
        console.error(`🚨 INJECTION ALERT: User ${userId} attempted SQL injection:`, attempts);
    }

    /**
     * Get client IP address (placeholder)
     * @returns {string} Client IP
     */
    getClientIP() {
        // In production, implement actual IP detection
        return 'unknown';
    }

    /**
     * Get security statistics
     * @returns {Object} Security statistics
     */
    getSecurityStats() {
        const now = Date.now();
        const hourAgo = now - 3600000;
        
        const recentSuspicious = this.suspiciousQueries.filter(
            sq => sq.timestamp.getTime() > hourAgo
        );
        
        const recentFailures = this.failedQueries.filter(
            fq => fq.timestamp.getTime() > hourAgo
        );

        return {
            suspiciousQueriesLastHour: recentSuspicious.length,
            failedQueriesLastHour: recentFailures.length,
            totalSuspiciousQueries: this.suspiciousQueries.length,
            totalFailedQueries: this.failedQueries.length,
            activeUsers: this.rateLimitViolations.size
        };
    }

    /**
     * Clear old data to prevent memory leaks
     */
    cleanup() {
        const now = Date.now();
        const dayAgo = now - 86400000;

        // Clear old suspicious queries
        this.suspiciousQueries = this.suspiciousQueries.filter(
            sq => sq.timestamp.getTime() > dayAgo
        );

        // Clear old failed queries
        this.failedQueries = this.failedQueries.filter(
            fq => fq.timestamp.getTime() > dayAgo
        );

        // Clear old rate limit data
        for (const [userId, queries] of this.rateLimitViolations) {
            const recentQueries = queries.filter(timestamp => timestamp > dayAgo);
            if (recentQueries.length === 0) {
                this.rateLimitViolations.delete(userId);
            } else {
                this.rateLimitViolations.set(userId, recentQueries);
            }
        }
    }
}

// Create singleton instance
const databaseSecurityMonitor = new DatabaseSecurityMonitor();

// Cleanup old data every hour
setInterval(() => {
    databaseSecurityMonitor.cleanup();
}, 3600000);

module.exports = databaseSecurityMonitor;

