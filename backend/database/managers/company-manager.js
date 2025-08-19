/**
 * Company Manager
 * Handles all company-related database operations including creation, updates, and user associations
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeQueryCamelCase, executeQueryFirstCamelCase, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const { COMPANY_TYPES, CACHE_KEYS } = require('../../utils/constants');
const BaseManager = require('./baseManager');
const { normalizePagination, buildPaginationClause, createPaginatedResponse, getDefaultPaginationForType } = require('../../utils/pagination');
const { normalizeTenantId } = require('../../utils/stringUtils');
const cacheService = require('../../services/cache-service');

class CompanyManager extends BaseManager {
    constructor(db) {
        super(db);
    }

    /**
     * Create a new company
     */
    async createCompany(userId, companyData) {
        return this.transact(async (tx) => {
            const id = generateId('company');
            const now = getCurrentTimestamp();

            const query = `
                INSERT INTO companies (id, name, type, dot_number, mc_number, color, tenant_id, user_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
            const params = [
                id,
                companyData.name,
                companyData.type || null,
                companyData.dotNumber || null,
                companyData.mcNumber || null,
                companyData.color || '#3B82F6',
                companyData.tenantId,
                userId
            ];

            await executeSingleQuery(tx, query, params);

            // Set as active company for user via preferences table
            await executeSingleQuery(tx, `
                INSERT OR REPLACE INTO user_company_preferences (id, user_id, active_company_id)
                VALUES (?, ?, ?)
            `, [`pref_${userId}`, userId, id]);

            return { id, ...companyData, createdAt: now, updatedAt: now };
        });
    }

    /**
     * Get all companies for a user with pagination (respects cross-company access permission)
     * @param {string} userId - User ID
     * @param {string} tenantId - Tenant ID
     * @param {string} userRole - User role for access control
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of companies per page
     * @param {number} pagination.offset - Number of companies to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with companies and pagination metadata
     */
    async getUserCompanies(userId, tenantId, userRole = null, pagination = {}) {
        const normalizedTenantId = normalizeTenantId(tenantId);
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Get default pagination settings for companies
            const defaultSettings = getDefaultPaginationForType('companies');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });

            let countQuery;
            let dataQuery;
            let params;

            // Check if user has cross-company access permission
            let hasCrossCompanyAccess = false;
            if (userRole && userRole.trim()) {
                // Simple role check - owner and admin have cross-company access
                hasCrossCompanyAccess = ['owner', 'admin'].includes(userRole.toLowerCase());
            }

            if (hasCrossCompanyAccess) {
                // User can see all companies in the tenant
                countQuery = `
                    SELECT COUNT(DISTINCT c.id) as total
                    FROM companies c
                    WHERE c.tenant_id = ? AND c.is_active = 1
                `;
                
                dataQuery = `
                    SELECT 
                        c.*,
                        COUNT(DISTINCT pt.id) as trailer_count,
                        COUNT(DISTINCT gp.id) as provider_count
                    FROM companies c
                    LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                    LEFT JOIN gps_providers gp ON c.id = gp.company_id
                    WHERE c.tenant_id = ? AND c.is_active = 1
                    GROUP BY c.id
                    ORDER BY c.created_at ASC
                    LIMIT ? OFFSET ?
                `;
                params = [normalizedTenantId, normalizedPagination.limit, normalizedPagination.offset];
            } else {
                // User can only see companies they own/created
                countQuery = `
                    SELECT COUNT(DISTINCT c.id) as total
                    FROM companies c
                    WHERE c.user_id = ? AND c.tenant_id = ? AND c.is_active = 1
                `;
                
                dataQuery = `
                    SELECT 
                        c.*,
                        COUNT(DISTINCT pt.id) as trailer_count,
                        COUNT(DISTINCT gp.id) as provider_count
                    FROM companies c
                    LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                    LEFT JOIN gps_providers gp ON c.id = gp.company_id
                    WHERE c.user_id = ? AND c.tenant_id = ? AND c.is_active = 1
                    GROUP BY c.id
                    ORDER BY c.created_at ASC
                    LIMIT ? OFFSET ?
                `;
                params = [userId, normalizedTenantId, normalizedPagination.limit, normalizedPagination.offset];
            }

            // Execute both queries
            const countParams = hasCrossCompanyAccess ? [normalizedTenantId] : [userId, normalizedTenantId];
            const [totalResult, rows] = await Promise.all([
                executeQueryFirst(this.db, countQuery, countParams),
                executeQueryCamelCase(this.db, dataQuery, params)
            ]);

            const totalCount = totalResult.total;
            const companies = rows.map(row => ({
                ...row,
                settings: row.settings ? JSON.parse(row.settings) : {}
            }));
            
            const result = createPaginatedResponse(companies, normalizedPagination, totalCount);
            
            // Cache the result
            cacheService.set(CACHE_KEYS.COMPANY_DATA, result, normalizedTenantId);
            
            return result;
        } catch (error) {
            console.error('❌ Error fetching user companies:', error);
            throw error;
        }
    }



    /**
     * Get detailed company information
     */
    async getCompanyDetails(companyId, userId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            const query = `
                SELECT 
                    c.*,
                    COUNT(DISTINCT pt.id) as trailer_count,
                    COUNT(DISTINCT gp.id) as provider_count,
                    COUNT(DISTINCT ma.id) as alert_count
                FROM companies c
                LEFT JOIN persistent_trailers pt ON c.id = pt.company_id
                LEFT JOIN gps_providers gp ON c.id = gp.company_id
                LEFT JOIN maintenance_alerts ma ON pt.id = ma.trailer_id
                WHERE c.id = ? AND c.user_id = ? AND c.is_active = 1
                GROUP BY c.id
            `;

            const row = await executeQueryFirstCamelCase(this.db, query, [companyId, userId]);
            
            if (!row) {
                return null;
            }

            return {
                ...row,
                settings: row.settings ? JSON.parse(row.settings) : {}
            };
        } catch (error) {
            console.error('❌ Error fetching company details:', error);
            throw error;
        }
    }

    /**
     * Update company information
     */
    async updateCompany(companyId, userId, updates) {
        return this.transact(async (tx) => {
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Verify company ownership INSIDE transaction to prevent race conditions
            const company = await executeQueryFirst(tx, `
                SELECT c.id, c.name, c.tenant_id
                FROM companies c
                WHERE c.id = ? AND c.user_id = ? AND c.is_active = 1
            `, [companyId, userId]);
            
            if (!company) {
                throw new Error('Company not found or access denied');
            }

            // Validate company type if being updated
            if (updates.type) {
                const validTypes = Object.values(COMPANY_TYPES);
                if (!validTypes.includes(updates.type)) {
                    throw new Error(`Invalid company type. Must be one of: ${validTypes.join(', ')}`);
                }
            }

            // Build allowed updates
            const allowedFields = [
                'name', 'type', 'color', 'logo_url', 'address', 'city', 'state', 'zip',
                'dot_number', 'mc_number', 'ein_number', 'operating_authority',
                'insurance_carrier', 'insurance_policy', 'insurance_expires', 'is_active'
            ];

            const allowedUpdates = {};
            for (const [key, value] of Object.entries(updates)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    allowedUpdates[key] = value;
                }
            }

            if (Object.keys(allowedUpdates).length === 0) {
                throw new Error('No valid updates provided');
            }

            // Perform the update within the same transaction
            const fields = Object.keys(allowedUpdates).map(field => `${field} = ?`).join(', ');
            const values = [...Object.values(allowedUpdates), getCurrentTimestamp(), companyId, userId];

            const query = `UPDATE companies SET ${fields}, updated_at = ? WHERE id = ? AND user_id = ? AND is_active = 1`;
            const result = await executeSingleQuery(tx, query, values);

                               if (result.changes === 0) {
                       throw new Error('Company not found or no changes made');
                   }

                   // Invalidate company cache for this tenant
                   cacheService.delete(CACHE_KEYS.COMPANY_DATA, company.tenant_id);
                   
                   return { success: true, changes: result.changes };
        });
    }

    /**
     * Delete company (soft delete)
     */
    async deleteCompany(companyId, userId) {
        return this.transact(async (tx) => {
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Verify company ownership INSIDE transaction to prevent race conditions
            const company = await executeQueryFirst(tx, `
                SELECT c.id, c.name, c.tenant_id
                FROM companies c
                WHERE c.id = ? AND c.user_id = ? AND c.is_active = 1
            `, [companyId, userId]);
            
            if (!company) {
                throw new Error('Company not found or access denied');
            }

            // Delete associated trailers first
            await executeSingleQuery(tx, 
                'DELETE FROM persistent_trailers WHERE company_id = ?',
                [companyId]
            );

            // Delete associated GPS providers
            await executeSingleQuery(tx,
                'DELETE FROM gps_providers WHERE company_id = ?',
                [companyId]
            );

            // Delete the company (hard delete)
            const result = await executeSingleQuery(tx,
                'DELETE FROM companies WHERE id = ? AND user_id = ?',
                [companyId, userId]
            );

            if (result.changes === 0) {
                throw new Error('Company not found or already deleted');
            }

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Verify company ownership
     */
    async verifyCompanyOwnership(companyId, userId, tenantId = null) {
        try {
            if (!companyId || !userId) {
                return null;
            }

            let query, params;
            if (tenantId && tenantId.trim()) {
                query = `
                    SELECT c.id, c.name, c.tenant_id, u.tenant_id as user_tenant
                    FROM companies c
                    JOIN users u ON c.user_id = u.id
                    WHERE c.id = ? AND c.user_id = ? AND c.is_active = 1
                    AND c.tenant_id = ? AND u.tenant_id = ?
                `;
                params = [companyId, userId, tenantId, tenantId];
            } else {
                query = `
                    SELECT c.id, c.name, c.tenant_id
                    FROM companies c
                    WHERE c.id = ? AND c.user_id = ? AND c.is_active = 1
                `;
                params = [companyId, userId];
            }

            return await executeQueryFirst(this.db, query, params);
        } catch (error) {
            console.error('❌ Error verifying company ownership:', error);
            return null;
        }
    }

    /**
     * Get active company for user
     */
    async getActiveCompany(userId, tenantId = null) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            let query, params;
            if (tenantId && tenantId.trim()) {
                query = `
                    SELECT c.*, ucp.active_company_id
                    FROM user_company_preferences ucp
                    JOIN companies c ON ucp.active_company_id = c.id
                    WHERE ucp.user_id = ? AND c.is_active = 1 AND c.tenant_id = ?
                `;
                params = [userId, tenantId];
            } else {
                query = `
                    SELECT c.*, ucp.active_company_id
                    FROM user_company_preferences ucp
                    JOIN companies c ON ucp.active_company_id = c.id
                    WHERE ucp.user_id = ? AND c.is_active = 1
                `;
                params = [userId];
            }

            let activeCompany = await executeQueryFirstCamelCase(this.db, query, params);

            if (!activeCompany) {
                // Try to find any company in the tenant as fallback
                let fallbackQuery;
                if (tenantId && tenantId.trim()) {
                    fallbackQuery = 'SELECT * FROM companies WHERE tenant_id = ? AND is_active = 1 ORDER BY created_at ASC LIMIT 1';
                    params = [tenantId];
                } else {
                    // If no tenant specified, try to find any company
                    fallbackQuery = 'SELECT * FROM companies WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1';
                    params = [];
                }
                
                activeCompany = await executeQueryFirstCamelCase(this.db, fallbackQuery, params);
                
                if (activeCompany) {
                    // Set this company as active for the user
                    await this.setActiveCompany(userId, activeCompany.id);
                }
            }

            return activeCompany ? {
                ...activeCompany,
                settings: activeCompany.settings ? JSON.parse(activeCompany.settings) : {}
            } : null;
        } catch (error) {
            console.error('❌ Error fetching active company:', error);
            throw error;
        }
    }

    /**
     * Set active company for user
     */
    async setActiveCompany(userId, companyId) {
        try {
            if (!userId || !companyId) {
                throw new Error('User ID and Company ID are required');
            }

            const query = `
                INSERT OR REPLACE INTO user_company_preferences (id, user_id, active_company_id)
                VALUES (?, ?, ?)
            `;

            const result = await executeSingleQuery(this.db, query, [`pref_${userId}`, userId, companyId]);
            return { success: true, changes: result.changes };
        } catch (error) {
            console.error('❌ Error setting active company:', error);
            throw error;
        }
    }

    /**
     * Check and set active company if none exists
     */
    async checkAndSetActiveCompany(userId, companyId) {
        try {
            const activeCompany = await this.getActiveCompany(userId);
            if (!activeCompany) {
                await this.setActiveCompany(userId, companyId);
            }
        } catch (error) {
            console.error('❌ Error checking/setting active company:', error);
        }
    }

    /**
     * Get all active companies (for admin purposes)
     */
    async getAllActiveCompanies() {
        try {
            const query = `
                SELECT id, name, type, dot_number, tenant_id, created_at, is_active
                FROM companies
                WHERE is_active = 1
                ORDER BY created_at DESC
            `;

            return await executeQueryCamelCase(this.db, query);
        } catch (error) {
            console.error('❌ Error fetching all active companies:', error);
            throw error;
        }
    }

    /**
     * Get companies by tenant
     */
    async getCompaniesByTenant(tenantId) {
        try {
            if (!tenantId) {
                throw new Error('Tenant ID is required');
            }

            const query = `
                SELECT id, name, type, dot_number, tenant_id, created_at, is_active
                FROM companies
                WHERE tenant_id = ? AND is_active = 1
            `;

            return await executeQueryCamelCase(this.db, query, [tenantId]);
        } catch (error) {
            console.error('❌ Error fetching companies by tenant:', error);
            throw error;
        }
    }

    /**
     * Get company by ID
     */
    async getCompanyById(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const row = await this.getEntityById('companies', companyId);
            
            if (!row) {
                return null;
            }

            return {
                ...row,
                settings: row.settings ? JSON.parse(row.settings) : {}
            };
        } catch (error) {
            console.error('❌ Error fetching company by ID:', error);
            throw error;
        }
    }

    /**
     * Check if DOT number already exists
     */
    async checkDOTNumberExists(dotNumber, excludeCompanyId = null) {
        try {
            if (!dotNumber) {
                return false;
            }

            let query = 'SELECT COUNT(*) as count FROM companies WHERE dot_number = ? AND is_active = 1';
            let params = [dotNumber];

            if (excludeCompanyId) {
                query += ' AND id != ?';
                params.push(excludeCompanyId);
            }

            const result = await executeQueryFirst(this.db, query, params);
            return result.count > 0;
        } catch (error) {
            console.error('❌ Error checking DOT number existence:', error);
            throw error;
        }
    }

    /**
     * Assign user to a company
     * @param {string} userId - User ID
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Assignment result
     */
    async assignUserToCompany(userId, companyId) {
        try {
            if (!userId || !companyId) {
                throw new Error('User ID and Company ID are required');
            }

            // Verify company exists and is active
            const company = await this.getCompanyById(companyId);
            if (!company || !company.isActive) {
                throw new Error('Company not found or inactive');
            }

            // Set user's active company via preferences table
            await executeSingleQuery(this.db, `
                INSERT OR REPLACE INTO user_company_preferences (id, user_id, active_company_id, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [`pref_${userId}`, userId, companyId]);

            // Clear cache for user
            cacheService.delete(`${CACHE_KEYS.USER_PROFILE}:${userId}`);

            console.log(`✅ User ${userId} assigned to company ${companyId}`);
            return { success: true, userId, companyId };
        } catch (error) {
            console.error('❌ Error assigning user to company:', error);
            throw error;
        }
    }

    /**
     * Get user's active company
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Active company or null
     */
    async getUserActiveCompany(userId) {
        try {
            if (!userId) {
                return null;
            }

            const query = `
                SELECT c.*
                FROM companies c
                INNER JOIN user_company_preferences ucp ON c.id = ucp.active_company_id
                WHERE ucp.user_id = ? AND c.is_active = 1
            `;

            const company = await executeQueryFirstCamelCase(this.db, query, [userId]);
            return company;
        } catch (error) {
            console.error('❌ Error getting user active company:', error);
            return null;
        }
    }
}

module.exports = CompanyManager;
