const BaseGPSProvider = require('./base-provider');
const axios = require('axios');
const xml2js = require('xml2js');
const { extractCityStateFromString } = require('../../database/utils/database-utilities');
const logger = require('../../utils/logger');
const geocodingService = require('../geocoding');

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
            logger.info(`📡 Fetching SkyBitz data for ${credentials.providerName || 'SkyBitz'}...`);
            logger.info(`🔑 Credentials check:`, {
                hasUsername: !!credentials.username,
                hasPassword: !!credentials.password,
                baseURL: credentials.baseURL || 'https://xml.skybitz.com:9443'
            });
            
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
            logger.info(`🌐 Making request to: ${url.replace(password, '***')}`);
            
            const response = await axios.get(url, {
                timeout: 20000,
                headers: {
                    'User-Agent': 'GPS-Fleet-Management/1.0'
                }
            });

            logger.info(`📥 Response status: ${response.status}`);
            logger.info(`📥 Response data length: ${response.data?.length || 0} characters`);

            const parser = new xml2js.Parser({
                explicitArray: false,
                ignoreAttrs: true,
                parseNumbers: false,
                parseBooleans: false
            });

            const result = await parser.parseStringPromise(response.data);
            logger.info(`🔍 Parsed XML structure:`, Object.keys(result));
            
            if (result.skybitz && result.skybitz.e && result.skybitz.e !== '0') {
                throw new Error(`SkyBitz API Error Code: ${result.skybitz.e}`);
            }

            if (!result.skybitz || !result.skybitz.gls) {
                logger.info(`✅ SkyBitz data fetch successful: 0 trailers found`);
                return [];
            }

            const glsData = Array.isArray(result.skybitz.gls) 
                ? result.skybitz.gls 
                : [result.skybitz.gls];
            
            logger.info(`📊 Raw GLS data count: ${glsData.length}`);
            
            const trailers = await this.processTrailerData(glsData, credentials.providerName || 'SkyBitz');
            
            logger.info(`✅ SkyBitz data fetch successful: ${trailers.length} trailers found`);
            return trailers;
            
        } catch (error) {
            logger.error(`❌ SkyBitz data fetch failed for ${credentials.providerName || 'SkyBitz'}:`, error.message);
            logger.error(`🔍 Full error:`, error);
            throw error;
        }
    }

    /**
     * Process raw SkyBitz data into standardized format
     * @param {Array} glsData - Raw GLS data from SkyBitz
     * @param {string} providerName - Provider name
     * @returns {Array} Standardized trailer data
     */
    async processTrailerData(glsData, providerName) {
        logger.info(`🔧 Processing ${glsData.length} GLS records with parallel reverse geocoding...`);
        
                     // Process trailers in smaller batches to avoid rate limiting
             const batchSize = 3; // Reduced batch size to avoid rate limits
             const batches = [];
             
             for (let i = 0; i < glsData.length; i += batchSize) {
                 batches.push(glsData.slice(i, i + batchSize));
             }
             
             logger.info(`🔄 Processing ${batches.length} batches of ${batchSize} trailers each...`);
             
             const allTrailers = [];
             
             for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                 const batch = batches[batchIndex];
                 logger.info(`🔄 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} trailers)...`);
                 
                 // Process batch in parallel
                 const batchPromises = batch.map(async (gls) => {
                                 try {
                
                const asset = gls.asset || {};
                const speedKmh = gls.speed ? parseFloat(gls.speed) : 0;
                const speedMph = speedKmh * 0.621371;
                
                // Clean geocoding implementation
                let fullAddress = 'Location unavailable';
                
                // Validate and geocode coordinates
                if (gls.latitude && gls.longitude) {
                    const latNum = parseFloat(gls.latitude);
                    const lngNum = parseFloat(gls.longitude);
                    
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
                
                // Extract plate info from various possible fields
                const plate = asset.licenseplate || asset.plate || gls.licenseplate || gls.plate || null;
                
                // Clean unit number by removing "Trailer" text
                const rawUnitNumber = asset.assetid || gls.mtsn || 'unknown';
                const cleanedUnitNumber = this.cleanUnitNumber(rawUnitNumber);
                
                const trailer = this.createStandardTrailer({
                     id: `skybitz_${gls.mtsn || asset.assetid || 'unknown'}`, // Use consistent skybitz_{mtsn} format
                     provider_id: 'SkyBitz',
                     originalId: asset.assetid || gls.mtsn || 'unknown',
                     deviceId: gls.mtsn || asset.assetid || 'unknown',
                     unit_number: cleanedUnitNumber, // Use cleaned unit number
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
                     address: fullAddress, // Always use full address (formatted string)
                     lastUpdate: gls.time ? new Date(gls.time) : new Date(),
                     last_address: fullAddress, // Always use full address (formatted string)
                     manual_location_override: false,
                     company_id: null // Will be set by caller
                 });
                

                
                // Only include trailers with valid coordinates
                const hasValidLat = !isNaN(trailer.last_latitude) && trailer.last_latitude !== 0;
                const hasValidLng = !isNaN(trailer.last_longitude) && trailer.last_longitude !== 0;
                
                                 if (hasValidLat && hasValidLng) {
                     return trailer;
                 } else {
                     return null;
                 }
            } catch (error) {
                logger.error(`❌ Error processing SkyBitz trailer ${gls.mtsn || gls.assetid}:`, error);
                return null;
            }
        });
        
                         // Wait for all promises in the batch to complete
                 const batchResults = await Promise.all(batchPromises);
                 const validTrailers = batchResults.filter(trailer => trailer !== null);
                 allTrailers.push(...validTrailers);
                 
                 logger.info(`✅ Batch ${batchIndex + 1} completed: ${validTrailers.length} valid trailers`);
                 
                 // Add delay between batches to respect rate limits (1 second)
                 if (batchIndex < batches.length - 1) {
                     await new Promise(resolve => setTimeout(resolve, 1000));
                 }
             }
    
    logger.info(`✅ Processed ${allTrailers.length} valid trailers out of ${glsData.length} total records`);
    return this.filterValidTrailers(allTrailers);
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