/**
 * Security Configuration
 * Centralized security settings and constants for the FleetTracker application
 */

const crypto = require('crypto');
const config = require('../config');

// ============================================================================
// ENCRYPTION CONFIGURATION
// ============================================================================

const ENCRYPTION_CONFIG = {
    // Algorithm for symmetric encryption
    ALGORITHM: 'aes-256-cbc',
    
    // Minimum key length for AES-256 (32 bytes = 256 bits)
    MIN_KEY_LENGTH: 32,
    
    // IV (Initialization Vector) length for AES-CBC
    IV_LENGTH: 16,
    
    // Key derivation rounds for bcrypt password hashing
    BCRYPT_ROUNDS: 12,
    
    // Minimum password length
    MIN_PASSWORD_LENGTH: 8,
    
    // Maximum password length
    MAX_PASSWORD_LENGTH: 128,
    
    // JWT token expiration time (reduced for better security)
    JWT_EXPIRATION: process.env.NODE_ENV === 'production' ? '4h' : '24h',
    
    // Refresh token expiration time
    REFRESH_TOKEN_EXPIRATION: '7d',
    
    // Rate limiting settings
    RATE_LIMITS: {
        LOGIN_ATTEMPTS: process.env.NODE_ENV === 'production' ? 5 : 10, // Increased for better UX
        LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutes
        API_REQUESTS: process.env.NODE_ENV === 'production' ? 50 : 100,
        API_WINDOW: 60 * 1000, // 1 minute
        ADMIN_REQUESTS: process.env.NODE_ENV === 'production' ? 30 : 100,
        ADMIN_WINDOW: 15 * 60 * 1000, // 15 minutes
    }
};

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

function validateSecurityEnvironment() {
    const errors = [];
    const warnings = [];

    // Check for required environment variables in production
    if (process.env.NODE_ENV === 'production') {
        if (!config.encryption.key || config.encryption.key === 'dev-encryption-key-change-in-production') {
            errors.push('ENCRYPTION_KEY environment variable is required in production');
        }
        
        if (!config.jwt.secret || config.jwt.secret === 'dev-jwt-secret-change-in-production') {
            errors.push('JWT_SECRET environment variable is required in production');
        }
        
        if (!process.env.JWT_REFRESH_SECRET) {
            errors.push('JWT_REFRESH_SECRET environment variable is required in production');
        }
        
        if (config.encryption.key && config.encryption.key.length < ENCRYPTION_CONFIG.MIN_KEY_LENGTH) {
            errors.push(`ENCRYPTION_KEY must be at least ${ENCRYPTION_CONFIG.MIN_KEY_LENGTH} characters long`);
        }
    } else {
        // Development warnings
        if (!config.encryption.key || config.encryption.key === 'dev-encryption-key-change-in-production') {
            warnings.push('Using development encryption key - NOT for production!');
        }
        
        if (!config.jwt.secret || config.jwt.secret === 'dev-jwt-secret-change-in-production') {
            warnings.push('Using development JWT secret - NOT for production!');
        }
        
        if (!process.env.JWT_REFRESH_SECRET) {
            warnings.push('Using development JWT refresh secret - NOT for production!');
        }
    }

    // Log warnings
    warnings.forEach(warning => console.warn('⚠️  Security Warning:', warning));
    
    // Throw errors
    if (errors.length > 0) {
        throw new Error('Security Configuration Errors:\n' + errors.join('\n'));
    }
}

// ============================================================================
// KEY GENERATION UTILITIES
// ============================================================================

function generateSecureEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

function generateSecureJWTSecret() {
    return crypto.randomBytes(64).toString('hex');
}

function generateSecureRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
}

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

function validatePassword(password) {
    const errors = [];
    
    if (!password) {
        errors.push('Password is required');
        return errors;
    }
    
    if (password.length < ENCRYPTION_CONFIG.MIN_PASSWORD_LENGTH) {
        errors.push(`Password must be at least ${ENCRYPTION_CONFIG.MIN_PASSWORD_LENGTH} characters long`);
    }
    
    if (password.length > ENCRYPTION_CONFIG.MAX_PASSWORD_LENGTH) {
        errors.push(`Password must be no more than ${ENCRYPTION_CONFIG.MAX_PASSWORD_LENGTH} characters long`);
    }
    
    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'admin', 'letmein'];
    if (weakPasswords.includes(password.toLowerCase())) {
        errors.push('Password is too common');
    }
    
    return errors;
}

// ============================================================================
// ENCRYPTION KEY VALIDATION
// ============================================================================

function validateEncryptionKey(key) {
    if (!key) {
        return false;
    }
    
    if (key.length < ENCRYPTION_CONFIG.MIN_KEY_LENGTH) {
        return false;
    }
    
    // Check for sufficient entropy (basic check)
    const uniqueChars = new Set(key).size;
    return uniqueChars >= 16; // At least 16 unique characters
}

// ============================================================================
// SECURITY HEADERS
// ============================================================================

const SECURITY_HEADERS = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
    'Referrer-Policy': 'strict-origin-when-cross-origin'
};

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

const CORS_CONFIG = {
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-tenant-id']
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
    ENCRYPTION_CONFIG,
    validateSecurityEnvironment,
    generateSecureEncryptionKey,
    generateSecureJWTSecret,
    generateSecureRandomString,
    validatePassword,
    validateEncryptionKey,
    SECURITY_HEADERS,
    CORS_CONFIG
}; 
