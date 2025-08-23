const axios = require('axios');
const BaseGPSProvider = require('./base-provider');
const logger = require('../../utils/logger');
const geocodingService = require('../geocoding');

/**
 * Samsara GPS Provider Service
 * Handles integration with Samsara GPS tracking platform
 */
class SamsaraService extends BaseGPSProvider {
    constructor() {
        super('Samsara');
    }

    /**
     * Validate Samsara credentials
     * @param {Object} credentials - Samsara credentials
     * @returns {boolean} True if valid
     */
    validateCredentials(credentials) {
        const { apiToken, apiUrl } = credentials;
        return !!(apiToken && apiUrl);
    }

    /**
     * Fetch GPS data from Samsara
     * @param {Object} credentials - Samsara credentials
     * @returns {Promise<Array>} Array of trailer data
     */
    async fetchData(credentials) {
        try {
            logger.info(`📡 Fetching Samsara data for ${credentials.providerName || 'Samsara'}...`);
            logger.debug(`🔑 Credentials check:`, {
                hasApiToken: !!credentials.apiToken,
                hasApiUrl: !!credentials.apiUrl,
                apiUrl: credentials.apiUrl || 'https://api.samsara.com'
            });
            
            if (!this.validateCredentials(credentials)) {
                throw new Error('Missing Samsara credentials: apiToken and apiUrl required');
            }
            
            const { apiToken, apiUrl } = credentials;
            const baseURL = apiUrl || 'https://api.samsara.com';
            
            logger.info(`🌐 Making request to: ${baseURL}/fleet/vehicles`);
            logger.debug(`🔑 Using API token: ${apiToken.substring(0, 8)}...`);
            
            const response = await axios.get(`${baseURL}/fleet/vehicles`, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            logger.info(`📥 Response status: ${response.status}`);
            logger.info(`📥 Vehicles found: ${response.data?.data?.length || 0}`);

            const vehicles = response.data.data || [];
            const processedTrailers = await this.processTrailerData(vehicles, credentials.providerName || 'Samsara');
            return processedTrailers;
            
        } catch (error) {
            logger.error(`❌ Samsara data fetch failed for ${credentials.providerName || 'Samsara'}:`, error.message);
            throw error;
        }
    }

    /**
     * Process raw Samsara data into standardized format
     * @param {Array} vehicles - Raw vehicle data from Samsara
     * @param {string} providerName - Provider name
     * @returns {Array} Standardized trailer data
     */
    async processTrailerData(vehicles, providerName) {
        const trailers = [];

        for (const vehicle of vehicles) {
            try {
                // Only process trailers (you might need to adjust this logic based on Samsara's data structure)
                if (vehicle.vehicleType === 'trailer' || vehicle.name?.toLowerCase().includes('trailer')) {
                    
                    // Geocode coordinates for address
                    let address = 'Location unavailable';
                    let lastAddress = 'Location unavailable';
                    
                    if (vehicle.location?.latitude && vehicle.location?.longitude) {
                        const latNum = parseFloat(vehicle.location.latitude);
                        const lngNum = parseFloat(vehicle.location.longitude);
                        
                        if (!isNaN(latNum) && !isNaN(lngNum) && 
                            latNum >= -90 && latNum <= 90 && 
                            lngNum >= -180 && lngNum <= 180) {
                            
                            try {
                                const reverseAddress = await geocodingService.getStandardizedAddress(latNum, lngNum);
                                address = reverseAddress && reverseAddress !== 'Location unavailable' 
                                    ? reverseAddress 
                                    : `${latNum}, ${lngNum}`;
                                lastAddress = address;
                            } catch (error) {
                                address = `${latNum}, ${lngNum}`;
                                lastAddress = address;
                            }
                        }
                    }
                    
                    // Clean unit number by removing "Trailer" text
                    const rawUnitNumber = vehicle.id || vehicle.name;
                    const cleanedUnitNumber = this.cleanUnitNumber(rawUnitNumber);
                    
                    const trailer = this.createStandardTrailer({
                         id: `samsara_${vehicle.id || vehicle.name || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                         provider_id: 'Samsara',
                         originalId: vehicle.id || vehicle.name,
                         deviceId: vehicle.id || vehicle.name,
                         unit_number: cleanedUnitNumber, // Use cleaned unit number
                         make: vehicle.make || null,
                         model: vehicle.model || null,
                         year: vehicle.year ? parseInt(vehicle.year) : null,
                         vin: vehicle.vin || null,
                         plate: vehicle.licensePlate || vehicle.plate || null,
                         status: 'available',
                         gps_status: 'connected',
                         latitude: vehicle.location?.latitude ? parseFloat(vehicle.location.latitude) : null,
                         longitude: vehicle.location?.longitude ? parseFloat(vehicle.location.longitude) : null,
                         address: address,
                         lastUpdate: vehicle.lastLocation?.timestamp ? new Date(vehicle.lastLocation.timestamp) : new Date(),
                         last_address: lastAddress,
                         manual_location_override: false,
                         company_id: null // Will be set by caller
                     });
                    
                    trailers.push(trailer);
                }
            } catch (error) {
                logger.error(`❌ Error processing Samsara vehicle ${vehicle.id}:`, error);
            }
        }
        
        return this.filterValidTrailers(trailers);
    }

    /**
     * Get Samsara provider status
     * @param {Object} credentials - Samsara credentials
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

module.exports = SamsaraService; 