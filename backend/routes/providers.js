const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { gpsProviderManager, companyManager } = require('../database/database-manager');
const Joi = require('joi');
const { testGPSProviderConnection } = require('../services/gps-testing');
const { asyncHandler } = require('../middleware/error-handling');
const logger = require('../utils/logger');

// Import isAssetActive from gps-testing to ensure consistency
const { isAssetActive } = require('../services/gps-testing');

const router = express.Router();

// Get all GPS providers for the tenant
router.get('/', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {       
        // Get all companies for the user
        const companiesResponse = await companyManager.getUserCompanies(req.user.id, req.user.tenantId, null, { limit: 100 });
        const companies = companiesResponse.data || [];
        
        // If no companies exist, return empty providers list
        if (!companies || companies.length === 0) {
            return res.json({
                success: true,
                data: [],
                message: 'No companies found. Please create a company first.'
            });
        }
        
        // Get all providers for all companies
        const allProviders = [];
        for (const company of companies) {
            const providers = await gpsProviderManager.getCompanyProviders(company.id, req.user.tenantId);
            providers.forEach(provider => {
                provider.companyName = company.name;
            });
            allProviders.push(...providers);
        }
        
        res.json({
            success: true,
            data: allProviders
        });
    } catch (error) {
        console.error('Error fetching all providers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GPS providers'
        });
    }
}));

// Get all GPS providers for a company
router.get('/:companyId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const company = await companyManager.verifyCompanyOwnership(companyId, req.user.id, req.user.tenantId);
        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }
        
        const providers = await gpsProviderManager.getCompanyProviders(companyId, req.user.tenantId);
        
        res.json({
            success: true,
            data: providers
        });
    } catch (error) {
        console.error('Error fetching providers:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch GPS providers'
        });
    }
}));

// Create a new GPS provider
router.post('/:companyId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { companyId } = req.params;
        // Validate provider payload and credentials by type
        const baseSchema = Joi.object({
            name: Joi.string().min(2).max(100).required(),
            type: Joi.string().valid('samsara','skybitz','spireon').required(),
            description: Joi.string().allow('', null),
            credentials: Joi.object().required()
        });
        const { error: baseErr } = baseSchema.validate(req.body, { abortEarly: false });
        if (baseErr) {
            return res.status(400).json({ success: false, error: 'Validation failed', details: baseErr.details.map(d => d.message) });
        }

        const type = req.body.type.toLowerCase();
        let credSchema;
        if (type === 'samsara') {
            credSchema = Joi.object({
                apiToken: Joi.string().min(10).required(),
                apiUrl: Joi.string().uri().required(),
                providerName: Joi.string().allow('', null)
            });
        } else if (type === 'skybitz') {
            credSchema = Joi.object({
                username: Joi.string().required(),
                password: Joi.string().required(),
                baseURL: Joi.string().uri().optional(),
                providerName: Joi.string().allow('', null)
            });
        } else if (type === 'spireon') {
            credSchema = Joi.object({
                apiKey: Joi.string().required(),
                username: Joi.string().required(),
                password: Joi.string().required(),
                nspireId: Joi.alternatives(Joi.string(), Joi.number()).required(),
                baseURL: Joi.string().uri().optional(),
                providerName: Joi.string().allow('', null)
            });
        }
        const { error: credErr } = credSchema.validate(req.body.credentials, { abortEarly: false });
        if (credErr) {
            return res.status(400).json({ success: false, error: 'Invalid credentials', details: credErr.details.map(d => d.message) });
        }
        
        
        // Debug: Check existing providers for this company
        const existingProviders = await gpsProviderManager.getCompanyProviders(companyId, req.user.tenantId);
        const nameExists = existingProviders.some(p => p.name.toLowerCase() === req.body.name.toLowerCase());
        
        // Debug: Check ALL providers in database for this name (within tenant)
        const allProvidersWithName = await gpsProviderManager.getAllProvidersByName(req.body.name, req.user.tenantId, { limit: 100 });
        
        const company = await companyManager.verifyCompanyOwnership(companyId, req.user.id, req.user.tenantId);
        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }
        
        // Check if provider name already exists for this company
        if (nameExists) {
            return res.status(409).json({
                success: false,
                error: 'A provider with this name already exists for this company'
            });
        }
        
        const result = await gpsProviderManager.addProvider(companyId, { ...req.body, tenant_id: req.user.tenantId });
        
        // Get the newly created provider to return
        const newProvider = await gpsProviderManager.getProviderById(result.id);
        
        if (newProvider && newProvider.credentials_encrypted) {
        }
        
        res.status(201).json({
            success: true,
            data: newProvider,
            message: 'GPS provider created successfully'
        });
        
    } catch (error) {
        console.error('Error creating provider:', error);
        
        // Handle specific database errors
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({
                success: false,
                error: 'A provider with this name already exists'
            });
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to create GPS provider'
        });
    }
}));

