/**
 * Validation utilities for common validation tasks
 */

/**
 * Validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format (US)
 */
function isValidPhoneNumber(phone) {
    const phoneRegex = /^\+?1?[-.\s]?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})$/;
    return phoneRegex.test(phone);
}

/**
 * Validate VIN (Vehicle Identification Number)
 */
function isValidVIN(vin) {
    if (!vin || vin.length !== 17) return false;
    
    // VIN should only contain alphanumeric characters (excluding I, O, Q)
    const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
    return vinRegex.test(vin.toUpperCase());
}

/**
 * Validate DOT number format
 */
function isValidDOTNumber(dotNumber) {
    const dotRegex = /^DOT\d{6,7}$/i;
    return dotRegex.test(dotNumber);
}

/**
 * Validate latitude
 */
function isValidLatitude(lat) {
    const num = parseFloat(lat);
    return !isNaN(num) && num >= -90 && num <= 90;
}

/**
 * Validate longitude
 */
function isValidLongitude(lng) {
    const num = parseFloat(lng);
    return !isNaN(num) && num >= -180 && num <= 180;
}

/**
 * Validate coordinates (latitude, longitude)
 */
function isValidCoordinates(lat, lng) {
    return isValidLatitude(lat) && isValidLongitude(lng);
}

/**
 * Validate date format
 */
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
}

/**
 * Validate date is in the future
 */
function isFutureDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date > now;
}

/**
 * Validate date is in the past
 */
function isPastDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return date < now;
}

/**
 * Validate string length
 */
function isValidStringLength(str, minLength = 1, maxLength = 255) {
    if (typeof str !== 'string') return false;
    return str.length >= minLength && str.length <= maxLength;
}

/**
 * Validate numeric range
 */
function isValidNumericRange(value, min, max) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

/**
 * Validate positive number
 */
function isPositiveNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num > 0;
}

/**
 * Validate non-negative number
 */
function isNonNegativeNumber(value) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= 0;
}

/**
 * Validate URL format
 */
function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate GPS provider type
 */
function isValidGPSProviderType(type) {
    const validTypes = ['spireon', 'skybitz', 'samsara'];
    return validTypes.includes(type.toLowerCase());
}

/**
 * Validate location type
 */
function isValidLocationType(type) {
    const validTypes = ['warehouse', 'company yard', 'parking'];
    return validTypes.includes(type);
}

/**
 * Validate trailer status
 */
function isValidTrailerStatus(status) {
    const validStatuses = ['available', 'inUse', 'maintenance', 'outOfService'];
    return validStatuses.includes(status);
}

/**
 * Validate note category
 */
function isValidNoteCategory(category) {
    const validCategories = ['general', 'maintenance', 'damage', 'repair', 'inspection'];
    return validCategories.includes(category);
}

/**
 * Validate maintenance severity
 */
function isValidMaintenanceSeverity(severity) {
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    return validSeverities.includes(severity);
}

/**
 * Validate password
 */
function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8;
}

/**
 * Sanitize HTML content
 */
function sanitizeHTML(content) {
    if (typeof content !== 'string') return content;
    
    return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * DEPRECATED: Sanitize SQL injection
 * 
 * This function is deprecated because:
 * 1. All database queries use parameterized queries which prevent SQL injection
 * 2. This function can mangle valid input (e.g., legitimate "--" in notes)
 * 3. It provides a false sense of security and could mask non-parameterized queries
 * 
 * Use parameterized queries instead of this function.
 * 
 * @deprecated Use parameterized queries instead
 */
function sanitizeSQL(input) {
    console.warn('DEPRECATED: sanitizeSQL is deprecated. Use parameterized queries instead.');
    return input;
}

/**
 * Validate and sanitize input
 */
function validateAndSanitize(input, validators = []) {
    let sanitized = input;
    
    // Apply sanitization
    if (typeof sanitized === 'string') {
        sanitized = sanitized.trim();
        sanitized = sanitizeHTML(sanitized);
    }
    
    // Apply validators
    for (const validator of validators) {
        if (!validator(sanitized)) {
            throw new Error(`Validation failed for input: ${input}`);
        }
    }
    
    return sanitized;
}

/**
 * Create validation schema
 */
function createValidationSchema(schema) {
    return (data) => {
        const errors = [];
        
        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];
            
            for (const rule of rules) {
                if (!rule.validator(value)) {
                    errors.push({
                        field,
                        message: rule.message || `Invalid ${field}`
                    });
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    };
}

module.exports = {
    isValidEmail,
    isValidPhoneNumber,
    isValidVIN,
    isValidDOTNumber,
    isValidLatitude,
    isValidLongitude,
    isValidCoordinates,
    isValidDate,
    isFutureDate,
    isPastDate,
    isValidStringLength,
    isValidNumericRange,
    isPositiveNumber,
    isNonNegativeNumber,
    isValidURL,
    isValidGPSProviderType,
    isValidLocationType,
    isValidTrailerStatus,
    isValidNoteCategory,
    isValidMaintenanceSeverity,
    isValidPassword,
    sanitizeHTML,
    sanitizeSQL,
    validateAndSanitize,
    createValidationSchema
}; 
