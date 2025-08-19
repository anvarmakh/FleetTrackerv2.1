const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
    trailerManager, 
    companyManager, 
    userManager,
    trailerCustomCompanyManager
} = require('../database/database-manager');
const { executeQueryCamelCase } = require('../database/utils/db-helpers');
const { convertTrailerDataForDB, objectKeysToSnakeCase } = require('../database/utils/database-utilities');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handling');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Shared trailer creation logic
 */
async function createTrailerHandler(req, res) {
    try {
        const trailerData = req.body;
        
        if (!trailerData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer data is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        if (!user || !user.tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User tenant not found' 
            });
        }
        
        // Determine company ID
        let targetCompany = null;
        
        if (trailerData.companyId && trailerData.companyId.startsWith('trailer_custom_comp_')) {
            // It's a custom company
            targetCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailerData.companyId, user.tenantId);
            if (!targetCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to custom company' 
                });
            }
        } else {
            // It's a regular company
            targetCompany = await companyManager.verifyCompanyOwnership(trailerData.companyId, req.user.id, user.tenantId);
            if (!targetCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to company' 
                });
            }
        }
        
        // Convert camelCase to snake_case for database compatibility using utility
        const dbTrailerData = objectKeysToSnakeCase(trailerData);
        
        // Add company_id and tenant_id to the trailer data
        dbTrailerData.company_id = targetCompany.id;
        dbTrailerData.tenant_id = req.user.tenantId;
        
        // Validate trailer data including duplicate unit number check
        const validation = await trailerManager.validateTrailerData(dbTrailerData, req.user.tenantId);
        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: 'Trailer validation failed',
                details: validation.errors
            });
        }
        
        // Debug logging
        logger.debug('Debug - Target Company', { targetCompany });
        logger.debug('Debug - Trailer Data', { dbTrailerData });
        
        // Create the trailer
        const createResult = await trailerManager.createTrailer(dbTrailerData, targetCompany.id);
        
        if (!createResult || !createResult.id) {
            return res.status(500).json({ 
                success: false, 
                error: 'Failed to create trailer - database error' 
            });
        }
        
        const newTrailerId = createResult.id;
        logger.info(`Trailer created: ${newTrailerId}`, { companyId: targetCompany.id });
        
        // Get the created trailer data
        const createdTrailer = await trailerManager.getTrailerById(newTrailerId);
        
        res.status(201).json({
            success: true,
            data: createdTrailer,
            message: 'Trailer created successfully'
        });
        
    } catch (error) {
        console.error('❌ Error creating trailer:', error);
        
        // Handle specific constraint violation errors
        if (error.message && error.message.includes('UNIQUE constraint failed: persistent_trailers.tenant_id, unit_number')) {
            return res.status(400).json({
                success: false,
                error: 'A trailer with this unit number already exists in your fleet',
                details: ['Please use a different unit number or update the existing trailer']
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Internal server error while creating trailer'
        });
    }
}



// Create a new trailer
router.post('/create', createTrailerHandler);



// Create a new trailer (original route for backward compatibility)
router.post('/', createTrailerHandler);

