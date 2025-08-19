/**
 * Stats Manager
 * Handles statistics and analytics for companies, users, and tenants
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeQueryCamelCase, executeQueryFirstCamelCase, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const BaseManager = require('./baseManager');

class StatsManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.userManager = null;
        this.companyManager = null;
        this.customCompanyManager = null;
    }

    // Set dependencies after initialization
    setDependencies(userManager, companyManager, trailerCustomCompanyManager) {
        this.userManager = userManager;
        this.companyManager = companyManager;
        this.customCompanyManager = trailerCustomCompanyManager;
    }

    // ============================================================================
    // STATISTICS MANAGEMENT
    // ============================================================================
    
    async getCompanyStats(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            
            const stats = {};
            
            // Get trailer statistics
            const trailerStats = await executeQueryFirst(this.db, `
                SELECT 
                    COUNT(*) as totalTrailers,
                    COUNT(CASE WHEN gps_status = 'connected' THEN 1 END) as connectedTrailers,
                    COUNT(CASE WHEN gps_status = 'disconnected' THEN 1 END) as disconnectedTrailers,
                    COUNT(CASE WHEN gps_enabled = 0 THEN 1 END) as manualTrailers,
                    COUNT(CASE WHEN status = 'available' THEN 1 END) as availableTrailers,
                    COUNT(CASE WHEN status = 'dispatched' THEN 1 END) as dispatchedTrailers,
                    COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenanceTrailers
                FROM persistent_trailers 
                WHERE company_id = ?
            `, [companyId]);
            
            stats.trailers = trailerStats;
            
            // Get GPS provider statistics
            const providerStats = await executeQueryFirst(this.db, `
                SELECT 
                    COUNT(*) as totalProviders,
                    COUNT(CASE WHEN status = 'connected' THEN 1 END) as connectedProviders,
                    COUNT(CASE WHEN status = 'disconnected' THEN 1 END) as disconnectedProviders,
                    COUNT(CASE WHEN status = 'error' THEN 1 END) as errorProviders
                FROM gps_providers 
                WHERE company_id = ?
            `, [companyId]);
            
            stats.providers = providerStats;
            
            // Get maintenance alert statistics
            const alertStats = await executeQueryFirst(this.db, `
                SELECT 
                    COUNT(*) as totalAlerts,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as criticalAlerts,
                    COUNT(CASE WHEN severity = 'warning' THEN 1 END) as warningAlerts,
                    COUNT(CASE WHEN severity = 'info' THEN 1 END) as infoAlerts,
                    COUNT(CASE WHEN is_overdue = 1 THEN 1 END) as overdueAlerts
                FROM maintenance_alerts ma
                JOIN persistent_trailers pt ON ma.trailer_id = pt.id
                WHERE pt.company_id = ?
            `, [companyId]);
            
            stats.alerts = alertStats;
            
            return stats;
        } catch (error) {
            console.error('Error getting company stats:', error);
            throw new Error('Failed to retrieve company statistics');
        }
    }

    async getUserStats(userId) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            if (!this.userManager || !this.companyManager || !this.customCompanyManager) {
                throw new Error('StatsManager dependencies not set. Call setDependencies() first.');
            }
            
            // Get user profile to access tenantId
            const user = await this.userManager.getUserProfile(userId);
            if (!user || !user.tenantId) {
                return {
                    totalTrailers: 0,
                    activeTrailers: 0,
                    inactiveTrailers: 0,
                    maintenanceAlerts: 0,
                    nonCompanyOwned: 0
                };
            }
            
            // Get all companies the user has access to (respects cross-company access permission)
            const allCompanies = await this.companyManager.getUserCompanies(userId, user.tenantId, user.organizationRole || 'user', { limit: 100 });
            
            // Get custom companies
            const customCompanies = await this.customCompanyManager.getCustomCompaniesByTenant(user.tenantId);
            
            // Combine all companies for stats calculation
            const allCompanyIds = [
                ...allCompanies.data.map(c => c.id),
                ...customCompanies.map(c => c.id)
            ];
            
            if (allCompanyIds.length === 0) {
                return {
                    totalTrailers: 0,
                    activeTrailers: 0,
                    inactiveTrailers: 0,
                    maintenanceAlerts: 0,
                    nonCompanyOwned: 0
                };
            }
            
            // Calculate stats for all companies
            return await this._getStatsForAllCompanies(allCompanyIds, customCompanies.map(c => c.id));
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw new Error('Failed to retrieve user statistics');
        }
    }

    async _getStatsForAllCompanies(companyIds, customCompanyIds) {
        try {
            let totalStats = {
                totalTrailers: 0,
                availableTrailers: 0,
                dispatchedTrailers: 0,
                loadingTrailers: 0,
                maintenanceTrailers: 0,
                totalAlerts: 0
            };
            
            // Calculate stats for each company
            for (const companyId of companyIds) {
                const companyStats = await executeQueryFirst(this.db, `
                    SELECT 
                        COUNT(DISTINCT pt.id) as totalTrailers,
                        COUNT(DISTINCT CASE WHEN pt.status = 'available' THEN pt.id END) as availableTrailers,
                        COUNT(DISTINCT CASE WHEN pt.status = 'dispatched' THEN pt.id END) as dispatchedTrailers,
                        COUNT(DISTINCT CASE WHEN pt.status IN ('loading', 'unloading') THEN pt.id END) as loadingTrailers,
                        COUNT(DISTINCT CASE WHEN pt.status IN ('maintenance', 'out_of_service') THEN pt.id END) as maintenanceTrailers
                    FROM persistent_trailers pt
                    WHERE pt.company_id = ?
                `, [companyId]);
                
                // Add company stats to total
                totalStats.totalTrailers += companyStats.totalTrailers || 0;
                totalStats.availableTrailers += companyStats.availableTrailers || 0;
                totalStats.dispatchedTrailers += companyStats.dispatchedTrailers || 0;
                totalStats.loadingTrailers += companyStats.loadingTrailers || 0;
                totalStats.maintenanceTrailers += companyStats.maintenanceTrailers || 0;
                
                // Calculate maintenance alerts for this company
                const companyAlerts = await this._calculateMaintenanceAlerts(companyId);
                totalStats.totalAlerts += companyAlerts;
            }
            
            // Calculate custom company trailers count and maintenance alerts
            let customCompanyTrailers = 0;
            if (customCompanyIds.length > 0) {
                const placeholders = customCompanyIds.map(() => '?').join(',');
                const result = await executeQueryFirst(this.db, `
                    SELECT COUNT(DISTINCT pt.id) as totalTrailers
                    FROM persistent_trailers pt
                    WHERE pt.company_id IN (${placeholders})
                `, customCompanyIds);
                customCompanyTrailers = result.totalTrailers || 0;
                
                // Calculate maintenance alerts for custom companies
                for (const customCompanyId of customCompanyIds) {
                    const customCompanyAlerts = await this._calculateMaintenanceAlerts(customCompanyId);
                    totalStats.totalAlerts += customCompanyAlerts;
                }
            }
            
            // Transform the stats to match frontend expectations
            return {
                totalTrailers: totalStats.totalTrailers,
                activeTrailers: totalStats.availableTrailers + totalStats.dispatchedTrailers,
                inactiveTrailers: totalStats.loadingTrailers + totalStats.maintenanceTrailers,
                maintenanceAlerts: totalStats.totalAlerts,
                nonCompanyOwned: customCompanyTrailers
            };
        } catch (error) {
            console.error('Error calculating stats for all companies:', error);
            throw new Error('Failed to calculate statistics for all companies');
        }
    }

    async _calculateMaintenanceAlerts(companyId) {
        try {
            const MaintenanceService = require('../../services/maintenance');
            
            // Check if it's a custom company first
            let company = null;
            let tenant_id = null;
            
            if (companyId.startsWith('trailer_custom_comp_')) {
                // It's a custom company
                company = await executeQueryFirst(this.db, `
                    SELECT tenant_id FROM trailer_custom_companies WHERE id = ?
                `, [companyId]);
            } else {
                // It's a regular company
                company = await executeQueryFirst(this.db, `
                    SELECT tenant_id FROM companies WHERE id = ?
                `, [companyId]);
            }
            
            if (!company || !company.tenant_id) {
                console.error(`Company ${companyId} not found or missing tenant_id`);
                return 0;
            }
            
            tenant_id = company.tenant_id;
            
            const trailers = await executeQuery(this.db, `
                SELECT 
                    pt.next_annual_inspection_due,
                    pt.next_midtrip_inspection_due,
                    pt.next_brake_inspection_due,
                    pt.tire_status
                FROM persistent_trailers pt
                WHERE pt.company_id = ?
            `, [companyId]);

            let totalAlerts = 0;
            for (const trailer of trailers) {
                try {
                    const alerts = await MaintenanceService.calculateTrailerMaintenanceAlerts(trailer, tenant_id);
                    totalAlerts += Array.isArray(alerts) ? alerts.length : (alerts?.alerts?.length || 0);
                } catch (e) {
                    console.warn(`Error calculating maintenance alerts for trailer in company ${companyId}:`, e.message);
                    // If service fails for one trailer, continue
                }
            }
            return totalAlerts;
        } catch (error) {
            console.error('Error calculating maintenance alerts:', error);
            return 0;
        }
    }

    async getAllTenants() {
        try {
            return await executeQueryCamelCase(this.db, `
                SELECT 
                    t.id as tenant_id,
                    t.name as tenant_name,
                    t.status,
                    t.created_at,
                    COUNT(DISTINCT u.id) as user_count,
                    COUNT(DISTINCT c.id) as company_count,
                    COUNT(DISTINCT pt.id) as trailer_count,
                    MAX(u.last_login) as last_activity
                FROM tenants t
                LEFT JOIN users u ON t.id = u.tenant_id
                LEFT JOIN companies c ON t.id = c.tenant_id
                LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                GROUP BY t.id, t.name, t.status, t.created_at
                ORDER BY t.created_at DESC
            `);
        } catch (error) {
            console.error('Error getting all tenants:', error);
            throw new Error('Failed to retrieve tenant statistics');
        }
    }

    async getTenantById(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            return await executeQueryFirst(this.db, `
                SELECT * FROM tenants WHERE id = ?
            `, [tenantId]);
        } catch (error) {
            console.error('Error getting tenant by ID:', error);
            throw new Error('Failed to retrieve tenant information');
        }
    }

    async getTenantStats(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            const stats = await executeQueryFirst(this.db, `
                SELECT 
                    COUNT(DISTINCT u.id) as userCount,
                    COUNT(DISTINCT c.id) as companyCount,
                    COUNT(DISTINCT pt.id) as trailerCount,
                    COUNT(DISTINCT gp.id) as providerCount,
                    COUNT(DISTINCT ma.id) as alertCount
                FROM tenants t
                LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = 1
                LEFT JOIN companies c ON t.id = c.tenant_id AND c.is_active = 1
                LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                LEFT JOIN gps_providers gp ON c.id = gp.company_id
                LEFT JOIN maintenance_alerts ma ON pt.id = ma.trailer_id AND ma.is_resolved = 0
                WHERE t.id = ?
            `, [tenantId]);
            
            return stats;
        } catch (error) {
            console.error('Error getting tenant stats:', error);
            throw new Error('Failed to retrieve tenant statistics');
        }
    }

    async getSystemStats() {
        try {
            const stats = await executeQueryFirst(this.db, `
                SELECT 
                    COUNT(DISTINCT t.id) as totalTenants,
                    COUNT(DISTINCT u.id) as totalUsers,
                    COUNT(DISTINCT c.id) as totalCompanies,
                    COUNT(DISTINCT pt.id) as totalTrailers,
                    COUNT(DISTINCT gp.id) as totalProviders,
                    COUNT(DISTINCT ma.id) as totalAlerts
                FROM tenants t
                LEFT JOIN users u ON t.id = u.tenant_id AND u.is_active = 1
                LEFT JOIN companies c ON t.id = c.tenant_id AND c.is_active = 1
                LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                LEFT JOIN gps_providers gp ON c.id = gp.company_id
                LEFT JOIN maintenance_alerts ma ON pt.id = ma.trailer_id AND ma.is_resolved = 0
            `);
            
            return stats;
        } catch (error) {
            console.error('Error getting system stats:', error);
            throw new Error('Failed to retrieve system statistics');
        }
    }

    async getTrailerStatsByStatus(companyId = null) {
        try {
            let query = `
                SELECT 
                    status,
                    COUNT(*) as count
                FROM persistent_trailers
            `;
            
            const params = [];
            if (companyId) {
                query += ' WHERE company_id = ?';
                params.push(companyId);
            }
            
            query += ' GROUP BY status ORDER BY count DESC';
            
            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Error getting trailer stats by status:', error);
            throw new Error('Failed to retrieve trailer status statistics');
        }
    }

    async getGPSStats(companyId = null) {
        try {
            let query = `
                SELECT 
                    gps_status as status,
                    COUNT(*) as count
                FROM persistent_trailers
            `;
            
            const params = [];
            if (companyId) {
                query += ' WHERE company_id = ?';
                params.push(companyId);
            }
            
            query += ' GROUP BY gps_status ORDER BY count DESC';
            
            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Error getting GPS stats:', error);
            throw new Error('Failed to retrieve GPS statistics');
        }
    }

    async getMaintenanceAlertStats(companyId = null) {
        try {
            let query = `
                SELECT 
                    severity,
                    COUNT(*) as count
                FROM maintenance_alerts ma
                JOIN persistent_trailers pt ON ma.trailer_id = pt.id
            `;
            
            const params = [];
            if (companyId) {
                query += ' WHERE pt.company_id = ?';
                params.push(companyId);
            }
            
            query += ' GROUP BY severity ORDER BY count DESC';
            
            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Error getting maintenance alert stats:', error);
            throw new Error('Failed to retrieve maintenance alert statistics');
        }
    }

    // ============================================================================
    // TENANT MANAGEMENT
    // ============================================================================
    
    async deleteTenant(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM tenants WHERE id = ?
            `, [tenantId]);
            
            if (result.changes === 0) {
                throw new Error('Tenant not found');
            }
            
            return { success: true, changes: result.changes };
        } catch (error) {
            console.error('Error deleting tenant:', error);
            throw new Error('Failed to delete tenant');
        }
    }

    async deactivateTenant(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                UPDATE tenants SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `, [tenantId]);
            
            if (result.changes === 0) {
                throw new Error('Tenant not found');
            }
            
            return { success: true, changes: result.changes };
        } catch (error) {
            console.error('Error deactivating tenant:', error);
            throw new Error('Failed to deactivate tenant');
        }
    }

    async activateTenant(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                UPDATE tenants SET status = 'active', updated_at = CURRENT_TIMESTAMP WHERE id = ?
            `, [tenantId]);
            
            if (result.changes === 0) {
                throw new Error('Tenant not found');
            }
            
            return { success: true, changes: result.changes };
        } catch (error) {
            console.error('Error activating tenant:', error);
            throw new Error('Failed to activate tenant');
        }
    }
}

module.exports = StatsManager;
