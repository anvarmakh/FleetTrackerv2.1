const axios = require('axios');

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
                console.warn('Google Maps API key not configured. Using fallback geocoding.');
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
            console.error('Geocoding error:', error.message);
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
        console.log(`Fallback geocoding for address: ${address}`);
        
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
                console.warn('Google Maps API key not configured. Using fallback reverse geocoding.');
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
            console.error('Reverse geocoding error:', error.message);
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
        console.log(`Fallback reverse geocoding for coordinates: ${lat}, ${lng}`);
        
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
     * Get a simplified address from coordinates
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @returns {Promise<string>} - Simplified address string
     */
    async getSimpleAddress(lat, lng) {
        try {
            const result = await this.reverseGeocode(lat, lng);
            
            // Extract city and state from address components
            let city = '';
            let state = '';
            
            for (const component of result.components) {
                if (component.types.includes('locality')) {
                    city = component.long_name;
                }
                if (component.types.includes('administrative_area_level_1')) {
                    state = component.short_name;
                }
            }
            
            if (city && state) {
                return `${city}, ${state}`;
            } else {
                return result.formatted_address;
            }
        } catch (error) {
            console.error('Error getting simple address:', error);
            return 'Unknown location';
        }
    }
}

module.exports = new GeocodingService(); 
