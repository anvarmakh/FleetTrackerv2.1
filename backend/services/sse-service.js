/**
 * Server-Sent Events (SSE) Service
 * Manages real-time client connections and notifications
 */
class SSEService {
    constructor() {
        this.activeConnections = new Map();
    }

    /**
     * Register a client for SSE notifications
     * @param {string} userId - User ID
     * @param {Object} response - Express response object
     */
    registerClient(userId, response) {
        this.activeConnections.set(userId, response);
        console.log(`📡 SSE client registered: ${userId}`);
        
        // Route sets SSE headers after auth. Do not set headers here to avoid duplicates.

        // Send initial connection message
        this.notifyClient(userId, {
            type: 'connection_established',
            message: 'SSE connection established',
            timestamp: new Date().toISOString()
        });

        // Handle client disconnect
        response.on('close', () => {
            this.removeClient(userId);
        });

        response.on('error', (error) => {
            console.error(`SSE error for user ${userId}:`, error);
            this.removeClient(userId);
        });
    }

    /**
     * Remove a client connection
     * @param {string} userId - User ID
     */
    removeClient(userId) {
        this.activeConnections.delete(userId);
        console.log(`📡 SSE client disconnected: ${userId}`);
    }

    /**
     * Notify a specific client
     * @param {string} userId - User ID
     * @param {Object} data - Data to send
     */
    notifyClient(userId, data) {
        const response = this.activeConnections.get(userId);
        if (response && !response.destroyed) {
            try {
                response.write(`data: ${JSON.stringify(data)}\n\n`);
            } catch (error) {
                console.error('SSE write error:', error);
                this.removeClient(userId);
            }
        }
    }

    /**
     * Notify all connected clients
     * @param {Object} data - Data to send
     */
    notifyAllClients(data) {
        for (const [userId, response] of this.activeConnections.entries()) {
            this.notifyClient(userId, data);
        }
    }

    /**
     * Get connection status for a user
     * @param {string} userId - User ID
     * @returns {boolean} True if user has active connection
     */
    hasConnection(userId) {
        return this.activeConnections.has(userId);
    }

    /**
     * Get total number of active connections
     * @returns {number} Number of active connections
     */
    getConnectionCount() {
        return this.activeConnections.size;
    }

    /**
     * Get list of connected user IDs
     * @returns {Array} Array of user IDs with active connections
     */
    getConnectedUsers() {
        return Array.from(this.activeConnections.keys());
    }

    /**
     * Clean up all connections
     */
    cleanup() {
        for (const [userId, response] of this.activeConnections.entries()) {
            try {
                if (!response.destroyed) {
                    response.end();
                }
            } catch (error) {
                console.error(`Error closing SSE connection for user ${userId}:`, error);
            }
        }
        this.activeConnections.clear();
        console.log('📡 All SSE connections cleaned up');
    }
}

module.exports = new SSEService(); 
