/**
 * Database Utilities
 * Common utility functions for database operations
 * Extracted from database-manager.js
 */

/**
 * Extract city and state from address string
 * Handles various address formats and returns standardized city, state format
 */
function extractCityStateFromString(addressStr) {
    if (!addressStr) return 'Location unavailable';
    
    // Remove extra whitespace and normalize
    const cleanAddress = addressStr.trim();
    
    // Pattern 1: "Street, City, State ZIP" or "Street, City, State, Country"
    if (cleanAddress.includes(',')) {
        const parts = cleanAddress.split(',').map(part => part.trim());
        
        // Handle "315 Resource Dr, Bloomington, CA, US" format
        if (parts.length >= 4) {
            // Look for city (usually second to last part) and state (third to last part)
            const city = parts[parts.length - 3];
            const state = parts[parts.length - 2];
            
            // Validate state is likely a state abbreviation
            if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
                return `${city}, ${state}`;
            }
        } else if (parts.length === 3) {
            // "Street, City, State ZIP" format
            const city = parts[1];
            const statePart = parts[2];
            
            // Extract state from "State ZIP" format
            const state = statePart.split(' ')[0];
            if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
                return `${city}, ${state}`;
            }
        } else if (parts.length === 3) {
            // Check if it's "City, State, Country" or "Street, City, State ZIP"
            const lastPart = parts[2];
            
            if (lastPart === 'US') {
                // "City, State, Country" format (e.g., "San Leandro, CA, US")
                const city = parts[0];
                const state = parts[1];
                if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
                    return `${city}, ${state}`;
                }
            } else {
                // "Street, City, State ZIP" format
                const city = parts[1];
                const statePart = parts[2];
                const state = statePart.split(' ')[0];
                if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
                    return `${city}, ${state}`;
                }
            }
        } else if (parts.length === 2) {
            // "City, State" format
            const city = parts[0];
            const state = parts[1];
            if (state && state.length <= 3 && state !== 'US' && /^[A-Z]{2}$/.test(state)) {
                return `${city}, ${state}`;
            }
        }
    }
    // Pattern 2: "City State" (no comma)
    if (cleanAddress.includes(' ')) {
        const parts = cleanAddress.split(' ');
        if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (lastPart.length <= 3 && lastPart !== 'US' && /^[A-Z]{2}$/.test(lastPart)) { // Likely a state abbreviation
                const city = parts.slice(0, -1).join(' ');
                return `${city}, ${lastPart}`;
            }
        }
    }
    
    return 'Location unavailable';
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Format address components into a standardized string
 * @param {Object} address - Address object with components
 * @returns {string} Formatted address string
 */
function formatAddress(address) {
    if (!address) return '';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.zip) parts.push(address.zip);
    
    return parts.join(', ');
}

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean} True if coordinates are valid
 */
function isValidCoordinates(latitude, longitude) {
    return !isNaN(latitude) && !isNaN(longitude) &&
           latitude >= -90 && latitude <= 90 &&
           longitude >= -180 && longitude <= 180;
}

/**
 * Generate a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} Random string
 */
function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * DEPRECATED: Sanitize SQL input to prevent injection
 * 
 * This function is deprecated because:
 * 1. All database queries use parameterized queries which prevent SQL injection
 * 2. This function can mangle valid input (e.g., legitimate quotes in text)
 * 3. It provides a false sense of security and could mask non-parameterized queries
 * 
 * Use parameterized queries instead of this function.
 * 
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 * @deprecated Use parameterized queries instead
 */