// Update a GPS provider
router.put('/:id', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, credentials } = req.body;
        
        logger.debug('Updating provider with data', { id, name, type, hasCredentials: !!credentials });
        
        if (!name || !type) {
            return res.status(400).json({
                success: false,
                error: 'Provider name and type are required'
            });
        }
        
        // Allow updating without credentials (they might be empty when editing)
        if (!credentials) {
            logger.warn('No credentials provided for update, skipping credential update');
        }

        const result = await gpsProviderManager.updateProvider(id, req.user.id, {
            name: name.trim(), type, credentials
        });

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Provider not found'
            });
        }

        logger.info('GPS provider updated', { name, userEmail: req.user.email });

        res.json({
            success: true,
            message: 'GPS provider updated successfully',
            data: result
        });
    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                error: 'Provider not found'
            });
        }
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({
                success: false,
                error: 'Provider name already exists for this company'
            });
        }
        console.error('Update provider error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update GPS provider'
        });
    }
}));

// Delete a GPS provider
router.delete('/:id', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const { deleteRelatedTrailers = false } = req.query;
        
        const result = await gpsProviderManager.deleteProvider(id, req.user.id, deleteRelatedTrailers === 'true');
        
        logger.info('GPS provider deleted', { id, deleteRelatedTrailers });
        
        res.json({
            success: true,
            message: `GPS provider deleted successfully${deleteRelatedTrailers === 'true' ? ' along with related trailers' : ''}`,
            deletedTrailersCount: result.deletedTrailersCount || 0
        });
    } catch (error) {
        console.error('Error deleting GPS provider:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete GPS provider'
        });
    }
}));

// Test GPS provider connection
router.post('/:id/test', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        logger.info('Testing provider', { id });
        
        const provider = await gpsProviderManager.getProviderForUser(id, req.user.id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                error: 'GPS provider not found'
            });
        }

        // Test connection based on provider type
        let testResult = { success: false, error: 'Unknown provider type', trailerCount: 0 };
        
        try {
            logger.debug('Provider data from database', { 
        id: provider.id, 
        name: provider.name, 
        type: provider.type, 
        credentialsEncrypted: !!provider.credentials_encrypted 
    });
            
            const EncryptionUtil = require('../utils/encryption');
            const decryptedString = EncryptionUtil.decrypt(provider.credentials_encrypted);
            let credentials;
            try {
                credentials = JSON.parse(decryptedString);
            } catch (parseError) {
                console.error('Failed to parse decrypted credentials:', parseError);
                throw new Error('Invalid credentials format');
            }
            // Do not log decrypted credentials
            
            testResult = await testGPSProviderConnection(provider.type, credentials);
        } catch (decryptError) {
            console.error('Failed to decrypt credentials:', decryptError);
            testResult = { success: false, error: 'Failed to decrypt credentials' };
        }
        
        // Update provider status
        const newStatus = testResult.success ? 'connected' : 'error';
        const errorMessage = testResult.success ? null : testResult.error;
        const trailerCount = testResult.success ? testResult.trailerCount : null;
        
        await gpsProviderManager.updateProviderStatus(id, newStatus, errorMessage, trailerCount);
        
        logger.info('Provider test result', { 
        providerName: provider.name, 
        success: testResult.success 
    });
        
        res.json({
            success: testResult.success,
            message: testResult.success ? 'Connection test successful' : 'Connection test failed',
            error: testResult.error,
            trailerCount: testResult.trailerCount || 0
        });
    } catch (error) {
        console.error('Test provider error:', error);
        
        try {
            await gpsProviderManager.updateProviderStatus(req.params.id, 'error', error.message, null);
        } catch (statusError) {
            console.error('Error updating provider status:', statusError);
        }
        
        res.status(500).json({
            success: false,
            error: 'Failed to test GPS provider connection: ' + error.message
        });
    }
}));

