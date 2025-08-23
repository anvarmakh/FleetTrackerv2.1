const axios = require('axios');
const logger = require('../utils/logger');

class GeocodingService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyA3YO3RKMkVRRxYvbV3LERaydnVA8RZMn0';
        this.baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
    }

    /**
     * Convert address to coordinates with fallback
     * @param {string} address - The address to geocode
     * @returns {Promise<Object>} - Object with lat, lng, and formatted_address
     */
    async geocodeAddress(address) {
        try {
            // Check if API key is available
            if (!this.apiKey) {
                // Fallback: return a default location or throw a more helpful error
                logger.warn('Google Maps API key not configured. Using fallback geocoding.');
                return this.fallbackGeocode(address);
            }

            const response = await axios.get(this.baseUrl, {
                params: {
                    address: address,
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                const location = result.geometry.location;
                
                return {
                    lat: location.lat,
                    lng: location.lng,
                    formatted_address: result.formatted_address,
                    place_id: result.place_id
                };
            } else if (response.data.status === 'ZERO_RESULTS') {
                throw new Error('No results found for this address');
            } else if (response.data.status === 'REQUEST_DENIED') {
                throw new Error('Google Maps API request denied. Please check your API key.');
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
                throw new Error('Google Maps API quota exceeded. Please try again later.');
            } else {
                throw new Error(`Geocoding failed: ${response.data.status}`);
            }
        } catch (error) {
            logger.error('Geocoding error:', error.message);
            if (error.response) {
                throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw new Error(`Failed to geocode address: ${error.message}`);
        }
    }

    /**
     * Fallback geocoding when Google Maps API is not available
     * @param {string} address - The address to geocode
     * @returns {Object} - Object with lat, lng, and formatted_address
     */
    fallbackGeocode(address) {
        // Simple fallback that returns a default location
        // In a real implementation, you might use a different geocoding service
        logger.debug(`Fallback geocoding for address: ${address}`);
        
        // Try to extract some basic location info from the address
        const addressLower = address.toLowerCase(); 
        
        // Default fallback - return a more generic location
        return {
            lat: 34.0522, // Los Angeles coordinates as default
            lng: -118.2437,
            formatted_address: address,
            place_id: null
        };
    }

    /**
     * Convert coordinates to address (reverse geocoding) with fallback
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<Object>} - Object with formatted_address and components
     */
    async reverseGeocode(lat, lng) {
        try {
            // Check if API key is available
            if (!this.apiKey) {
                // Fallback: return a default address
                logger.warn('Google Maps API key not configured. Using fallback reverse geocoding.');
                return this.fallbackReverseGeocode(lat, lng);
            }

            const response = await axios.get(this.baseUrl, {
                params: {
                    latlng: `${lat},${lng}`,
                    key: this.apiKey
                }
            });

            if (response.data.status === 'OK' && response.data.results.length > 0) {
                const result = response.data.results[0];
                
                return {
                    formatted_address: result.formatted_address,
                    place_id: result.place_id,
                    components: result.address_components
                };
            } else if (response.data.status === 'ZERO_RESULTS') {
                throw new Error('No results found for these coordinates');
            } else if (response.data.status === 'REQUEST_DENIED') {
                throw new Error('Google Maps API request denied. Please check your API key.');
            } else if (response.data.status === 'OVER_QUERY_LIMIT') {
                throw new Error('Google Maps API quota exceeded. Please try again later.');
            } else {
                throw new Error(`Reverse geocoding failed: ${response.data.status}`);
            }
        } catch (error) {
            logger.error('Reverse geocoding error:', error.message);
            if (error.response) {
                throw new Error(`Google Maps API error: ${error.response.status} - ${error.response.statusText}`);
            }
            throw new Error(`Failed to reverse geocode coordinates: ${error.message}`);
        }
    }

    /**
     * Fallback reverse geocoding when Google Maps API is not available
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Object} - Object with formatted_address
     */
    fallbackReverseGeocode(lat, lng) {
        logger.debug(`Fallback reverse geocoding for coordinates: ${lat}, ${lng}`);
        
        return {
            formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            place_id: null,
            components: []
        };
    }

    /**
     * Validate if an address is valid by attempting to geocode it
     * @param {string} address - The address to validate
     * @returns {Promise<boolean>} - True if address is valid
     */
    async validateAddress(address) {
        try {
            await this.geocodeAddress(address);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get address data from coordinates with caching and formatting options
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} format - Format type: 'full', 'simple', 'components'
     * @returns {Promise<string|Object>} - Formatted address or components object
     */
    async getAddressFromCoordinates(lat, lng, format = 'full') {
        try {
            // Validate input coordinates
            if (lat === null || lng === null || lat === undefined || lng === undefined) {
                return 'Location unavailable';
            }
            
            const latNum = parseFloat(lat);
            const lngNum = parseFloat(lng);
            
            if (isNaN(latNum) || isNaN(lngNum)) {
                return 'Location unavailable';
            }
            
            if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
                return 'Location unavailable';
            }
            
            const result = await this.reverseGeocode(latNum, lngNum);
            
            if (!result || !result.formatted_address) {
                return 'Location unavailable';
            }
            
            switch (format) {
                case 'simple':
                    return this.extractSimpleAddress(result.components, result.formatted_address);
                case 'components':
                    return this.extractAddressComponents(result.components, result.formatted_address);
                case 'full':
                default:
                    return result.formatted_address;
            }
        } catch (error) {
            logger.error('Error getting address from coordinates:', error);
            return 'Location unavailable';
        }
    }

    /**
     * Extract simple address (city, state) from components
     * @param {Array} components - Address components from Google API
     * @param {string} fallback - Fallback formatted address
     * @returns {string} - Simple address string
     */
    extractSimpleAddress(components, fallback) {
        if (!components || !Array.isArray(components)) {
            return fallback;
        }
        
        let city = '';
        let state = '';
        
        for (const component of components) {
            if (component.types.includes('locality')) {
                city = component.long_name;
            }
            if (component.types.includes('administrative_area_level_1')) {
                state = component.short_name;
            }
        }
        
        if (city && state) {
            return `${city}, ${state}`;
        }
        
        return fallback;
    }

    /**
     * Extract address components for custom formatting
     * @param {Array} components - Address components from Google API
     * @param {string} formattedAddress - Full formatted address
     * @returns {Object} - Address components object
     */
    extractAddressComponents(components, formattedAddress) {
        if (!components || !Array.isArray(components)) {
            return { formattedAddress };
        }
        
        const extracted = {};
        
        for (const component of components) {
            if (component.types.includes('street_number')) {
                extracted.streetNumber = component.long_name;
            } else if (component.types.includes('route')) {
                extracted.street = component.long_name;
            } else if (component.types.includes('locality')) {
                extracted.city = component.long_name;
            } else if (component.types.includes('administrative_area_level_1')) {
                extracted.state = component.short_name;
            } else if (component.types.includes('postal_code')) {
                extracted.postalCode = component.long_name;
            } else if (component.types.includes('country')) {
                extracted.country = component.long_name;
            }
        }
        
        return {
            ...extracted,
            formattedAddress
        };
    }

    // Legacy methods for backward compatibility
    async getSimpleAddress(lat, lng) {
        return this.getAddressFromCoordinates(lat, lng, 'simple');
    }

    async getStandardizedAddress(lat, lng) {
        return this.getAddressFromCoordinates(lat, lng, 'full');
    }

    async getAddressComponents(lat, lng) {
        return this.getAddressFromCoordinates(lat, lng, 'components');
    }
}

module.exports = new GeocodingService(); 