// Debug endpoint to check trailers by company ID
router.get('/debug/by-company/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;

        
        const { trailerManager } = require('../database/database-manager');
        
        // Direct query to see trailers for specific company
        const query = `
            SELECT 
                id, external_id, company_id, tenant_id, provider_id,
                unit_number, status, gps_status, gps_enabled,
                last_latitude, last_longitude, last_address,
                last_gps_update, last_sync,
                created_at, updated_at
            FROM persistent_trailers 
            WHERE company_id = ?
            ORDER BY created_at DESC
        `;
        
        const { executeQueryCamelCase } = require('../database/utils/db-helpers');
        const rows = await executeQueryCamelCase(trailerManager.db, query, [companyId]);
        
        logger.debug('Debug: Trailers for company', { companyId, count: rows.length });
        
        res.json({
            success: true,
            companyId,
            count: rows.length,
            trailers: rows
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to check all trailers in database
router.get('/debug/all', async (req, res) => {
    try {
        logger.debug('Debug: Checking all trailers in database');
        
        const { trailerManager } = require('../database/database-manager');
        
        // Direct query to see all trailers
        const query = `
            SELECT 
                id, external_id, company_id, tenant_id, provider_id,
                unit_number, status, gps_status, gps_enabled,
                last_latitude, last_longitude, last_address,
                last_gps_update, last_sync,
                created_at, updated_at
            FROM persistent_trailers 
            ORDER BY created_at DESC
        `;
        
        const { executeQueryCamelCase } = require('../database/utils/db-helpers');
        const rows = await executeQueryCamelCase(trailerManager.db, query, []);
        
        logger.debug('Debug: All trailers in database', { count: rows.length });
        
        res.json({
            success: true,
            count: rows.length,
            trailers: rows
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Debug endpoint to check trailers for current user's company
router.get('/debug/current-company', authenticateToken, async (req, res) => {
    try {
            logger.debug('Debug: Checking trailers for current user company');
    logger.debug('Debug: Current user data', {
            id: req.user.id,
            companyId: req.user.companyId,
            tenantId: req.user.tenantId
        });
        
        const { trailerManager } = require('../database/database-manager');
        
        // Direct query to see trailers for current user's company
        const query = `
            SELECT 
                id, external_id, company_id, tenant_id, provider_id,
                unit_number, status, gps_status, gps_enabled,
                last_latitude, last_longitude, last_address,
                last_gps_update, last_sync,
                created_at, updated_at
            FROM persistent_trailers 
            WHERE company_id = ?
            ORDER BY created_at DESC
        `;
        
        const { executeQueryCamelCase } = require('../database/utils/db-helpers');
        const rows = await executeQueryCamelCase(trailerManager.db, query, [req.user.companyId]);
        
        logger.debug('Debug: Trailers for current user company', { companyId: req.user.companyId, count: rows.length });
        
        res.json({
            success: true,
            userCompanyId: req.user.companyId,
            userTenantId: req.user.tenantId,
            count: rows.length,
            trailers: rows
        });
    } catch (error) {
        console.error('❌ Debug endpoint error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get all trailers for the authenticated user
router.get('/', asyncHandler(async (req, res) => {
    try {
        // Wrap the entire logic in a try-catch to catch any errors
        try {
        let company = null;
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        // Get user's active company
        company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        // Get custom companies for the user's tenant
        let customCompanies = [];
        if (user && user.tenantId) {
            customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(user.tenantId);
        }
        
        // Get company ID from query or use active company
        let targetCompanyId = req.query.companyId || (company ? company.id : null);
        
        // If no specific company requested and no active company, but user has custom companies,
        // use the first custom company as default
        if (!targetCompanyId && customCompanies.length > 0) {
            targetCompanyId = customCompanies[0].id;
        }
        
        // If no company exists yet, return empty trailer list (new user scenario)
        if (!targetCompanyId) {
            return res.json({
                success: true,
                data: [],
                count: 0,
                message: 'No company created yet. Please create a company first.'
            });
        }
        
        // Check if it's a custom company
        if (user && user.tenantId) {
            const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(targetCompanyId, user.tenantId);
        }
        
        // If no specific company requested, use active company
        if (!req.query.companyId) {
            if (!targetCompanyId) {
                try {
                    company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
                    if (!company) {
                        return res.json({
                            success: true,
                            data: [],
                            count: 0,
                            message: 'No active company found. Please create a company first.'
                        });
                    }
                    targetCompanyId = company.id;
                } catch (error) {
                    console.error('❌ Error getting active company:', error);
                    console.error('❌ Error stack:', error.stack);
                    throw error;
                }
            }
        }
        
        // Check if it's a custom company for this user's tenant
        if (user && user.tenantId && targetCompanyId.startsWith('trailer_custom_comp_')) {
            try {
                const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(targetCompanyId, user.tenantId);
                if (!customCompany) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied to custom company' 
                    });
                }
            } catch (error) {
                console.error('❌ Error verifying custom company ownership:', error);
                console.error('❌ Error stack:', error.stack);
                throw error;
            }
        }
        
        // Build filters
        const filters = {
            status: req.query.status,
            search: req.query.search,
            limit: req.query.limit ? parseInt(req.query.limit) : 1000
        };
        
        // Get ALL trailers for the tenant (efficient tenant-based approach)
            logger.debug('Debug - Fetching ALL trailers for tenant', { tenantId: req.user.tenantId });
    logger.debug('Debug - Filters', { filters });
        
        let trailers = [];
        
        if (user && user.tenantId) {
            // Use the new tenant-based method to get all trailers efficiently
            try {
                trailers = await trailerManager.getEnhancedTrailerData('tenant', req.user.tenantId, filters, req.user.tenantId);
                logger.debug('Debug - Total trailers fetched by tenant', { count: trailers.length });
            } catch (error) {
                console.error('❌ Error fetching trailers by tenant:', error);
            }
            
            logger.debug('Debug - Total trailers fetched', { count: trailers.length });
        }
        

        
        res.json({
            success: true,
            data: trailers,
            count: trailers.length
        });
        
        } catch (innerError) {
            console.error('❌ Inner error in trailer list logic:', innerError);
            console.error('❌ Inner error stack:', innerError.stack);
            throw innerError;
        }
        
    } catch (error) {
        console.error('❌ Error fetching trailers:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch trailers: ' + error.message 
        });
    }
}));



// Get a specific trailer by ID
router.get('/:trailerId', async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        if (!trailerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer ID is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        // Get trailer details
        const trailer = await trailerManager.getTrailerById(trailerId);
        
        if (!trailer) {
            return res.status(404).json({ 
                success: false, 
                error: 'Trailer not found' 
            });
        }
        
        // Check access permissions
        if (user && user.tenantId) {
            // Check if it's a custom company trailer
            if (trailer.companyId && trailer.companyId.startsWith('trailer_custom_comp_')) {
                const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, user.tenantId);
                if (!customCompany) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied to trailer' 
                    });
                }
            } else {
                // Check if user has access to this company's trailers
                const company = await companyManager.verifyCompanyOwnership(trailer.companyId, req.user.id, user.tenantId);
                if (!company) {
                    return res.status(403).json({ 
                        success: false, 
                        error: 'Access denied to trailer' 
                    });
                }
            }
        }
        
        res.json({
            success: true,
            data: trailer
        });
        
    } catch (error) {
        console.error('❌ Error fetching trailer:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch trailer: ' + error.message 
        });
    }
});

// Update a trailer
router.put('/:trailerId', async (req, res) => {
    try {
        const { trailerId } = req.params;
        const updateData = req.body;
        
        if (!trailerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer ID is required' 
            });
        }
        
        if (!updateData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Update data is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        if (!user || !user.tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User tenant not found' 
            });
        }
        
        // Get existing trailer to check permissions
        const existingTrailer = await trailerManager.getTrailerById(trailerId);
        
        if (!existingTrailer) {
            return res.status(404).json({ 
                success: false, 
                error: 'Trailer not found' 
            });
        }
        
        // Check access permissions
        if (existingTrailer.companyId && existingTrailer.companyId.startsWith('trailer_custom_comp_')) {
            const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(existingTrailer.companyId, user.tenantId);
            if (!customCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        } else {
            const company = await companyManager.verifyCompanyOwnership(existingTrailer.companyId, req.user.id, user.tenantId);
            if (!company) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        }
        
        // Debug: Log the incoming update data
            logger.debug('Received trailer update data', { updateData });
    logger.debug('Manual override fields', {
            manualLocationOverride: updateData.manualLocationOverride,
            manualLocationNotes: updateData.manualLocationNotes
        });
        
        // Debug: Log address fields
        logger.debug('Address fields', {
            address: updateData.address,
            latitude: updateData.latitude,
            longitude: updateData.longitude
        });
        
        // Debug: Log manual override fields
        logger.debug('Manual override fields', {
            manualLocationOverride: updateData.manualLocationOverride,
            manualLocationNotes: updateData.manualLocationNotes,
            type: typeof updateData.manualLocationOverride
        });
        
        // Convert camelCase to snake_case for database compatibility
        const dbUpdateData = convertTrailerDataForDB(updateData);
        
        // Debug: Log the converted data
        logger.debug('Converted to snake_case', { dbUpdateData });
        logger.debug('Manual override in converted data', {
            manual_location_override: dbUpdateData.manual_location_override,
            manual_location_notes: dbUpdateData.manual_location_notes
        });
        
        // Remove undefined values
        Object.keys(dbUpdateData).forEach(key => {
            if (dbUpdateData[key] === undefined) {
                delete dbUpdateData[key];
            }
        });
        
        // Validate trailer data including duplicate unit number check (if unit_number is being updated)
        if (dbUpdateData.unit_number) {
            const validation = await trailerManager.validateTrailerData(
                { unit_number: dbUpdateData.unit_number }, 
                user.tenantId, 
                trailerId // Exclude current trailer from duplicate check
            );
            if (!validation.isValid) {
                return res.status(400).json({
                    success: false,
                    error: 'Trailer validation failed',
                    details: validation.errors
                });
            }
        }
        
        // Update the trailer
        const updatedTrailer = await trailerManager.updateTrailerInfo(trailerId, dbUpdateData);
        
        logger.info('Updated trailer', { trailerId });
        
        res.json({
            success: true,
            data: updatedTrailer,
            message: 'Trailer updated successfully'
        });
        
    } catch (error) {
        console.error('❌ Error updating trailer:', error);
        
        // Handle specific constraint violation errors
        if (error.message && error.message.includes('UNIQUE constraint failed: persistent_trailers.tenant_id, unit_number')) {
            return res.status(400).json({
                success: false,
                error: 'A trailer with this unit number already exists in your fleet',
                details: ['Please use a different unit number or update the existing trailer']
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update trailer: ' + error.message 
        });
    }
});

// Delete a trailer
router.delete('/:trailerId', async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        if (!trailerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer ID is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        if (!user || !user.tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User tenant not found' 
            });
        }
        
        // Get existing trailer to check permissions
        const existingTrailer = await trailerManager.getTrailerById(trailerId);
        
        if (!existingTrailer) {
            return res.status(404).json({ 
                success: false, 
                error: 'Trailer not found' 
            });
        }
        
        // Check access permissions
        if (existingTrailer.companyId && existingTrailer.companyId.startsWith('trailer_custom_comp_')) {
            const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(existingTrailer.companyId, user.tenantId);
            if (!customCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        } else {
            const company = await companyManager.verifyCompanyOwnership(existingTrailer.companyId, req.user.id, user.tenantId);
            if (!company) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        }
        
        // Delete the trailer
            logger.debug('Debug - Attempting to delete trailer', { trailerId });
    logger.debug('Debug - Trailer data', { existingTrailer });
        
        await trailerManager.deleteTrailer(trailerId);
        
        logger.info('Deleted trailer', { trailerId });
        
        res.json({
            success: true,
            message: 'Trailer deleted successfully'
        });
        
    } catch (error) {
        console.error('❌ Error deleting trailer:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete trailer: ' + error.message 
        });
    }
});

