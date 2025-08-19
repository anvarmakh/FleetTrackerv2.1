const BaseGPSProvider = require('./base-provider');
const axios = require('axios');
const xml2js = require('xml2js');
const { extractCityStateFromString } = require('../../database/utils/database-utilities');

/**
 * SkyBitz GPS Provider Service
 * Handles integration with SkyBitz GPS tracking platform
 */
class SkyBitzService extends BaseGPSProvider {
    constructor() {
        super('SkyBitz');
    }

    /**
     * Validate SkyBitz credentials
     * @param {Object} credentials - SkyBitz credentials
     * @returns {boolean} True if valid
     */
    validateCredentials(credentials) {
        const { username, password } = credentials;
        return !!(username && password);
    }

    /**
     * Fetch GPS data from SkyBitz
     * @param {Object} credentials - SkyBitz credentials
     * @returns {Promise<Array>} Array of trailer data
     */
    async fetchData(credentials) {
        try {
            console.log(`📡 Fetching SkyBitz data for ${credentials.providerName || 'SkyBitz'}...`);
            
            if (!this.validateCredentials(credentials)) {
                throw new Error('Missing SkyBitz credentials: username and password required');
            }
            
            const { username, password } = credentials;
            const baseURL = credentials.baseURL || 'https://xml.skybitz.com:9443';

            const params = new URLSearchParams({
                customer: username,
                password: password,
                assetid: 'ALL',
                version: '2.67'
            });
            
            const url = `${baseURL}/QueryPositions?${params.toString()}`;
            
            const response = await axios.get(url, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'GPS-Fleet-Management/1.0'
                }
            });

            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                parseNumbers: false,
                parseBooleans: false
            });

            const result = await parser.parseStringPromise(response.data);
            
            if (result.skybitz && result.skybitz.e && result.skybitz.e !== '0') {
                throw new Error(`SkyBitz API Error Code: ${result.skybitz.e}`);
            }

            if (!result.skybitz || !result.skybitz.gls) {
                console.log(`✅ SkyBitz data fetch successful: 0 trailers found`);
                return [];
            }

            const glsData = Array.isArray(result.skybitz.gls) 
                ? result.skybitz.gls 
                : [result.skybitz.gls];
            
            const trailers = this.processTrailerData(glsData, credentials.providerName || 'SkyBitz');
            
            console.log(`✅ SkyBitz data fetch successful: ${trailers.length} trailers found`);
            return trailers;
            
        } catch (error) {
            console.error(`❌ SkyBitz data fetch failed for ${credentials.providerName || 'SkyBitz'}:`, error.message);
            throw error;
        }
    }

    /**
     * Process raw SkyBitz data into standardized format
     * @param {Array} glsData - Raw GLS data from SkyBitz
     * @param {string} providerName - Provider name
     * @returns {Array} Standardized trailer data
     */
    processTrailerData(glsData, providerName) {
        const trailers = [];
        
        for (const gls of glsData) {
            try {
                const asset = gls.asset || {};
                const speedKmh = gls.speed ? parseFloat(gls.speed) : 0;
                const speedMph = speedKmh * 0.621371;
                
                // Extract address from gls data - extract only "City, State" format
                let address = null;
                if (gls.address) {
                    if (typeof gls.address === 'string') {
                        // Try to extract city and state from string address
                        address = extractCityStateFromString(gls.address);
                    } else if (typeof gls.address === 'object') {
                        // Extract city and state from address object
                        const city = gls.address.city;
                        const state = gls.address.state;
                        if (city && state) {
                            address = `${city}, ${state}`;
                        } else {
                            address = 'Location unavailable';
                        }
                    }
                } else if (gls.location) {
                    if (typeof gls.location === 'string') {
                        address = extractCityStateFromString(gls.location);
                    } else if (typeof gls.location === 'object') {
                        // Try to extract city and state from location object
                        const city = gls.location.city;
                        const state = gls.location.state;
                        if (city && state) {
                            address = `${city}, ${state}`;
                        } else {
                            address = 'Location unavailable';
                        }
                    }
                }
                
                // Extract plate info from various possible fields
                const plate = asset.licenseplate || asset.plate || gls.licenseplate || gls.plate || null;
                
                                                  const trailer = this.createStandardTrailer({
                     id: `skybitz_${asset.assetid || gls.mtsn || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                     provider_id: 'SkyBitz',
                     originalId: asset.assetid || gls.mtsn || 'unknown',
                     deviceId: gls.mtsn || asset.assetid || 'unknown',
                     unit_number: asset.assetid || gls.mtsn || 'unknown',
                     make: asset.assettype || asset.make || null,
                     model: gls.devicetype || asset.model || null,
                     year: asset.year ? parseInt(asset.year) : null,
                     vin: asset.vin || null,
                     plate: plate,
                     status: speedMph > 5 ? 'dispatched' : 'available',
                     gps_status: 'connected',
                     latitude: gls.latitude ? parseFloat(gls.latitude) : null,
                     longitude: gls.longitude ? parseFloat(gls.longitude) : null,
                     speed: speedMph,
                     address: address,
                     lastUpdate: gls.time ? new Date(gls.time) : new Date(),
                     last_address: address,
                     manual_location_override: false,
                     company_id: null // Will be set by caller
                 });
                
                // Only include trailers with valid coordinates
                const hasValidLat = !isNaN(trailer.last_latitude) && trailer.last_latitude !== 0;
                const hasValidLng = !isNaN(trailer.last_longitude) && trailer.last_longitude !== 0;
                
                if (hasValidLat && hasValidLng) {
                    trailers.push(trailer);
                }
            } catch (error) {
                console.error(`❌ Error processing SkyBitz trailer ${gls.mtsn || gls.assetid}:`, error);
            }
        }
        
        return this.filterValidTrailers(trailers);
    }

    /**
     * Get SkyBitz provider status
     * @param {Object} credentials - SkyBitz credentials
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

module.exports = SkyBitzService; 