// Sync GPS provider and create trailer records
router.post('/:id/sync', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        logger.info('Syncing provider', { id });
        
        const provider = await gpsProviderManager.getProviderForUser(id, req.user.id);
        
        if (!provider) {
            return res.status(404).json({
                success: false,
                error: 'GPS provider not found'
            });
        }

        // Check for company ID mismatch
        if (provider.company_id !== req.user.companyId) {
            logger.warn('Company ID mismatch', { 
        providerCompanyId: provider.company_id, 
        userCompanyId: req.user.companyId 
    });
        }

        // Decrypt credentials
        const EncryptionUtil = require('../utils/encryption');
        const decryptedString = EncryptionUtil.decrypt(provider.credentials_encrypted);
        let credentials;
        try {
            credentials = JSON.parse(decryptedString);
        } catch (parseError) {
            console.error('Failed to parse decrypted credentials:', parseError);
            return res.status(400).json({
                success: false,
                error: 'Invalid credentials format'
            });
        }

        // Use the consolidated refresh service for syncing
        const RefreshService = require('../services/auto-refresh');
        const syncResult = await RefreshService.syncProvider(id, {
            ...provider,
            credentials: credentials
        });

        if (!syncResult.success) {
            return res.status(400).json({
                success: false,
                error: syncResult.error
            });
        }

        // Create trailer records for each asset
        const { trailerManager } = require('../database/database-manager');
        let createdCount = 0;
        let updatedCount = 0;
        let activeAssets = 0; // ADD: Counter for active assets



        // Helper function to clean unit names
        const cleanUnitName = (name) => {
            if (!name) return name;
            // Remove "Trailer" text (case insensitive) and trim whitespace
            return name.replace(/trailer/gi, '').trim();
        };

        // Helper function to map GPS status to system status
        const mapGpsStatus = (gpsStatus) => {
            if (!gpsStatus) return 'available';
            
            const status = gpsStatus.toLowerCase();
            
            // Map GPS provider statuses to system statuses
            if (status === 'stopped' || status === 'active' || status === 'connected' || status === 'online') {
                return 'available';
            } else if (status === 'disconnected' || status === 'offline' || status === 'inactive') {
                return 'disconnected';
            } else {
                return 'available'; // Default to available for unknown statuses
            }
        };

        if (syncResult.assets && Array.isArray(syncResult.assets)) {
            logger.debug('Processing assets from GPS provider', { assetCount: syncResult.assets.length });
            
            for (const asset of syncResult.assets) {
                try {
                    // Clean the unit name
                    const cleanName = cleanUnitName(asset.name || asset.assetName || asset.id);
                    
                    // Check if trailer already exists
                    const externalId = asset.id || asset.assetId;
                    const existingTrailer = await trailerManager.getTrailerByExternalId(externalId, req.user.companyId);
                    
                    if (existingTrailer) {
                        // Update existing trailer
                        const mappedGpsStatus = mapGpsStatus(asset.status);
                        
                        // Extract location data
                        const latitude = asset.location?.latitude || null;
                        const longitude = asset.location?.longitude || null;
                        const address = asset.location?.address || 'Location not available';
                        
                        const updateData = {
                            unit_number: cleanName,
                            // Vehicle details from GPS provider
                            vin: asset.vin || null,
                            make: asset.make || null,
                            model: asset.model || null,
                            year: asset.year || null,
                            plate: asset.plate || null,
                            // Location data
                            last_latitude: latitude,
                            last_longitude: longitude,
                            last_address: address,
                            last_gps_update: asset.location?.timestamp || new Date().toISOString(),
                            last_sync: new Date().toISOString(),
                            gps_status: mappedGpsStatus,
                            gps_enabled: true,
                            status: 'available'
                        };
                        
                        const updateResult = await trailerManager.updateTrailer(existingTrailer.id, updateData);
                        if (updateResult) {
                            updatedCount++;
                        }
                    } else {
                        // Create new trailer
                        const mappedGpsStatus = mapGpsStatus(asset.status);
                        
                        // Extract location data
                        const latitude = asset.location?.latitude || null;
                        const longitude = asset.location?.longitude || null;
                        const address = asset.location?.address || 'Location not available';
                        
                        const createData = {
                            external_id: externalId,
                            unit_number: cleanName,
                            company_id: req.user.companyId,
                            tenant_id: provider.tenant_id,
                            provider_id: provider.id,
                            // Vehicle details from GPS provider
                            vin: asset.vin || null,
                            make: asset.make || null,
                            model: asset.model || null,
                            year: asset.year || null,
                            plate: asset.plate || null,
                            // Location data
                            last_latitude: latitude,
                            last_longitude: longitude,
                            last_address: address,
                            last_gps_update: asset.location?.timestamp || new Date().toISOString(),
                            last_sync: new Date().toISOString(),
                            gps_status: mappedGpsStatus,
                            gps_enabled: true,
                            status: 'available'
                        };
                        
                        const createResult = await trailerManager.createTrailer(createData, req.user.companyId);
                        if (createResult && createResult.id) {
                            createdCount++;
                        }
                    }
                } catch (assetError) {
                    console.error(`Error processing asset ${asset.id || asset.assetId}:`, assetError);
                }
            }
        }

        logger.info('Sync complete', { createdCount, updatedCount });

        res.json({
            success: true,
            message: 'GPS provider synced successfully',
            data: {
                createdCount: createdCount,
                updatedCount: updatedCount,
                activeAssets: activeAssets
            }
        });
    } catch (error) {
        console.error('Sync provider error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to sync GPS provider: ' + error.message
        });
    }
}));

module.exports = router;