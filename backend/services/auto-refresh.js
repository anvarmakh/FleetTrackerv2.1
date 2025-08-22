const { userManager, companyManager, gpsProviderManager, trailerManager } = require('../database/database-manager');
const gpsProviderService = require('./gps-provider-service');
const sseService = require('./sse-service');
const rateLimiter = require('./rate-limiter');
const cacheService = require('./cache-service');
const { CACHE_KEYS, RATE_LIMITING } = require('../utils/constants');
const logger = require('../utils/logger');

/**
 * Consolidated Refresh Service
 * Handles 3 distinct operations:
 * 1. TEST - Test provider credentials (no data creation)
 * 2. SYNC - Create/update trailers from GPS data
 * 3. REFRESH - Update trailer locations only
 * 4. AUTO-REFRESH - Background location updates
 */
class RefreshService {
    static refreshInProgress = new Set();
    static lastRefreshTime = new Map();

    // ============================================================================
    // 1. TEST OPERATION - Test provider credentials only
    // ============================================================================

    /**
     * Test GPS provider connection (credentials only, no data creation)
     * @param {string} providerId - Provider ID
     * @param {Object} provider - Provider object with credentials
     * @returns {Promise<Object>} Test result
     */
    static async testProviderConnection(providerId, provider) {
        logger.debug('Testing provider connection', { name: provider.name, type: provider.type });
        
        try {
            // Use the existing testing service (credentials only)
            const { testGPSProviderConnection } = require('./gps-testing');
            const result = await testGPSProviderConnection(provider.type, provider.credentials);
            
            // Update provider status based on test result
            if (result.success) {
                await gpsProviderManager.updateProviderStatus(providerId, 'connected', null, result.trailerCount || 0);
            } else {
                await gpsProviderManager.updateProviderStatus(providerId, 'disconnected', result.error, 0);
            }
            
            return result;
        } catch (error) {
            logger.error(`Provider test error for ${provider.name}:`, error);
            await gpsProviderManager.updateProviderStatus(providerId, 'disconnected', error.message, 0);
            throw error;
        }
    }

    // ============================================================================
    // 2. SYNC OPERATION - Create/update trailers from GPS data
    // ============================================================================

    /**
     * Sync provider and create/update trailers in database
     * @param {string} providerId - Provider ID
     * @param {Object} provider - Provider object
     * @returns {Promise<Object>} Sync result
     */
    static async syncProvider(providerId, provider) {
        logger.info('Syncing provider', { name: provider.name, type: provider.type });
        
        try {
                logger.debug('Provider details', { 
        companyId: provider.company_id, 
        name: provider.name, 
        tenantId: provider.tenant_id,
        keys: Object.keys(provider)
    });
            
            // Fetch GPS data from provider
            const trailers = await gpsProviderService.fetchGPSDataFromProvider(provider, provider.company_id);
            
            if (trailers && trailers.length > 0) {
                // Store trailers in database (create/update)
                const { created, updated } = await this.storeTrailersInDatabase(trailers, provider.company_id);
                
                // Update provider status
                await gpsProviderManager.updateProviderStatus(providerId, 'connected', null, trailers.length);
                
                logger.info('Provider sync successful', { 
        trailerCount: trailers.length, 
        created, 
        updated 
    });
                
                return {
                    success: true,
                    trailerCount: trailers.length,
                    created,
                    updated,
                    message: `Successfully synced ${trailers.length} trailers`
                };
            } else {
                // Update provider status to disconnected since no data was returned
                await gpsProviderManager.updateProviderStatus(providerId, 'disconnected', 'No trailers found', 0);
                logger.warn('No trailers found for provider', { name: provider.name });
                
                return {
                    success: true,
                    trailerCount: 0,
                    created: 0,
                    updated: 0,
                    message: 'No trailers found'
                };
            }
        } catch (error) {
            logger.error(`Provider sync error for ${provider.name}:`, error);
            await gpsProviderManager.updateProviderStatus(providerId, 'disconnected', error.message, 0);
            throw error;
        }
    }

    // ============================================================================
    // 3. REFRESH OPERATION - Update trailer locations only
    // ============================================================================

