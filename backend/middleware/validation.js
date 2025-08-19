/**
 * Validation middleware for request validation and input sanitization
 */

const Joi = require('joi');

/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate DOT number format
 */
function validateDOTNumber(dotNumber) {
    const dotRegex = /^DOT\d{6,7}$/i;
    return dotRegex.test(dotNumber);
}

/**
 * Validate password strength
 */
function validatePassword(password) {
    const { validatePassword: validatePasswordFromConfig } = require('../utils/security-config');
    const errors = validatePasswordFromConfig(password);
    return { isValid: errors.length === 0, error: errors[0] };
}

/**
 * Sanitize string input
 */
function sanitizeString(input) {
    if (typeof input !== 'string') return input;
    return input.trim().replace(/[<>]/g, '');
}

/**
 * Sanitize object properties
 */
function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value);
        } else {
            sanitized[key] = value;
        }
    }
    
    return sanitized;
}

/**
 * Validate required fields
 */
function validateRequiredFields(fields, data) {
    const missing = [];
    
    for (const field of fields) {
        if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
            missing.push(field);
        }
    }
    
    return {
        isValid: missing.length === 0,
        missing: missing,
        error: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : null
    };
}

/**
 * Validate GPS provider credentials based on provider type
 */
function validateGPSProviderCredentials(providerType, credentials) {
    const errors = [];
    
    switch (providerType.toLowerCase()) {
        case 'spireon':
            if (!credentials.apiKey) errors.push('API Key is required for Spireon');
            if (!credentials.username) errors.push('Username is required for Spireon');
            if (!credentials.password) errors.push('Password is required for Spireon');
            if (!credentials.nspireId) errors.push('Nspire ID is required for Spireon');
            break;
            
        case 'skybitz':
            if (!credentials.username) errors.push('Username is required for SkyBitz');
            if (!credentials.password) errors.push('Password is required for SkyBitz');
            break;
            
        case 'samsara':
            if (!credentials.apiToken) errors.push('API Token is required for Samsara');
            if (!credentials.apiUrl) errors.push('API URL is required for Samsara');
            break;
            
        default:
            errors.push(`Unsupported provider type: ${providerType}`);
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validate location data
 */
function validateLocationData(locationData) {
    const errors = [];
    
    if (!locationData.name || locationData.name.trim() === '') {
        errors.push('Location name is required');
    }
    
    if (!locationData.type) {
        errors.push('Location type is required');
    } else {
        const validTypes = ['warehouse', 'company yard', 'parking'];
        if (!validTypes.includes(locationData.type)) {
            errors.push('Invalid location type');
        }
    }
    
    if (!locationData.lat || isNaN(parseFloat(locationData.lat))) {
        errors.push('Valid latitude is required');
    }
    
    if (!locationData.lng || isNaN(parseFloat(locationData.lng))) {
        errors.push('Valid longitude is required');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Validate trailer data
 */
function validateTrailerData(trailerData) {
    const errors = [];
    
    if (!trailerData.unitNumber || trailerData.unitNumber.trim() === '') {
        errors.push('Unit number is required');
    }
    
    if (trailerData.year && (isNaN(trailerData.year) || trailerData.year < 1900 || trailerData.year > new Date().getFullYear() + 1)) {
        errors.push('Invalid year');
    }
    
    if (trailerData.vin && trailerData.vin.length !== 17) {
        errors.push('VIN must be 17 characters long');
    }
    
    return {
        isValid: errors.length === 0,
        errors: errors
    };
}

/**
 * Middleware to sanitize request body
 */
function sanitizeRequestBody(req, res, next) {
    if (req.body) {
        req.body = sanitizeObject(req.body);
    }
    next();
}

/**
 * Middleware to validate request body against schema
 */
function validateRequestBody(schema) {
    return (req, res, next) => {
        const validation = schema(req.body);
        
        if (!validation.isValid) {
            return res.status(400).json({
                error: validation.error || 'Validation failed',
                details: validation.errors || validation.missing || []
            });
        }
        
        next();
    };
}

module.exports = {
    validateEmail,
    validateDOTNumber,
    validatePassword,
    sanitizeString,
    sanitizeObject,
    validateRequiredFields,
    validateGPSProviderCredentials,
    validateLocationData,
    validateTrailerData,
    sanitizeRequestBody,
    validateRequestBody
}; 
