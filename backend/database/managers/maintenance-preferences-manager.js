/**
 * Maintenance Preferences Manager
 * Handles maintenance preferences and configuration settings for tenants
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const BaseManager = require('./baseManager');

class MaintenancePreferencesManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // MAINTENANCE PREFERENCES MANAGEMENT
    // ============================================================================
    
    /**
     * Get maintenance preferences for a tenant/company
     */
    async getPreferences(tenant_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const preferences = await executeQueryFirst(this.db, `
                SELECT * FROM maintenance_preferences 
                WHERE tenant_id = ?
                LIMIT 1
            `, [tenant_id]);
            
            if (preferences) {
                return {
                    id: preferences.id,
                    tenant_id: preferences.tenant_id,
                    annual_inspection_interval: preferences.annual_inspection_interval,
                    midtrip_inspection_interval: preferences.midtrip_inspection_interval,
                    brake_inspection_interval: preferences.brake_inspection_interval,
                    annual_alert_threshold: preferences.annual_alert_threshold,
                    midtrip_alert_threshold: preferences.midtrip_alert_threshold,
                    brake_alert_threshold: preferences.brake_alert_threshold,
                    enable_maintenance_alerts: preferences.enable_maintenance_alerts === 1,
                    enable_email_notifications: preferences.enable_email_notifications === 1,
                    enable_push_notifications: preferences.enable_push_notifications === 1,
                    created_at: preferences.created_at,
                    updated_at: preferences.updated_at
                };
            } else {
                // Return default preferences if none exist
                return {
                    id: null,
                    tenant_id: tenant_id,
                    annual_inspection_interval: 365,
                    midtrip_inspection_interval: 7,
                    brake_inspection_interval: 90,
                    annual_alert_threshold: 30,
                    midtrip_alert_threshold: 14,
                    brake_alert_threshold: 14,
                    enable_maintenance_alerts: true,
                    enable_email_notifications: true,
                    enable_push_notifications: true,
                    created_at: null,
                    updated_at: null
                };
            }
        } catch (error) {
            console.error('Error getting maintenance preferences:', error);
            throw new Error('Failed to retrieve maintenance preferences');
        }
    }

    /**
     * Create or update maintenance preferences
     */
    async savePreferences(tenant_id, preferences) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            if (!preferences) {
                throw new Error('Preferences data is required');
            }
            
            // Validate preferences data
            this._validatePreferences(preferences);
            
            // Check if preferences already exist
            const existing = await executeQueryFirst(this.db, `
                SELECT id FROM maintenance_preferences 
                WHERE tenant_id = ?
            `, [tenant_id]);
            
            if (existing) {
                // Update existing preferences
                const result = await executeSingleQuery(this.db, `
                    UPDATE maintenance_preferences SET
                        annual_inspection_interval = ?,
                        midtrip_inspection_interval = ?,
                        brake_inspection_interval = ?,
                        annual_alert_threshold = ?,
                        midtrip_alert_threshold = ?,
                        brake_alert_threshold = ?,
                        enable_maintenance_alerts = ?,
                        enable_email_notifications = ?,
                        enable_push_notifications = ?,
                        updated_at = ?
                    WHERE id = ?
                `, [
                    preferences.annual_inspection_interval,
                    preferences.midtrip_inspection_interval,
                    preferences.brake_inspection_interval,
                    preferences.annual_alert_threshold,
                    preferences.midtrip_alert_threshold,
                    preferences.brake_alert_threshold,
                    preferences.enable_maintenance_alerts ? 1 : 0,
                    preferences.enable_email_notifications ? 1 : 0,
                    preferences.enable_push_notifications ? 1 : 0,
                    getCurrentTimestamp(),
                    existing.id
                ]);
                
                return { id: existing.id, changes: result.changes };
            } else {
                // Create new preferences
                const preferenceId = generateId('pref');
                const timestamp = getCurrentTimestamp();
                
                const result = await executeSingleQuery(this.db, `
                    INSERT INTO maintenance_preferences (
                        id, tenant_id,
                        annual_inspection_interval, midtrip_inspection_interval, brake_inspection_interval,
                        annual_alert_threshold, midtrip_alert_threshold, brake_alert_threshold,
                        enable_maintenance_alerts, enable_email_notifications, enable_push_notifications,
                        created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    preferenceId,
                    tenant_id,
                    preferences.annual_inspection_interval,
                    preferences.midtrip_inspection_interval,
                    preferences.brake_inspection_interval,
                    preferences.annual_alert_threshold,
                    preferences.midtrip_alert_threshold,
                    preferences.brake_alert_threshold,
                    preferences.enable_maintenance_alerts ? 1 : 0,
                    preferences.enable_email_notifications ? 1 : 0,
                    preferences.enable_push_notifications ? 1 : 0,
                    timestamp,
                    timestamp
                ]);
                
                return { id: preferenceId, changes: result.changes };
            }
        } catch (error) {
            console.error('Error saving maintenance preferences:', error);
            throw new Error('Failed to save maintenance preferences');
        }
    }

    /**
     * Delete maintenance preferences
     */
    async deletePreferences(tenant_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM maintenance_preferences 
                WHERE tenant_id = ?
            `, [tenant_id]);
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting maintenance preferences:', error);
            throw new Error('Failed to delete maintenance preferences');
        }
    }

    /**
     * Get preferences by ID
     */
    async getPreferencesById(preferenceId) {
        try {
            if (!preferenceId) {
                throw new Error('Preference ID is required');
            }
            
            const preferences = await executeQueryFirst(this.db, `
                SELECT * FROM maintenance_preferences 
                WHERE id = ?
            `, [preferenceId]);
            
            if (!preferences) {
                return null;
            }
            
            return {
                id: preferences.id,
                tenant_id: preferences.tenant_id,
                annual_inspection_interval: preferences.annual_inspection_interval,
                midtrip_inspection_interval: preferences.midtrip_inspection_interval,
                brake_inspection_interval: preferences.brake_inspection_interval,
                annual_alert_threshold: preferences.annual_alert_threshold,
                midtrip_alert_threshold: preferences.midtrip_alert_threshold,
                brake_alert_threshold: preferences.brake_alert_threshold,
                enable_maintenance_alerts: preferences.enable_maintenance_alerts === 1,
                enable_email_notifications: preferences.enable_email_notifications === 1,
                enable_push_notifications: preferences.enable_push_notifications === 1,
                created_at: preferences.created_at,
                updated_at: preferences.updated_at
            };
        } catch (error) {
            console.error('Error getting preferences by ID:', error);
            throw new Error('Failed to retrieve preferences');
        }
    }

    /**
     * Get all preferences for a tenant
     */
    async getAllPreferencesByTenant(tenant_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const preferences = await executeQuery(this.db, `
                SELECT * FROM maintenance_preferences 
                WHERE tenant_id = ?
                ORDER BY created_at DESC
            `, [tenant_id]);
            
            return preferences.map(pref => ({
                id: pref.id,
                tenant_id: pref.tenant_id,
                annual_inspection_interval: pref.annual_inspection_interval,
                midtrip_inspection_interval: pref.midtrip_inspection_interval,
                brake_inspection_interval: pref.brake_inspection_interval,
                annual_alert_threshold: pref.annual_alert_threshold,
                midtrip_alert_threshold: pref.midtrip_alert_threshold,
                brake_alert_threshold: pref.brake_alert_threshold,
                enable_maintenance_alerts: pref.enable_maintenance_alerts === 1,
                enable_email_notifications: pref.enable_email_notifications === 1,
                enable_push_notifications: pref.enable_push_notifications === 1,
                created_at: pref.created_at,
                updated_at: pref.updated_at
            }));
        } catch (error) {
            console.error('Error getting all preferences by tenant:', error);
            throw new Error('Failed to retrieve preferences');
        }
    }

    /**
     * Update specific preference fields
     */
    async updatePreferences(tenant_id, updates) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            if (!updates || Object.keys(updates).length === 0) {
                throw new Error('No updates provided');
            }
            
            // Validate updates
            this._validatePreferences(updates);
            
            let query = `UPDATE maintenance_preferences SET `;
            let params = [];
            let setClauses = [];
            
            // Build dynamic update query
            if (updates.annual_inspection_interval !== undefined) {
                setClauses.push('annual_inspection_interval = ?');
                params.push(updates.annual_inspection_interval);
            }
            if (updates.midtrip_inspection_interval !== undefined) {
                setClauses.push('midtrip_inspection_interval = ?');
                params.push(updates.midtrip_inspection_interval);
            }
            if (updates.brake_inspection_interval !== undefined) {
                setClauses.push('brake_inspection_interval = ?');
                params.push(updates.brake_inspection_interval);
            }
            if (updates.annual_alert_threshold !== undefined) {
                setClauses.push('annual_alert_threshold = ?');
                params.push(updates.annual_alert_threshold);
            }
            if (updates.midtrip_alert_threshold !== undefined) {
                setClauses.push('midtrip_alert_threshold = ?');
                params.push(updates.midtrip_alert_threshold);
            }
            if (updates.brake_alert_threshold !== undefined) {
                setClauses.push('brake_alert_threshold = ?');
                params.push(updates.brake_alert_threshold);
            }
            if (updates.enable_maintenance_alerts !== undefined) {
                setClauses.push('enable_maintenance_alerts = ?');
                params.push(updates.enable_maintenance_alerts ? 1 : 0);
            }
            if (updates.enable_email_notifications !== undefined) {
                setClauses.push('enable_email_notifications = ?');
                params.push(updates.enable_email_notifications ? 1 : 0);
            }
            if (updates.enable_push_notifications !== undefined) {
                setClauses.push('enable_push_notifications = ?');
                params.push(updates.enable_push_notifications ? 1 : 0);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            setClauses.push('updated_at = ?');
            params.push(getCurrentTimestamp());
            
            query += setClauses.join(', ');
            query += ` WHERE tenant_id = ?`;
            params.push(tenant_id);
            
            const result = await executeSingleQuery(this.db, query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating preferences:', error);
            throw new Error('Failed to update preferences');
        }
    }

    /**
     * Reset preferences to default values
     */
    async resetToDefaults(tenant_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const defaultPreferences = {
                annual_inspection_interval: 365,
                midtrip_inspection_interval: 7,
                brake_inspection_interval: 90,
                annual_alert_threshold: 30,
                midtrip_alert_threshold: 14,
                brake_alert_threshold: 14,
                enable_maintenance_alerts: true,
                enable_email_notifications: true,
                enable_push_notifications: true
            };
            
            return await this.savePreferences(tenant_id, defaultPreferences);
        } catch (error) {
            console.error('Error resetting preferences to defaults:', error);
            throw new Error('Failed to reset preferences to defaults');
        }
    }

    // ============================================================================
    // PRIVATE HELPER METHODS
    // ============================================================================
    
    /**
     * Validate preferences data
     */
    _validatePreferences(preferences) {
        const errors = [];
        
        // Validate intervals (must be positive integers)
        if (preferences.annual_inspection_interval !== undefined) {
            if (!Number.isInteger(preferences.annual_inspection_interval) || preferences.annual_inspection_interval <= 0) {
                errors.push('Annual inspection interval must be a positive integer');
            }
        }
        
        if (preferences.midtrip_inspection_interval !== undefined) {
            if (!Number.isInteger(preferences.midtrip_inspection_interval) || preferences.midtrip_inspection_interval <= 0) {
                errors.push('Midtrip inspection interval must be a positive integer');
            }
        }
        
        if (preferences.brake_inspection_interval !== undefined) {
            if (!Number.isInteger(preferences.brake_inspection_interval) || preferences.brake_inspection_interval <= 0) {
                errors.push('Brake inspection interval must be a positive integer');
            }
        }
        
        // Validate alert thresholds (must be non-negative integers)
        if (preferences.annual_alert_threshold !== undefined) {
            if (!Number.isInteger(preferences.annual_alert_threshold) || preferences.annual_alert_threshold < 0) {
                errors.push('Annual alert threshold must be a non-negative integer');
            }
        }
        
        if (preferences.midtrip_alert_threshold !== undefined) {
            if (!Number.isInteger(preferences.midtrip_alert_threshold) || preferences.midtrip_alert_threshold < 0) {
                errors.push('Midtrip alert threshold must be a non-negative integer');
            }
        }
        
        if (preferences.brake_alert_threshold !== undefined) {
            if (!Number.isInteger(preferences.brake_alert_threshold) || preferences.brake_alert_threshold < 0) {
                errors.push('Brake alert threshold must be a non-negative integer');
            }
        }
        
        // Validate boolean fields
        if (preferences.enable_maintenance_alerts !== undefined && typeof preferences.enable_maintenance_alerts !== 'boolean') {
            errors.push('Enable maintenance alerts must be a boolean');
        }
        
        if (preferences.enable_email_notifications !== undefined && typeof preferences.enable_email_notifications !== 'boolean') {
            errors.push('Enable email notifications must be a boolean');
        }
        
        if (preferences.enable_push_notifications !== undefined && typeof preferences.enable_push_notifications !== 'boolean') {
            errors.push('Enable push notifications must be a boolean');
        }
        
        if (errors.length > 0) {
            throw new Error(`Validation errors: ${errors.join(', ')}`);
        }
    }
}

module.exports = MaintenancePreferencesManager;