    /**
     * Refresh trailer locations only (no trailer creation/updates)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Refresh result
     */
    static async refreshLocations(userId) {
        if (this.refreshInProgress.has(userId)) {
            return {
                success: true,
                message: 'Location refresh already in progress',
                inProgress: true
            };
        }

        try {
            // Get user's companies and providers
            const user = await userManager.getUserProfile(userId);
            const companies = await cacheService.cached(
                CACHE_KEYS.COMPANY_DATA,
                () => companyManager.getUserCompanies(userId, user.tenantId, user.organization_role || 'user', null, { limit: 100 }),
                user.tenantId
            );
            const allProviders = await cacheService.cached(
                CACHE_KEYS.GPS_PROVIDERS,
                () => gpsProviderManager.getUserProviders(userId),
                user.tenantId
            );

            // Trigger location-only refresh (non-blocking)
            this.updateTrailerLocations(userId, 'manual_refresh')
                .catch(error => {
                    logger.error('Location refresh error:', error);
                    sseService.notifyClient(userId, {
                        type: 'refresh_error',
                        error: error.message
                    });
                });

            return {
                success: true,
                message: 'Location refresh started',
                stats: {
                    companies: companies.data.length,
                    providers: allProviders.data.length
                }
            };
        } catch (error) {
            logger.error('Location refresh setup error:', error);
            throw error;
        }
    }

