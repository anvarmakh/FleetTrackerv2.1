const BaseGPSProvider = require('./base-provider');
const axios = require('axios');

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

            
            if (!this.validateCredentials(credentials)) {
                throw new Error('Invalid Spireon credentials: apiKey, username, password, and nspireId are required');
            }
            
            const { apiKey, username, password, nspireId } = credentials;
            const baseURL = credentials.baseURL || 'https://services.spireon.com/v0/rest';
            
            const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
            
            const response = await axios.get(`${baseURL}/assets`, {
                headers: {
                    'Authorization': `Basic ${basicAuth}`,
                    'X-Nspire-AppToken': apiKey,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                timeout: 30000
            });

            const assets = response.data.content || response.data || [];
            const processedTrailers = this.processTrailerData(assets, credentials.providerName || 'Spireon');
            return processedTrailers;
            
        } catch (error) {
            console.error(`❌ Error fetching Spireon data:`, error.message);
            if (error.response) {
                console.error(`❌ Response status: ${error.response.status}`);
                console.error(`❌ Response data:`, error.response.data);
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
    processTrailerData(assets, providerName) {
        const processedTrailers = assets.map(asset => {
            const mappedStatus = this.mapStatus(asset.status);
            
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
                make: asset.make,
                model: asset.model,
                year: asset.year,
                vin: asset.vin,
                plate: asset.plate || asset.licensePlate || asset.registration || null,
                odometer: asset.odometer,
                address: asset.lastLocation?.address ? 
                    `${asset.lastLocation.address.city}, ${asset.lastLocation.address.stateOrProvince}` : 
                    'Unknown'
            });
        });
        
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