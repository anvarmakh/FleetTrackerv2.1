const crypto = require('crypto');
const { ENCRYPTION_CONFIG, validateEncryptionKey } = require('./security-config');
const config = require('../config');

/**
 * Enhanced Encryption utilities for sensitive data
 * Uses modern crypto methods and proper security practices
 */
class EncryptionUtil {
    constructor() {
        this.algorithm = ENCRYPTION_CONFIG.ALGORITHM;
        this.encryptionKey = this.validateAndGetEncryptionKey();
    }

    /**
     * Validate and get encryption key with proper security checks
     */
    validateAndGetEncryptionKey() {
        const key = config.encryption.key;
        
        if (!key) {
            throw new Error('ENCRYPTION_KEY is not configured');
        }
        
        // Validate key length and strength
        if (!validateEncryptionKey(key)) {
            throw new Error(`ENCRYPTION_KEY must be at least ${ENCRYPTION_CONFIG.MIN_KEY_LENGTH} characters long with sufficient entropy`);
        }
        
        // Ensure key is exactly 32 bytes (256 bits) for AES-256
        if (key.length < ENCRYPTION_CONFIG.MIN_KEY_LENGTH) {
            return key.padEnd(ENCRYPTION_CONFIG.MIN_KEY_LENGTH, '0');
        } else if (key.length > ENCRYPTION_CONFIG.MIN_KEY_LENGTH) {
            return key.substring(0, ENCRYPTION_CONFIG.MIN_KEY_LENGTH);
        }
        
        return key;
    }

    /**
     * Encrypt sensitive data using modern crypto methods
     */
    encrypt(text) {
        if (!text) return null;
        
        try {
                    // Generate a random IV (Initialization Vector)
        const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
        
        // Ensure the key is exactly 32 bytes for AES-256
        const key = Buffer.from(this.encryptionKey.padEnd(ENCRYPTION_CONFIG.MIN_KEY_LENGTH, '0').slice(0, ENCRYPTION_CONFIG.MIN_KEY_LENGTH));
            
            // Create cipher with IV using modern method
            const cipher = crypto.createCipheriv(this.algorithm, key, iv);
            
            // Encrypt the text
            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Return IV + encrypted data (IV needs to be stored with the encrypted data)
            return iv.toString('hex') + ':' + encrypted;
        } catch (error) {
            console.error('Encryption error:', error);
            throw new Error('Failed to encrypt data');
        }
    }

    /**
     * Decrypt sensitive data using modern crypto methods
     */
    decrypt(encryptedText) {
        if (!encryptedText) return null;
        
        try {
            // Split IV and encrypted data
            const parts = encryptedText.split(':');
            if (parts.length !== 2) {
                throw new Error('Invalid encrypted data format');
            }
            
            const iv = Buffer.from(parts[0], 'hex');
            const encrypted = parts[1];
            
                    // Create decipher with IV using modern method
        const key = Buffer.from(this.encryptionKey.padEnd(ENCRYPTION_CONFIG.MIN_KEY_LENGTH, '0').slice(0, ENCRYPTION_CONFIG.MIN_KEY_LENGTH));
            const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
            
            // Decrypt the data
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data');
        }
    }

    /**
     * Hash password using bcrypt with consistent security level
     */
    async hashPassword(password) {
        if (!password) {
            throw new Error('Password is required');
        }
        
        const bcrypt = require('bcrypt');
        // Use consistent rounds from security config
        return await bcrypt.hash(password, ENCRYPTION_CONFIG.BCRYPT_ROUNDS);
    }

    /**
     * Compare password with hash using timing-safe comparison
     */
    async comparePassword(password, hash) {
        if (!password || !hash) {
            return false;
        }
        
        const bcrypt = require('bcrypt');
        return await bcrypt.compare(password, hash);
    }

    /**
     * Generate cryptographically secure random string
     */
    generateRandomString(length = 32) {
        if (length < 1) {
            throw new Error('Length must be at least 1');
        }
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * Generate secure token for authentication
     */
    generateSecureToken() {
        return crypto.randomBytes(64).toString('hex');
    }

    /**
     * Hash data using SHA-256
     */
    hashData(data) {
        if (!data) {
            throw new Error('Data is required for hashing');
        }
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    /**
     * Generate HMAC signature for data integrity
     */
    generateHMAC(data, secret = null) {
        if (!data) {
            throw new Error('Data is required for HMAC generation');
        }
        const key = secret || this.encryptionKey;
        return crypto.createHmac('sha256', key).update(data).digest('hex');
    }

    /**
     * Verify HMAC signature using timing-safe comparison
     */
    verifyHMAC(data, signature, secret = null) {
        if (!data || !signature) {
            return false;
        }
        const expectedSignature = this.generateHMAC(data, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature, 'hex'),
            Buffer.from(expectedSignature, 'hex')
        );
    }

    /**
     * Validate encryption key strength
     */
    validateKeyStrength(key) {
        return validateEncryptionKey(key);
    }
}

// Create singleton instance
const encryptionUtil = new EncryptionUtil();

module.exports = encryptionUtil; 