function sanitizeSQLInput(input) {
    console.warn('DEPRECATED: sanitizeSQLInput is deprecated. Use parameterized queries instead.');
    if (typeof input !== 'string') return input;
    
    // Remove potentially dangerous characters
    return input.replace(/['";\\]/g, '');
}

/**
 * Convert boolean to integer for database storage
 * @param {boolean} value - Boolean value
 * @returns {number} 1 for true, 0 for false
 */
function booleanToInt(value) {
    return value ? 1 : 0;
}

/**
 * Convert integer to boolean from database
 * @param {number} value - Integer value from database
 * @returns {boolean} True for 1, false for 0
 */
function intToBoolean(value) {
    return value === 1;
}

/**
 * Parse JSON safely
 * @param {string} jsonString - JSON string to parse
 * @param {*} defaultValue - Default value if parsing fails
 * @returns {*} Parsed JSON or default value
 */
function safeJSONParse(jsonString, defaultValue = null) {
    try {
        return JSON.parse(jsonString);
    } catch (error) {
        console.warn('Failed to parse JSON:', error.message);
        return defaultValue;
    }
}

/**
 * Stringify JSON safely
 * @param {*} data - Data to stringify
 * @param {string} defaultValue - Default value if stringifying fails
 * @returns {string} JSON string or default value
 */
function safeJSONStringify(data, defaultValue = '{}') {
    try {
        return JSON.stringify(data);
    } catch (error) {
        console.warn('Failed to stringify JSON:', error.message);
        return defaultValue;
    }
}

/**
 * Convert camelCase string to snake_case
 * @param {string} str - camelCase string
 * @returns {string} snake_case string
 */
function camelToSnakeCase(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

/**
 * Convert snake_case string to camelCase
 * @param {string} str - snake_case string
 * @returns {string} camelCase string
 */
function snakeToCamelCase(str) {
    if (typeof str !== 'string') return str;
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from camelCase to snake_case
 * @param {Object} obj - Object with camelCase keys
 * @returns {Object} Object with snake_case keys
 */
function objectKeysToSnakeCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
        const snakeKey = camelToSnakeCase(key);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            converted[snakeKey] = objectKeysToSnakeCase(value);
        } else {
            converted[snakeKey] = value;
        }
    }
    return converted;
}

/**
 * Convert object keys from snake_case to camelCase
 * @param {Object} obj - Object with snake_case keys
 * @returns {Object} Object with camelCase keys
 */
function objectKeysToCamelCase(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
    
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
        const camelKey = snakeToCamelCase(key);
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            converted[camelKey] = objectKeysToCamelCase(value);
        } else {
            converted[camelKey] = value;
        }
    }
    return converted;
}

/**
 * Convert array of objects from camelCase to snake_case keys
 * @param {Array} arr - Array of objects with camelCase keys
 * @returns {Array} Array of objects with snake_case keys
 */
function arrayKeysToSnakeCase(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(objectKeysToSnakeCase);
}

/**
 * Convert array of objects from snake_case to camelCase keys
 * @param {Array} arr - Array of objects with snake_case keys
 * @returns {Array} Array of objects with camelCase keys
 */
function arrayKeysToCamelCase(arr) {
    if (!Array.isArray(arr)) return arr;
    return arr.map(objectKeysToCamelCase);
}

/**
 * Smart conversion for trailer data from frontend to database format
 * @param {Object} trailerData - Trailer data with mixed naming conventions
 * @returns {Object} Trailer data with snake_case keys for database
 */
function convertTrailerDataForDB(trailerData) {
    if (!trailerData || typeof trailerData !== 'object') return trailerData;
    
    // Manual mapping for specific fields that need special handling
    const fieldMapping = {
        unitNumber: 'unit_number',
        gpsEnabled: 'gps_enabled', 
        gpsStatus: 'gps_status',
        manualLocationOverride: 'manual_location_override',
        manualLocationNotes: 'manual_location_notes',
        lastGpsUpdate: 'last_gps_update',
        lastSync: 'last_sync',
        companyId: 'company_id',
        tenantId: 'tenant_id',
        externalId: 'external_id',
        providerId: 'provider_id',
        address: 'last_address',
        latitude: 'last_latitude',
        longitude: 'last_longitude'
    };
    
    const dbData = {};
    
    for (const [key, value] of Object.entries(trailerData)) {
        // Use manual mapping if available, otherwise convert to snake_case
        const dbKey = fieldMapping[key] || camelToSnakeCase(key);
        
        // Handle boolean conversion for specific fields
        if (key === 'manualLocationOverride') {
            dbData[dbKey] = booleanToInt(value);
        } else {
            dbData[dbKey] = value;
        }
    }
    
    return dbData;
}

module.exports = {
    extractCityStateFromString,
    calculateDistance,
    formatAddress,
    isValidCoordinates,
    generateRandomString,
    sanitizeSQLInput,
    booleanToInt,
    intToBoolean,
    safeJSONParse,
    safeJSONStringify,
    camelToSnakeCase,
    snakeToCamelCase,
    objectKeysToSnakeCase,
    objectKeysToCamelCase,
    arrayKeysToSnakeCase,
    arrayKeysToCamelCase,
    convertTrailerDataForDB
};
