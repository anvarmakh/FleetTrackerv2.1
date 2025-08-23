/**
 * GPS Provider Manager
 * Handles all GPS provider-related database operations including creation, updates, and credential management
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const { getDefaultPaginationForType, normalizePagination, buildPaginationClause, createPaginatedResponse } = require('../../utils/pagination');
const EncryptionUtil = require('../../utils/encryption');
const logger = require('../../utils/logger');

const { GPS_PROVIDER_TYPES } = require('../../utils/constants');
const BaseManager = require('./baseManager');

class GPSProviderManager extends BaseManager {
    constructor(db) {
        super(db);
    }

    /**
     * Add a new GPS provider
     */
    async addProvider(companyId, providerData) {
        return this.transact(async (tx) => {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const { name, type, credentials, company_id, tenant_id = defaultTenantId } = providerData;
            
            if (!name) {
                throw new Error('Provider name is required');
            }
            
            if (!type || !Object.values(GPS_PROVIDER_TYPES).includes(type)) {
                throw new Error('Valid provider type is required');
            }

            const providerId = generateId('gps');
            
            // Use the provided company_id if available, otherwise use the default companyId
            const targetCompanyId = company_id || companyId;
            
            logger.logCredentials('Adding', type, !!credentials, credentials ? Object.keys(credentials) : []);
            
            const encryptedCredentials = credentials ? EncryptionUtil.encrypt(JSON.stringify(credentials)) : null;
            logger.logEncryption('Credentials encrypted', !!encryptedCredentials, encryptedCredentials ? encryptedCredentials.length : 0);

            const query = `
                INSERT INTO gps_providers (id, tenant_id, company_id, name, type, credentials_encrypted)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            const params = [providerId, tenant_id, targetCompanyId, name, type, encryptedCredentials];
            const result = await executeSingleQuery(tx, query, params);
            
            return { id: providerId, name, type, changes: result.changes };
        });
    }

    /**
     * Get all providers for a company
     */
    async getCompanyProviders(companyId, tenant_id = null) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;

            const query = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.credentials_encrypted, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.company_id = ? AND gp.tenant_id = ?
                ORDER BY gp.created_at ASC
            `;

            return await executeQuery(this.db, query, [companyId, actualTenantId]);
        } catch (error) {
            logger.error('Error fetching company providers', error);
            throw error;
        }
    }

    /**
     * Get all providers by name with pagination
     * @param {string} providerName - Provider name
     * @param {string} tenant_id - Tenant ID
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of providers per page
     * @param {number} pagination.offset - Number of providers to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with providers and pagination metadata
     */
    async getAllProvidersByName(providerName, tenant_id = null, pagination = {}) {
        try {
            if (!providerName) {
                throw new Error('Provider name is required');
            }

            // Get default pagination settings for providers
            const defaultSettings = getDefaultPaginationForType('providers');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;

            // Build count query for total items
            const countQuery = `
                SELECT COUNT(*) as total
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.name = ? AND gp.tenant_id = ?
            `;

            // Build data query with pagination
            const dataQuery = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.credentials_encrypted, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.name = ? AND gp.tenant_id = ?
                ORDER BY gp.created_at ASC
                LIMIT ? OFFSET ?
            `;

            // Execute both queries
            const [totalResult, providers] = await Promise.all([
                executeQueryFirst(this.db, countQuery, [providerName, actualTenantId]),
                executeQuery(this.db, dataQuery, [providerName, actualTenantId, normalizedPagination.limit, normalizedPagination.offset])
            ]);

            const totalCount = totalResult.total;
            
            return createPaginatedResponse(providers, normalizedPagination, totalCount);
        } catch (error) {
            console.error('❌ Error fetching providers by name:', error);
            throw error;
        }
    }

    /**
     * Get all providers for a tenant with pagination
     * @param {string} tenant_id - Tenant ID
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of providers per page
     * @param {number} pagination.offset - Number of providers to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with providers and pagination metadata
     */
    async getTenantProviders(tenant_id, pagination = {}) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }

            // Get default pagination settings for providers
            const defaultSettings = getDefaultPaginationForType('providers');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });

            // Build count query for total items
            const countQuery = `
                SELECT COUNT(*) as total
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.tenant_id = ?
            `;

            // Build data query with pagination
            const dataQuery = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.credentials_encrypted, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.tenant_id = ?
                ORDER BY gp.created_at ASC
                LIMIT ? OFFSET ?
            `;

            // Execute both queries
            const [totalResult, providers] = await Promise.all([
                executeQueryFirst(this.db, countQuery, [tenant_id]),
                executeQuery(this.db, dataQuery, [tenant_id, normalizedPagination.limit, normalizedPagination.offset])
            ]);

            const totalCount = totalResult.total;
            
            return createPaginatedResponse(providers, normalizedPagination, totalCount);
        } catch (error) {
            console.error('❌ Error fetching tenant providers:', error);
            throw error;
        }
    }

    /**
     * Get all providers for a user with pagination
     * @param {string} userId - User ID
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of providers per page
     * @param {number} pagination.offset - Number of providers to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with providers and pagination metadata
     */
    async getUserProviders(userId, pagination = {}) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Get default pagination settings for providers
            const defaultSettings = getDefaultPaginationForType('providers');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });

            // Build count query for total items
            const countQuery = `
                SELECT COUNT(*) as total
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE c.user_id = ? OR gp.tenant_id = (SELECT tenant_id FROM users WHERE id = ?)
            `;

            // Build data query with pagination
            const dataQuery = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.credentials_encrypted, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE c.user_id = ? OR gp.tenant_id = (SELECT tenant_id FROM users WHERE id = ?)
                ORDER BY gp.created_at ASC
                LIMIT ? OFFSET ?
            `;

            // Execute both queries
            const [totalResult, providers] = await Promise.all([
                executeQueryFirst(this.db, countQuery, [userId, userId]),
                executeQuery(this.db, dataQuery, [userId, userId, normalizedPagination.limit, normalizedPagination.offset])
            ]);

            const totalCount = totalResult.total;
            
            return createPaginatedResponse(providers, normalizedPagination, totalCount);
        } catch (error) {
            console.error('❌ Error fetching user providers:', error);
            throw error;
        }
    }

    /**
     * Get a specific provider for a user
     */
    async getProviderForUser(providerId, userId) {
        try {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            const query = `
                SELECT gp.*, c.user_id
                FROM gps_providers gp
                JOIN companies c ON gp.company_id = c.id
                WHERE gp.id = ? AND c.user_id = ?
            `;

            const result = await executeQueryFirst(this.db, query, [providerId, userId]);
            return result;
        } catch (error) {
            console.error('❌ Error fetching provider for user:', error);
            throw error;
        }
    }

    /**
     * Get provider by ID
     */
    async getProviderById(providerId) {
        try {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }

            const query = `
                SELECT gp.*, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.id = ?
            `;

            return await executeQueryFirst(this.db, query, [providerId]);
        } catch (error) {
            console.error('❌ Error fetching provider by ID:', error);
            throw error;
        }
    }

    /**
     * Update a GPS provider
     */
    async updateProvider(providerId, userId, updates) {
        try {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            const { name, type, credentials } = updates;
            
            if (type && !Object.values(GPS_PROVIDER_TYPES).includes(type)) {
                throw new Error('Invalid provider type');
            }
            
            logger.logCredentials('Updating', type || 'unknown', !!credentials, credentials ? Object.keys(credentials) : []);
            
            const encryptedCredentials = credentials ? EncryptionUtil.encrypt(JSON.stringify(credentials)) : null;
            
            logger.logEncryption('Credentials encrypted', !!encryptedCredentials, encryptedCredentials ? encryptedCredentials.length : 0);

            let query = `
                UPDATE gps_providers 
                SET updated_at = CURRENT_TIMESTAMP
            `;
            let params = [];
            
            if (name !== undefined) {
                query += ', name = ?';
                params.push(name);
            }
            
            if (type !== undefined) {
                query += ', type = ?';
                params.push(type);
            }
            
            if (encryptedCredentials !== undefined) {
                query += ', credentials_encrypted = ?';
                params.push(encryptedCredentials);
            }
            
            query += `
                WHERE id = ? AND company_id IN (
                    SELECT id FROM companies WHERE user_id = ?
                )
            `;
            params.push(providerId, userId);

            const result = await executeSingleQuery(this.db, query, params);
            
            if (result.changes === 0) {
                throw new Error('Provider not found or access denied');
            }
            
            return { changes: result.changes };
        } catch (error) {
            logger.error('Error updating provider', error);
            throw error;
        }
    }

    /**
     * Delete a GPS provider
     */
    async deleteProvider(providerId, userId, deleteRelatedTrailers = false) {
        return this.transact(async (tx) => {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }
            if (!userId) {
                throw new Error('User ID is required');
            }

            // First, get the provider to check if it exists and get related trailer count
            const providerQuery = `
                SELECT gp.id, gp.name, gp.company_id,
                       (SELECT COUNT(*) FROM persistent_trailers WHERE provider_id = gp.id) as trailer_count
                FROM gps_providers gp
                WHERE gp.id = ? AND gp.company_id IN (
                    SELECT id FROM companies WHERE user_id = ?
                )
            `;
            
            const provider = await executeQueryFirst(tx, providerQuery, [providerId, userId]);
            
            if (!provider) {
                throw new Error('Provider not found or access denied');
            }

            let deletedTrailersCount = 0;

            // Delete related trailers if requested
            if (deleteRelatedTrailers && provider.trailer_count > 0) {
                logger.info(`🗑️ Deleting ${provider.trailer_count} trailers related to provider: ${providerId}`);
                
                // Delete trailers by provider_id first
                let deleteTrailersQuery = `
                    DELETE FROM persistent_trailers 
                    WHERE provider_id = ? AND company_id = ?
                `;
                
                let trailerResult = await executeSingleQuery(tx, deleteTrailersQuery, [providerId, provider.company_id]);
                deletedTrailersCount = trailerResult.changes;
                
                // If no trailers were deleted by provider_id, try deleting by company_id
                // This handles cases where trailers were created before provider_id was properly set
                if (deletedTrailersCount === 0) {
                    logger.info(`🔍 No trailers found with provider_id, checking for trailers by company_id: ${provider.company_id}`);
                    
                    // Get count of trailers for this company
                    const countQuery = `
                        SELECT COUNT(*) as count FROM persistent_trailers 
                        WHERE company_id = ?
                    `;
                    const countResult = await executeQueryFirst(tx, countQuery, [provider.company_id]);
                    
                    if (countResult.count > 0) {
                        logger.info(`🗑️ Found ${countResult.count} trailers by company_id, deleting them`);
                        
                        deleteTrailersQuery = `
                            DELETE FROM persistent_trailers 
                            WHERE company_id = ?
                        `;
                        
                        trailerResult = await executeSingleQuery(tx, deleteTrailersQuery, [provider.company_id]);
                        deletedTrailersCount = trailerResult.changes;
                    }
                }
                
                logger.info(`✅ Deleted ${deletedTrailersCount} trailers for provider: ${providerId}`);
            }

            // Delete the provider
            const deleteProviderQuery = `
                DELETE FROM gps_providers 
                WHERE id = ? AND company_id IN (
                    SELECT id FROM companies WHERE user_id = ?
                )
            `;

            const result = await executeSingleQuery(tx, deleteProviderQuery, [providerId, userId]);
            
            if (result.changes === 0) {
                throw new Error('Provider not found or access denied');
            }
            
            logger.info(`✅ Provider deleted: ${providerId}, deleted trailers: ${deletedTrailersCount}`);
            
            return { 
                changes: result.changes, 
                deletedTrailersCount: deletedTrailersCount,
                providerName: provider.name
            };
        });
    }

    /**
     * Update provider status
     */
    async updateProviderStatus(providerId, status, errorMessage = null, trailerCount = null) {
        try {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }

            let query = `
                UPDATE gps_providers 
                SET status = ?, error_message = ?, last_sync = CURRENT_TIMESTAMP
            `;
            let params = [status, errorMessage];
            
            if (trailerCount !== null) {
                query += `, trailer_count = ?`;
                params.push(trailerCount);
            }
            
            query += ` WHERE id = ?`;
            params.push(providerId);
            
            const result = await executeSingleQuery(this.db, query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('❌ Error updating provider status:', error);
            throw error;
        }
    }

    /**
     * Get provider credentials (decrypted)
     */
    async getProviderCredentials(providerId) {
        try {
            if (!providerId) {
                throw new Error('Provider ID is required');
            }

            const provider = await this.getProviderById(providerId);
            if (!provider || !provider.credentials_encrypted) {
                return null;
            }

            try {
                const decryptedData = EncryptionUtil.decrypt(provider.credentials_encrypted);
                return JSON.parse(decryptedData);
            } catch (decryptError) {
                console.error('❌ Error decrypting provider credentials:', decryptError);
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting provider credentials:', error);
            throw error;
        }
    }

    /**
     * Get all active providers
     */
    async getAllActiveProviders() {
        try {
            const query = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.status = 'connected'
                ORDER BY gp.created_at DESC
            `;

            return await executeQuery(this.db, query);
        } catch (error) {
            console.error('❌ Error fetching all active providers:', error);
            throw error;
        }
    }

    /**
     * Get providers by type
     */
    async getProvidersByType(type, tenant_id = null) {
        try {
            if (!type || !Object.values(GPS_PROVIDER_TYPES).includes(type)) {
                throw new Error('Valid provider type is required');
            }

            let query = `
                SELECT gp.id, gp.name, gp.type, gp.status, gp.last_sync, gp.trailer_count, gp.error_message, gp.created_at,
                       gp.company_id, gp.tenant_id, c.name as company_name
                FROM gps_providers gp
                LEFT JOIN companies c ON gp.company_id = c.id
                WHERE gp.type = ?
            `;
            let params = [type];

            if (tenant_id) {
                query += ` AND gp.tenant_id = ?`;
                params.push(tenant_id);
            }

            query += ` ORDER BY gp.created_at DESC`;

            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('❌ Error fetching providers by type:', error);
            throw error;
        }
    }
}

module.exports = GPSProviderManager;
