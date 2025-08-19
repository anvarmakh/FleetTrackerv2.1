/**
 * Base GPS Provider Service
 * Abstract base class for all GPS provider integrations
 */
class BaseGPSProvider {
    constructor(providerName) {
        this.providerName = providerName;
    }

    /**
     * Fetch GPS data from the provider
     * @param {Object} credentials - Provider-specific credentials
     * @returns {Promise<Array>} Array of trailer data
     */
    async fetchData(credentials) {
        throw new Error('fetchData method must be implemented by subclass');
    }

    /**
     * Process raw GPS data into standardized format
     * @param {Array} rawData - Raw data from provider
     * @returns {Array} Standardized trailer data
     */
    processTrailerData(rawData) {
        throw new Error('processTrailerData method must be implemented by subclass');
    }

    /**
     * Validate provider credentials
     * @param {Object} credentials - Provider credentials
     * @returns {boolean} True if valid
     */
    validateCredentials(credentials) {
        throw new Error('validateCredentials method must be implemented by subclass');
    }

    /**
     * Get provider status
     * @param {Object} credentials - Provider credentials
     * @returns {Promise<Object>} Provider status information
     */
    async getStatus(credentials) {
        throw new Error('getStatus method must be implemented by subclass');
    }

    /**
     * Clean unit number by removing "TRAILER" prefix
     * @param {string} unitNumber - Raw unit number
     * @returns {string} Cleaned unit number
     */
    cleanUnitNumber(unitNumber) {
        if (!unitNumber) return unitNumber;
        
        // Remove "TRAILER" prefix (case insensitive)
        const cleaned = unitNumber.replace(/^trailer\s+/i, '').trim();
        return cleaned || unitNumber; // Return original if cleaning results in empty string
    }

    /**
     * Standard trailer data format
     * @param {Object} data - Raw trailer data
     * @returns {Object} Standardized trailer object
     */
    createStandardTrailer(data) {
        const rawUnitNumber = data.originalId || data.deviceId || data.id;
        const cleanUnitNumber = this.cleanUnitNumber(rawUnitNumber);
        
        return {
            id: data.id,
            unit_number: cleanUnitNumber,
            provider_id: this.providerName,
            last_latitude: parseFloat(data.latitude) || 0,
            last_longitude: parseFloat(data.longitude) || 0,
            status: data.status || 'available',
            updated_at: data.lastUpdate || new Date(),
            make: data.make || null,
            model: data.model || null,
            year: data.year || null,
            vin: data.vin || null,
            plate: data.plate || null
        };
    }

    /**
     * Filter trailers with valid GPS coordinates
     * @param {Array} trailers - Array of trailer data
     * @returns {Array} Filtered trailers with valid coordinates
     */
    filterValidTrailers(trailers) {
        return trailers.filter(trailer => 
            !isNaN(trailer.last_latitude) && !isNaN(trailer.last_longitude) &&
            trailer.last_latitude !== 0 && trailer.last_longitude !== 0
        );
    }

    /**
     * Map status from provider format to standard format
     * @param {string} providerStatus - Provider-specific status
     * @returns {string} Standard status
     */
    mapStatus(providerStatus) {
        const statusMap = {
            'Moving': 'dispatched',
            'Driving': 'dispatched',
            'Active': 'dispatched',
            'In Transit': 'dispatched',
            'Stopped': 'available',
            'Idle': 'available',
            'Parked': 'available',
            'Offline': 'disconnected'
        };
        
        return statusMap[providerStatus] || 'available';
    }
}

module.exports = BaseGPSProvider; 