    /**
     * Update trailer locations only (no trailer creation/updates)
     * @param {string} userId - User ID
     * @param {string} triggerType - Type of refresh trigger
     */
    static async updateTrailerLocations(userId, triggerType) {
        if (this.refreshInProgress.has(userId)) {
            return;
        }

        this.refreshInProgress.add(userId);
        const startTime = Date.now();

        try {
            sseService.notifyClient(userId, {
                type: 'refresh_start',
                message: `Starting ${triggerType} location refresh...`,
                timestamp: new Date().toISOString()
            });

            // Get user's providers
            const user = await userManager.getUserProfile(userId);
            const allProviders = await cacheService.cached(
                CACHE_KEYS.GPS_PROVIDERS,
                () => gpsProviderManager.getUserProviders(userId),
                user.tenantId
            );

            let totalTrailersUpdated = 0;
            let totalLocationsUpdated = 0;

            // Update locations for each provider
            for (const provider of allProviders.data) {
                try {
                    await new Promise(resolve => setTimeout(resolve, RATE_LIMITING.BETWEEN_PROVIDERS));
                    
                    // Fetch only location data (no trailer creation/updates)
                    const locationData = await gpsProviderService.fetchLocationDataFromProvider(provider, provider.company_id);
                    
                    if (locationData && locationData.length > 0) {
                        // Update only trailer locations
                        const { updated } = await this.updateTrailerLocationsInDatabase(locationData, provider.company_id);
                        totalTrailersUpdated += locationData.length;
                        totalLocationsUpdated += updated;
                        
                        console.log(`✅ Updated ${updated} locations for ${locationData.length} trailers from ${provider.name}`);
                    } else {
                        logger.debug(`No location data found for provider: ${provider.name}`);
                    }
                } catch (error) {
                    logger.error(`Error updating locations for provider ${provider.name}:`, error);
                }
            }

            const duration = Date.now() - startTime;

            sseService.notifyClient(userId, {
                type: 'refresh_complete',
                message: `Location refresh completed successfully`,
                stats: {
                    trailersProcessed: totalTrailersUpdated,
                    locationsUpdated: totalLocationsUpdated,
                    duration: duration
                },
                timestamp: new Date().toISOString()
            });

            this.lastRefreshTime.set(userId, new Date().toISOString());
            logger.info(`Location refresh completed for user: ${userId}`, { duration, trailersProcessed: totalTrailersUpdated, locationsUpdated: totalLocationsUpdated });

        } catch (error) {
            logger.error(`Location refresh error for user: ${userId}`, error);
            
            sseService.notifyClient(userId, {
                type: 'refresh_error',
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } finally {
            this.refreshInProgress.delete(userId);
        }
    }

    // ============================================================================
    // 4. AUTO-REFRESH SYSTEM - Background location updates every hour
    // ============================================================================

    /**
     * Start the auto-refresh system (location updates every hour)
     */
    static startAutoRefreshSystem() {
        logger.info('Starting auto-refresh system (location updates every hour)');
        
        // Location updates every hour
        setInterval(async () => {
            try {
                await this.runScheduledLocationUpdates();
            } catch (error) {
                logger.error('Scheduled location update error:', error);
            }
        }, 60 * 60 * 1000); // 1 hour
        
        // Maintenance alerts every 24 hours
        setInterval(async () => {
            try {
                await this.runScheduledMaintenance();
            } catch (error) {
                logger.error('Scheduled maintenance error:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 hours
        
        logger.info('Auto-refresh system started (locations: 1h, maintenance: 24h)');
    }

    /**
     * Run scheduled location updates
     */
    static async runScheduledLocationUpdates() {
        logger.debug('Running scheduled location updates');
        
        const users = await userManager.getAllActiveUsers({ limit: 100 });
        const tenantGroups = this.groupUsersByTenant(users.data);
        
        for (const [tenantId, tenantUsers] of tenantGroups) {
            try {
                await this.processTenantLocationUpdates(tenantId, tenantUsers, 'scheduled_location_update');
            } catch (error) {
                logger.error(`Tenant location update error for ${tenantId}:`, error);
            }
        }
    }

    /**
     * Process location updates for a tenant with rate limiting
     */
    static async processTenantLocationUpdates(tenantId, users, triggerType) {
        logger.debug(`Processing location updates for tenant ${tenantId} with ${users.length} users`);
        
        for (const user of users) {
            try {
                if (!rateLimiter.isAllowed(tenantId, 'location_update', 10, 60000)) {
                    logger.debug(`Rate limit reached for tenant ${tenantId}, skipping user ${user.id}`);
                    continue;
                }
                
                await rateLimiter.queueOperation(
                    tenantId,
                    'location_update',
                    () => this.updateTrailerLocations(user.id, triggerType),
                    { maxOperations: 1, windowMs: 6000, priority: 1 }
                );
                
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITING.BETWEEN_USERS));
            } catch (error) {
                console.error(`Tenant location update error for user ${user.id}:`, error.message);
            }
        }
    }

    // ============================================================================
    // UTILITY METHODS
    // ============================================================================

    /**
     * Get refresh status for a user
     * @param {string} userId - User ID
     * @returns {Object} Status information
     */
    static getRefreshStatus(userId) {
        return {
            inProgress: this.refreshInProgress.has(userId),
            lastRefresh: this.lastRefreshTime.get(userId) || null,
            activeConnections: sseService.hasConnection(userId)
        };
    }

    /**
     * Store trailers in database (for sync operation)
     */
    static async storeTrailersInDatabase(trailers, providerCompanyId) {
        let created = 0;
        let updated = 0;

        const existingTrailers = await trailerManager.getAllTrailersForCompany(providerCompanyId, { limit: 1000 });
        const processedTrailerIds = new Set();

        for (const trailer of trailers) {
            try {
                // Try multiple lookup strategies to find existing trailer
                let existingTrailer = await trailerManager.getTrailerByDeviceId(trailer.id, providerCompanyId);
                
                if (!existingTrailer && trailer.vin) {
                    existingTrailer = await trailerManager.getTrailerByDeviceId(trailer.vin, providerCompanyId);
                }
                
                // If still not found, try looking up by the unit number that would be created
                if (!existingTrailer && trailer.unit_number) {
                    // Get the tenant ID from the provider company
                    const provider = await gpsProviderManager.getProviderById(providerCompanyId);
                    if (provider && provider.tenant_id) {
                        existingTrailer = await trailerManager.checkUnitNumberExistsInTenant(trailer.unit_number, provider.tenant_id);
                    }
                }
                
                if (existingTrailer) {
                    await trailerManager.updateTrailer(existingTrailer.id, trailer);
                    
                    updated++;
                    processedTrailerIds.add(existingTrailer.id);
                } else {
                    // Before creating, double-check if a trailer with this unit number already exists
                    if (trailer.unit_number) {
                        const provider = await gpsProviderManager.getProviderById(providerCompanyId);
                        if (provider && provider.tenant_id) {
                            const duplicateCheck = await trailerManager.checkUnitNumberExistsInTenant(trailer.unit_number, provider.tenant_id);
                            if (duplicateCheck) {
                                await trailerManager.updateTrailer(duplicateCheck.id, trailer);
                                
                                updated++;
                                processedTrailerIds.add(duplicateCheck.id);
                                continue;
                            }
                        }
                    }
                    
                    const createResult = await trailerManager.createTrailer(trailer, providerCompanyId);
                    
                    created++;
                }
            } catch (error) {
                // Handle unique constraint violations specifically
                if (error.message && error.message.includes('UNIQUE constraint failed: persistent_trailers.tenant_id, unit_number')) {
                    logger.debug(`Unique constraint violation for unit_number: ${trailer.unit_number}, attempting to find and update existing trailer`);
                    
                    try {
                        // Get the tenant ID from the provider company
                        const provider = await gpsProviderManager.getProviderById(providerCompanyId);
                        if (provider && provider.tenant_id) {
                            // Try to find the existing trailer by unit number
                            const existingTrailer = await trailerManager.checkUnitNumberExistsInTenant(trailer.unit_number, provider.tenant_id);
                            if (existingTrailer) {
                                await trailerManager.updateTrailer(existingTrailer.id, trailer);
                                
                                updated++;
                                processedTrailerIds.add(existingTrailer.id);
                            } else {
                                logger.error(`Could not find existing trailer with unit_number ${trailer.unit_number} despite constraint violation`);
                            }
                        }
                    } catch (updateError) {
                        logger.error(`Error updating existing trailer after constraint violation:`, updateError);
                    }
                } else {
                    logger.error(`Error storing trailer ${trailer.id}:`, error);
                }
            }
        }

        // Mark trailers not in this sync as disconnected
        for (const existingTrailer of existingTrailers.data) {
            if (!processedTrailerIds.has(existingTrailer.id)) {
                try {
                    await trailerManager.markTrailerAsDisconnected(existingTrailer.id);
                } catch (error) {
                    logger.error(`Error marking trailer ${existingTrailer.id} as disconnected:`, error);
                }
            }
        }

        return { created, updated };
    }

    /**
     * Update trailer locations only (for refresh operation)
     */
    static async updateTrailerLocationsInDatabase(locationData, providerCompanyId) {
        let updated = 0;

        for (const location of locationData) {
            try {
                let existingTrailer = await trailerManager.getTrailerByDeviceId(location.id, providerCompanyId);
                
                if (!existingTrailer && location.vin) {
                    existingTrailer = await trailerManager.getTrailerByDeviceId(location.vin, providerCompanyId);
                }
                
                if (existingTrailer) {
                    // Update location data using unified function with GPS source
                    const locationUpdate = {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        address: location.address,
                        source: 'gps',
                        occurredAtUTC: location.timestamp || new Date().toISOString()
                    };
                    
                    const result = await trailerManager.applyLocationUpdate(existingTrailer.id, locationUpdate);
                    
                    if (!result.skipped) {
                        updated++;
                    }
                }
            } catch (error) {
                logger.error(`Error updating location for trailer ${location.id}:`, error);
            }
        }

        return { updated };
    }

    /**
     * Run scheduled maintenance updates
     */
    static async runScheduledMaintenance() {
        logger.debug('Running scheduled maintenance updates');
        
        const users = await userManager.getAllActiveUsers({ limit: 100 });
        const tenantGroups = this.groupUsersByTenant(users.data);
        
        for (const [tenantId, tenantUsers] of tenantGroups) {
            try {
                await this.processTenantMaintenance(tenantId, tenantUsers);
            } catch (error) {
                logger.error(`Tenant maintenance error for ${tenantId}:`, error);
            }
        }
    }

    /**
     * Process maintenance for a tenant with rate limiting
     */
    static async processTenantMaintenance(tenantId, users) {
        logger.debug(`Processing maintenance for tenant ${tenantId} with ${users.length} users`);
        
        for (const user of users) {
            try {
                if (!rateLimiter.isAllowed(tenantId, 'maintenance', 10, 60000)) {
                    logger.debug(`Rate limit reached for tenant ${tenantId}, skipping user ${user.id}`);
                    continue;
                }
                
                await rateLimiter.queueOperation(
                    tenantId,
                    'maintenance',
                    () => this.updateMaintenanceAlerts(user.id),
                    { maxOperations: 1, windowMs: 6000, priority: 2 }
                );
                
                await new Promise(resolve => setTimeout(resolve, RATE_LIMITING.BETWEEN_USERS));
            } catch (error) {
                logger.error(`Tenant maintenance error for user ${user.id}:`, error.message);
            }
        }
    }

    /**
     * Update maintenance alerts for a user
     */
    static async updateMaintenanceAlerts(userId) {
        try {
            logger.debug(`Updating maintenance alerts for user: ${userId}`);
            
            const user = await userManager.getUserProfile(userId);
            const companies = await cacheService.cached(
                CACHE_KEYS.COMPANY_DATA,
                () => companyManager.getUserCompanies(userId, user.tenantId, null, null, { limit: 100 }),
                user.tenantId
            );
            
            const { maintenanceManager } = require('../database/database-manager');
            
            for (const company of companies.data) {
                try {
                    const trailers = await trailerManager.getAllTrailersForCompany(company.id, { limit: 1000 });
                    
                    for (const trailer of trailers.data) {
                        try {
                            await maintenanceManager.checkAndCreateAlerts(trailer.id);
                        } catch (error) {
                            logger.error(`Error checking maintenance for trailer ${trailer.id}:`, error);
                        }
                    }
                } catch (error) {
                    logger.error(`Error updating maintenance for company ${company.id}:`, error);
                }
            }
            
            logger.debug(`Maintenance alerts updated for user: ${userId}`);
        } catch (error) {
            logger.error(`Error updating maintenance alerts for user: ${userId}`, error);
        }
    }

    /**
     * Group users by tenant
     */
    static groupUsersByTenant(users) {
        const tenantGroups = new Map();
        for (const user of users) {
            const tenantId = user.tenantId || 'default';
            if (!tenantGroups.has(tenantId)) {
                tenantGroups.set(tenantId, []);
            }
            tenantGroups.get(tenantId).push(user);
        }
        return tenantGroups;
    }


}

module.exports = RefreshService; 
