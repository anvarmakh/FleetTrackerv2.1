const BaseGPSProvider = require('./base-provider');
const axios = require('axios');
const { extractCityStateFromString } = require('../../database/utils/database-utilities');

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
            console.log(`📡 Fetching Samsara data for ${credentials.providerName || 'Samsara'}...`);
            
            if (!this.validateCredentials(credentials)) {
                throw new Error('Missing Samsara credentials: API token and API URL required');
            }
            
            const { apiToken, apiUrl } = credentials;

            // Test the connection by fetching vehicles/assets
            const response = await axios.get(`${apiUrl}/v1/fleet/vehicles`, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

            const vehicles = response.data.data || [];
            const trailers = this.processTrailerData(vehicles, credentials.providerName || 'Samsara');
            
            console.log(`✅ Samsara data fetch successful: ${trailers.length} trailers found`);
            return trailers;
            
        } catch (error) {
            console.error(`❌ Samsara data fetch failed for ${credentials.providerName || 'Samsara'}:`, error.message);
            throw error;
        }
    }

    /**
     * Process raw Samsara data into standardized format
     * @param {Array} vehicles - Raw vehicle data from Samsara
     * @param {string} providerName - Provider name
     * @returns {Array} Standardized trailer data
     */
    processTrailerData(vehicles, providerName) {
        const trailers = [];

        for (const vehicle of vehicles) {
            try {
                // Only process trailers (you might need to adjust this logic based on Samsara's data structure)
                if (vehicle.vehicleType === 'trailer' || vehicle.name?.toLowerCase().includes('trailer')) {
                                                              const trailer = this.createStandardTrailer({
                         id: `samsara_${vehicle.id || vehicle.name || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                         provider_id: 'Samsara',
                         originalId: vehicle.id || vehicle.name,
                         deviceId: vehicle.id || vehicle.name,
                         unit_number: vehicle.id || vehicle.name,
                         make: vehicle.make || null,
                         model: vehicle.model || null,
                         year: vehicle.year ? parseInt(vehicle.year) : null,
                         vin: vehicle.vin || null,
                         plate: vehicle.licensePlate || vehicle.plate || null,
                         status: 'available',
                         gps_status: 'connected',
                         latitude: vehicle.location?.latitude ? parseFloat(vehicle.location.latitude) : null,
                         longitude: vehicle.location?.longitude ? parseFloat(vehicle.location.longitude) : null,
                         address: vehicle.location?.address ? extractCityStateFromString(vehicle.location.address) : 'Location unavailable',
                         lastUpdate: vehicle.lastLocation?.timestamp ? new Date(vehicle.lastLocation.timestamp) : new Date(),
                         last_address: vehicle.lastLocation?.address ? extractCityStateFromString(vehicle.lastLocation.address) : 'Location unavailable',
                         manual_location_override: false,
                         company_id: null // Will be set by caller
                     });
                    
                    trailers.push(trailer);
                }
            } catch (error) {
                console.error(`❌ Error processing Samsara vehicle ${vehicle.id}:`, error);
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