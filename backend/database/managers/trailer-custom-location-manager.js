/**
 * Trailer Custom Location Manager
 * Handles trailer-specific custom location management for companies and users
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    executeQueryCamelCase, executeQueryFirstCamelCase,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');

const { LOCATION_TYPES } = require('../../utils/constants');
const BaseManager = require('./baseManager');

class TrailerCustomLocationManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // CUSTOM LOCATION MANAGEMENT
    // ============================================================================
    
    async createLocation(userId, tenantId, locationData) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const { name, type, address, lat, lng, color = '#2563eb', icon_name = 'map-pin', is_shared = false } = locationData;
            
            if (!name || name.trim().length === 0) {
                throw new Error('Location name is required');
            }
            
            if (!type || !Object.values(LOCATION_TYPES).includes(type)) {
                throw new Error('Valid location type is required');
            }
            
            if (lat === undefined || lng === undefined) {
                throw new Error('Latitude and longitude are required');
            }
            
            const locationId = generateId('loc');
            const timestamp = getCurrentTimestamp();

            const result = await executeSingleQuery(this.db, `
                INSERT INTO trailer_custom_locations (
                    id, name, type, address, lat, lng, color, icon_name, is_shared, tenant_id, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [locationId, name, type, address || '', lat, lng, color, icon_name, is_shared ? 1 : 0, tenantId, userId, timestamp]);
            
            return { id: locationId, changes: result.changes };
        } catch (error) {
            console.error('Error creating custom location:', error);
            throw new Error('Failed to create custom location');
        }
    }

    async getCompanyLocations(tenantId, userId = null) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            let query = `
                SELECT * FROM trailer_custom_locations 
                WHERE tenant_id = ?
            `;
            let params = [tenantId];
            
            if (userId) {
                query += ` AND (is_shared = 1 OR created_by = ?)`;
                params.push(userId);
            }
            
            query += ` ORDER BY created_at DESC`;
            
            return await executeQueryCamelCase(this.db, query, params);
        } catch (error) {
            console.error('Error fetching custom locations:', error);
            throw new Error('Failed to retrieve custom locations');
        }
    }

    async updateLocation(locationId, userId, updates) {
        try {
            if (!locationId) {
                throw new Error('Location ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const { name, type, address, lat, lng, color, icon_name, is_shared } = updates;
            
            if (name !== undefined && name.trim().length === 0) {
                throw new Error('Location name cannot be empty');
            }
            
            if (type !== undefined && !Object.values(LOCATION_TYPES).includes(type)) {
                console.warn(`Invalid location type: ${type}. Allowed types:`, Object.values(LOCATION_TYPES));
                // Don't throw error, just log warning for now
            }
            
            let query = `UPDATE trailer_custom_locations SET `;
            let params = [];
            let setClauses = [];
            
            if (name !== undefined) {
                setClauses.push('name = ?');
                params.push(name);
            }
            if (type !== undefined) {
                setClauses.push('type = ?');
                params.push(type);
            }
            if (address !== undefined) {
                setClauses.push('address = ?');
                params.push(address);
            }
            if (lat !== undefined) {
                setClauses.push('lat = ?');
                params.push(lat);
            }
            if (lng !== undefined) {
                setClauses.push('lng = ?');
                params.push(lng);
            }
            if (color !== undefined) {
                setClauses.push('color = ?');
                params.push(color);
            }
            if (icon_name !== undefined) {
                setClauses.push('icon_name = ?');
                params.push(icon_name);
            }
            if (is_shared !== undefined) {
                setClauses.push('is_shared = ?');
                params.push(is_shared ? 1 : 0);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            setClauses.push('updated_at = ?');
            params.push(getCurrentTimestamp());
            
            query += setClauses.join(', ');
            query += ` WHERE id = ? AND created_by = ?`;
            params.push(locationId, userId);
            
            const result = await executeSingleQuery(this.db, query, params);
            
            // Return the updated location data
            if (result.changes > 0) {
                return await this.getLocationById(locationId, userId);
            }
            return null;
        } catch (error) {
            console.error('Error updating custom location:', error);
            throw new Error('Failed to update custom location');
        }
    }

    async deleteLocation(locationId, userId) {
        try {
            if (!locationId) {
                throw new Error('Location ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const result = await executeSingleQuery(this.db, 
                `DELETE FROM trailer_custom_locations WHERE id = ? AND created_by = ?`, 
                [locationId, userId]
            );
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting custom location:', error);
            throw new Error('Failed to delete custom location');
        }
    }

    async getLocationById(locationId, userId) {
        try {
            if (!locationId) {
                throw new Error('Location ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            return await executeQueryFirstCamelCase(this.db, `
                SELECT * FROM trailer_custom_locations 
                WHERE id = ? AND (is_shared = 1 OR created_by = ?)
            `, [locationId, userId]);
        } catch (error) {
            console.error('Error fetching custom location:', error);
            throw new Error('Failed to retrieve custom location');
        }
    }

    async getUserLocations(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            return await executeQueryCamelCase(this.db, `
                SELECT cl.*
                FROM trailer_custom_locations cl
                WHERE cl.created_by = ?
                ORDER BY cl.created_at DESC
            `, [userId]);
        } catch (error) {
            console.error('Error fetching user locations:', error);
            throw new Error('Failed to retrieve user locations');
        }
    }



    async toggleLocationSharing(locationId, userId, isShared) {
        try {
            if (!locationId) {
                throw new Error('Location ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                UPDATE trailer_custom_locations 
                SET is_shared = ?, updated_at = ?
                WHERE id = ? AND created_by = ?
            `, [isShared ? 1 : 0, getCurrentTimestamp(), locationId, userId]);
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error toggling location sharing:', error);
            throw new Error('Failed to toggle location sharing');
        }
    }
}

module.exports = TrailerCustomLocationManager;
