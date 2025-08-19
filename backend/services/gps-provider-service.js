const SpireonService = require('./gps-providers/spireon-service');
const SkyBitzService = require('./gps-providers/skybitz-service');
const SamsaraService = require('./gps-providers/samsara-service');

/**
 * GPS Provider Service Factory
 * Routes GPS data fetching to the appropriate provider service
 */
class GPSProviderService {
    constructor() {
        this.providers = {
            'spireon': new SpireonService(),
            'skybitz': new SkyBitzService(),
            'samsara': new SamsaraService()
        };
    }

    /**
     * Get GPS provider service by type
     * @param {string} providerType - Provider type (spireon, skybitz, samsara)
     * @returns {BaseGPSProvider} Provider service instance
     */
    getProvider(providerType) {
        const provider = this.providers[providerType.toLowerCase()];
        if (!provider) {
            throw new Error(`Unsupported GPS provider type: ${providerType}`);
        }
        return provider;
    }

    /**
     * Fetch GPS data from provider
     * @param {Object} provider - Provider configuration from database
     * @param {string} providerCompanyId - Company ID for the provider
     * @returns {Promise<Array>} Array of trailer data
     */
    async fetchGPSDataFromProvider(provider, providerCompanyId) {
        try {
            console.log(`🔍 Fetching GPS data for provider: ${provider.name}`);
            console.log(`🔍 Provider credentials_encrypted:`, provider.credentials_encrypted ? 'EXISTS' : 'NULL');
            
            // Import centralized encryption utility
            const EncryptionUtil = require('../utils/encryption');
            const decryptedString = EncryptionUtil.decrypt(provider.credentials_encrypted);
            let credentials;
            try {
                credentials = JSON.parse(decryptedString);
            } catch (parseError) {
                console.error('Failed to parse decrypted credentials:', parseError);
                throw new Error('Invalid credentials format');
            }
            console.log(`🔍 Decrypted credentials:`, credentials);
            
            if (!credentials) {
                console.error(`❌ Failed to decrypt credentials for provider: ${provider.name}`);
                return [];
            }
            
            // Add provider name to credentials for logging
            credentials.providerName = provider.name;
            
            const providerService = this.getProvider(provider.type);
            const trailers = await providerService.fetchData(credentials);
            
            // Add company_id, provider_id, and tenant_id to all trailers
            const trailersWithCompany = trailers.map(trailer => ({
                ...trailer,
                company_id: providerCompanyId,
                provider_id: provider.id,
                tenant_id: provider.tenant_id || provider.tenantId
            }));
            
            return trailersWithCompany;
            
        } catch (error) {
            console.error(`❌ Error fetching GPS data from ${provider.name}:`, error);
            return [];
        }
    }

    /**
     * Fetch location data only from provider (for refresh operations)
     * @param {Object} provider - Provider configuration from database
     * @param {string} providerCompanyId - Company ID for the provider
     * @returns {Promise<Array>} Array of location data only
     */
    async fetchLocationDataFromProvider(provider, providerCompanyId) {
        try {
            console.log(`📍 Fetching location data for provider: ${provider.name}`);
            
            // Import centralized encryption utility
            const EncryptionUtil = require('../utils/encryption');
            const decryptedString = EncryptionUtil.decrypt(provider.credentials_encrypted);
            let credentials;
            try {
                credentials = JSON.parse(decryptedString);
            } catch (parseError) {
                console.error('Failed to parse decrypted credentials:', parseError);
                throw new Error('Invalid credentials format');
            }
            
            if (!credentials) {
                console.error(`❌ Failed to decrypt credentials for provider: ${provider.name}`);
                return [];
            }
            
            // Add provider name to credentials for logging
            credentials.providerName = provider.name;
            
            const providerService = this.getProvider(provider.type);
            const trailers = await providerService.fetchData(credentials);
            
            // Extract only location data
            const locationData = trailers.map(trailer => ({
                id: trailer.id,
                originalId: trailer.originalId || trailer.deviceId,
                vin: trailer.vin,
                latitude: trailer.last_latitude,
                longitude: trailer.last_longitude,
                address: trailer.address,
                lastGpsUpdate: trailer.lastGpsUpdate,
                company_id: providerCompanyId
            }));
            
            return locationData;
            
        } catch (error) {
            console.error(`❌ Error fetching location data from ${provider.name}:`, error);
            return [];
        }
    }

    /**
     * Test provider connection
     * @param {string} providerType - Provider type
     * @param {Object} credentials - Provider credentials
     * @returns {Promise<Object>} Connection test result
     */
    async testConnection(providerType, credentials) {
        try {
            const providerService = this.getProvider(providerType);
            
            // Validate credentials first
            if (!providerService.validateCredentials(credentials)) {
                return {
                    success: false,
                    error: 'Invalid credentials'
                };
            }
            
            // Test the connection by fetching data
            const trailers = await providerService.fetchData(credentials);
            
            return {
                success: true,
                trailerCount: trailers.length,
                message: `Successfully connected to ${providerType}. Found ${trailers.length} trailers.`
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get provider status
     * @param {string} providerType - Provider type
     * @param {Object} credentials - Provider credentials
     * @returns {Promise<Object>} Provider status
     */
    async getProviderStatus(providerType, credentials) {
        try {
            const providerService = this.getProvider(providerType);
            return await providerService.getStatus(credentials);
        } catch (error) {
            return {
                status: 'disconnected',
                error: error.message,
                trailerCount: 0
            };
        }
    }

    /**
     * Get list of supported provider types
     * @returns {Array} Array of supported provider types
     */
    getSupportedProviders() {
        return Object.keys(this.providers);
    }
}

module.exports = new GPSProviderService(); 