// Get trailer location history
router.get('/:trailerId/location-history', async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        if (!trailerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer ID is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        if (!user || !user.tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User tenant not found' 
            });
        }
        
        // Get trailer to check permissions
        const trailer = await trailerManager.getTrailerById(trailerId);
        
        if (!trailer) {
            return res.status(404).json({ 
                success: false, 
                error: 'Trailer not found' 
            });
        }
        
        // Check access permissions
        if (trailer.companyId && trailer.companyId.startsWith('trailer_custom_comp_')) {
            const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, user.tenantId);
            if (!customCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        } else {
            const company = await companyManager.verifyCompanyOwnership(trailer.companyId, req.user.id, user.tenantId);
            if (!company) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        }
        
        // Get location history (implementation depends on your data structure)
        const locationHistory = await trailerManager.getTrailerLocationHistory(trailerId);
        
        res.json({
            success: true,
            data: locationHistory
        });
        
    } catch (error) {
        console.error('❌ Error fetching trailer location history:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch location history: ' + error.message 
        });
    }
});

// Update trailer location
router.put('/:trailerId/location', async (req, res) => {
    try {
        const { trailerId } = req.params;
        const locationData = req.body;
        
        if (!trailerId) {
            return res.status(400).json({ 
                success: false, 
                error: 'Trailer ID is required' 
            });
        }
        
        if (!locationData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Location data is required' 
            });
        }
        
        // Get user profile to check tenant
        const user = await userManager.getUserProfile(req.user.id);
        
        if (!user || !user.tenantId) {
            return res.status(400).json({ 
                success: false, 
                error: 'User tenant not found' 
            });
        }
        
        // Get trailer to check permissions
        const trailer = await trailerManager.getTrailerById(trailerId);
        
        if (!trailer) {
            return res.status(404).json({ 
                success: false, 
                error: 'Trailer not found' 
            });
        }
        
        // Check access permissions
        if (trailer.companyId && trailer.companyId.startsWith('trailer_custom_comp_')) {
            const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, user.tenantId);
            if (!customCompany) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        } else {
            const company = await companyManager.verifyCompanyOwnership(trailer.companyId, req.user.id, user.tenantId);
            if (!company) {
                return res.status(403).json({ 
                    success: false, 
                    error: 'Access denied to trailer' 
                });
            }
        }
        
        // Update trailer location
        const updatedLocation = await trailerManager.applyLocationUpdate(trailerId, {
            ...locationData,
            source: 'manual',
            occurredAtUTC: new Date().toISOString()
        });
        
        logger.info('Updated location for trailer', { trailerId });
        
        res.json({
            success: true,
            data: updatedLocation,
            message: 'Trailer location updated successfully'
        });
        
    } catch (error) {
        console.error('❌ Error updating trailer location:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update trailer location: ' + error.message 
        });
    }
});

module.exports = router; 
