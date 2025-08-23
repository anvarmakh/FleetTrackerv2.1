const axios = require('axios');
const BaseGPSProvider = require('./base-provider');
const logger = require('../../utils/logger');
const geocodingService = require('../geocoding');

/**
 * Spireon GPS Provider Service
 * Handles integration with Spireon GPS tracking platform
 */
class SpireonService extends BaseGPSProvider {
    constructor() {
        super('Spireon');
    }

    /**
     * Validate Spireon credentials
     * @param {Object} credentials - Spireon credentials
     * @returns {boolean} True if valid
     */
    validateCredentials(credentials) {
        const { apiKey, username, password, nspireId } = credentials;
        return !!(apiKey && username && password && nspireId);
    }

    /**
     * Fetch GPS data from Spireon
     * @param {Object} credentials - Spireon credentials
     * @returns {Promise<Array>} Array of trailer data
     */
    async fetchData(credentials) {
        try {
            logger.info(`📡 Fetching Spireon data for ${credentials.providerName || 'Spireon'}...`);
            logger.debug(`🔑 Credentials check:`, {
                hasApiKey: !!credentials.apiKey,
                hasUsername: !!credentials.username,
                hasPassword: !!credentials.password,
                hasNspireId: !!credentials.nspireId,
                baseURL: credentials.baseURL || 'https://services.spireon.com/v0/rest'
            });
            
            if (!this.validateCredentials(credentials)) {
                throw new Error('Invalid Spireon credentials: apiKey, username, password, and nspireId are required');
            }
            
            const { apiKey, username, password, nspireId } = credentials;
            const baseURL = credentials.baseURL || 'https://services.spireon.com/v0/rest';
            
            const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
            
            logger.info(`🌐 Making request to: ${baseURL}/assets`);
            logger.debug(`🔑 Using API key: ${apiKey.substring(0, 8)}...`);
            
            const response = await axios.get(`${baseURL}/assets`, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'X-Nspire-AppToken': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            logger.info(`📥 Response status: ${response.status}`);
            logger.info(`📥 Assets found: ${response.data?.content?.length || response.data?.length || 0}`);

            const assets = response.data.content || response.data || [];
            const processedTrailers = await this.processTrailerData(assets, credentials.providerName || 'Spireon');
            return processedTrailers;
            
        } catch (error) {
            logger.error(`❌ Error fetching Spireon data:`, error.message);
            if (error.response) {
                logger.error(`❌ Response status: ${error.response.status}`);
                logger.error(`❌ Response data:`, error.response.data);
            }
            return [];
        }
    }

    /**
     * Process raw Spireon data into standardized format
     * @param {Array} assets - Raw asset data from Spireon
     * @param {string} providerName - Provider name
     * @returns {Array} Standardized trailer data
     */
    async processTrailerData(assets, providerName) {
        const processedTrailers = await Promise.all(assets.map(async (asset) => {
            const mappedStatus = this.mapStatus(asset.status);
            
            // Geocode coordinates for address
            let fullAddress = 'Location unavailable';
            
            if (asset.lastLocation?.lat && asset.lastLocation?.lng) {
                const latNum = parseFloat(asset.lastLocation.lat);
                const lngNum = parseFloat(asset.lastLocation.lng);
                
                if (!isNaN(latNum) && !isNaN(lngNum) && 
                    latNum >= -90 && latNum <= 90 && 
                    lngNum >= -180 && lngNum <= 180) {
                    
                    try {
                        const reverseAddress = await geocodingService.getStandardizedAddress(latNum, lngNum);
                        fullAddress = reverseAddress && reverseAddress !== 'Location unavailable' 
                            ? reverseAddress 
                            : `${latNum}, ${lngNum}`;
                    } catch (error) {
                        fullAddress = `${latNum}, ${lngNum}`;
                    }
                }
            }
            
            // Clean unit number by removing "Trailer" text
            const rawUnitNumber = asset.name || asset.id;
            const cleanedUnitNumber = this.cleanUnitNumber(rawUnitNumber);
            
            return this.createStandardTrailer({
                id: `${providerName.replace(/\s+/g, '')}-${asset.id}`,
                provider_id: 'Spireon',
                account: providerName,
                latitude: parseFloat(asset.lastLocation?.lat),
                longitude: parseFloat(asset.lastLocation?.lng),
                speed: parseFloat(asset.speed) || 0,
                status: mappedStatus,
                lastUpdate: new Date(asset.locationLastReported || asset.lastUpdated || Date.now()),
                driver: asset.driverName || asset.operatorName || 'Unknown',
                deviceId: asset.instrumentationRef?.deviceId || asset.id,
                originalId: asset.name || asset.id,
                unit_number: cleanedUnitNumber, // Use cleaned unit number
                make: asset.make,
                model: asset.model,
                year: asset.year,
                vin: asset.vin,
                plate: asset.plate || asset.licensePlate || asset.registration || null,
                odometer: asset.odometer,
                address: fullAddress, // Always use full address (formatted string)
                last_address: fullAddress // Always use full address (formatted string)
            });
        }));
        
        return this.filterValidTrailers(processedTrailers);
    }

    /**
     * Get Spireon provider status
     * @param {Object} credentials - Spireon credentials
     * @returns {Promise<Object>} Provider status
     */
    async getStatus(credentials) {
        try {
            const trailers = await this.fetchData(credentials);
            return {
                status: 'connected',
                trailerCount: trailers.length,
                lastSync: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'disconnected',
                error: error.message,
                trailerCount: 0
            };
        }
    }
}

module.exports = SpireonService; 