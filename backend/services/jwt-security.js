/**
 * JWT Security Service
 * Enhanced JWT token management with security features
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { userManager } = require('../database/database-manager');
const { ENCRYPTION_CONFIG } = require('../utils/security-config');
const logger = require('../utils/logger');

// In-memory token blacklist (in production, use Redis)
const tokenBlacklist = new Set();

// In-memory refresh token store (in production, use Redis)
const refreshTokens = new Map();

// Token fingerprint cache
const tokenFingerprints = new Map();

class JWTSecurityService {
    constructor() {
        this.secret = process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production';
        this.refreshSecret = process.env.JWT_REFRESH_SECRET || this.secret + '-refresh';
        
        // Clean up expired tokens every hour
        setInterval(() => this.cleanupExpiredTokens(), 60 * 60 * 1000);
    }

    /**
     * Generate a stable token fingerprint (no time component)
     * Backed by User-Agent and IP. We intentionally avoid a time window to
     * prevent unintended logouts when the 5-minute window rolls over.
     */
    generateTokenFingerprint(req) {
        const userAgent = req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']) : '';
        // Respect proxies if present
        const forwardedFor = req.headers && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : '';
        const directIp = (req.ip || (req.connection && req.connection.remoteAddress) || '') + '';
        const ip = forwardedFor || directIp;

        return crypto
            .createHash('sha256')
            .update(`${userAgent}:${ip}`)
            .digest('hex');
    }

    /**
     * Legacy fingerprint generator (with 5-minute window) kept for backward compatibility
     */
    generateLegacyTokenFingerprint(req, windowOffset = 0) {
        const userAgent = req.headers && req.headers['user-agent'] ? String(req.headers['user-agent']) : '';
        const forwardedFor = req.headers && req.headers['x-forwarded-for'] ? String(req.headers['x-forwarded-for']).split(',')[0].trim() : '';
        const directIp = (req.ip || (req.connection && req.connection.remoteAddress) || '') + '';
        const ip = forwardedFor || directIp;
        const baseWindow = Math.floor(Date.now() / (5 * 60 * 1000));
        const timestampWindow = baseWindow + windowOffset;

        return crypto
            .createHash('sha256')
            .update(`${userAgent}:${ip}:${timestampWindow}`)
            .digest('hex');
    }

    /**
     * Create access token with enhanced security
     */
    createAccessToken(userData, req) {
        const fingerprint = this.generateTokenFingerprint(req);
        const tokenId = crypto.randomBytes(16).toString('hex');
        
        const payload = {
            ...userData,
            tokenId,
            fingerprint,
            type: 'access',
            iat: Math.floor(Date.now() / 1000)
        };

        const token = jwt.sign(payload, this.secret, {
            expiresIn: ENCRYPTION_CONFIG.JWT_EXPIRATION,
            issuer: 'fleet-tracker',
            audience: 'fleet-tracker-users'
        });

        // Store fingerprint for validation
        tokenFingerprints.set(tokenId, {
            fingerprint,
            userId: userData.id,
            createdAt: Date.now()
        });

        logger.info('Access token created', { 
            userId: userData.id, 
            tokenId,
            expiresIn: ENCRYPTION_CONFIG.JWT_EXPIRATION 
        });

        return { token, tokenId, fingerprint };
    }

    /**
     * Create refresh token
     */
    createRefreshToken(userId, req) {
        const fingerprint = this.generateTokenFingerprint(req);
        const refreshTokenId = crypto.randomBytes(16).toString('hex');
        
        const payload = {
            userId,
            tokenId: refreshTokenId,
            fingerprint,
            type: 'refresh',
            iat: Math.floor(Date.now() / 1000)
        };

        const refreshToken = jwt.sign(payload, this.refreshSecret, {
            expiresIn: ENCRYPTION_CONFIG.REFRESH_TOKEN_EXPIRATION,
            issuer: 'fleet-tracker',
            audience: 'fleet-tracker-users'
        });

        // Store refresh token
        refreshTokens.set(refreshTokenId, {
            userId,
            fingerprint,
            createdAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
        });

        logger.info('Refresh token created', { userId, refreshTokenId });

        return { refreshToken, refreshTokenId };
    }

    /**
     * Verify access token with enhanced security
     */
    verifyAccessToken(token, req) {
        return new Promise((resolve, reject) => {
            // Check if token is blacklisted
            if (tokenBlacklist.has(token)) {
                logger.warn('Blacklisted token attempted', { token: token.substring(0, 20) + '...' });
                return reject(new Error('Token has been revoked'));
            }

            jwt.verify(token, this.secret, {
                issuer: 'fleet-tracker',
                audience: 'fleet-tracker-users'
            }, (err, decoded) => {
                if (err) {
                    logger.warn('Token verification failed', { error: err.message });
                    return reject(new Error('Invalid or expired token'));
                }

                // Verify token type
                if (decoded.type !== 'access') {
                    logger.warn('Invalid token type', { type: decoded.type });
                    return reject(new Error('Invalid token type'));
                }

                // Verify fingerprint (support legacy tokens for backward compatibility)
                const storedFingerprint = tokenFingerprints.get(decoded.tokenId);
                if (!storedFingerprint) {
                    logger.warn('Token fingerprint not found', { tokenId: decoded.tokenId });
                    return reject(new Error('Invalid token'));
                }

                const currentFingerprint = this.generateTokenFingerprint(req);

                let fingerprintMatches = storedFingerprint.fingerprint === currentFingerprint;

                // Backward compatibility: if it doesn't match, try legacy windows
                if (!fingerprintMatches) {
                    const legacyCurrent = this.generateLegacyTokenFingerprint(req, 0);
                    const legacyPrevious = this.generateLegacyTokenFingerprint(req, -1);
                    fingerprintMatches = storedFingerprint.fingerprint === legacyCurrent || storedFingerprint.fingerprint === legacyPrevious;
                }

                if (!fingerprintMatches) {
                    logger.warn('Token fingerprint mismatch', {
                        tokenId: decoded.tokenId,
                        stored: storedFingerprint.fingerprint.substring(0, 8),
                        current: currentFingerprint.substring(0, 8)
                    });
                    return reject(new Error('Token fingerprint mismatch'));
                }

                // Check if user is still active (skip for system admin)
                if (decoded.id === 'admin_system' && decoded.organizationRole === 'systemAdmin') {
                    // System admin - no database check needed
                    resolve(decoded);
                } else {
                    userManager.getUserProfile(decoded.id)
                        .then(user => {
                            if (!user || user.isActive === 0) {
                                logger.warn('User inactive or not found', { userId: decoded.id });
                                return reject(new Error('User account is inactive'));
                            }
                            resolve(decoded);
                        })
                        .catch(error => {
                            logger.error('Error checking user status', error);
                            reject(new Error('Authentication verification failed'));
                        });
                }
            });
        });
    }

    /**
     * Verify refresh token
     */
    verifyRefreshToken(refreshToken) {
        return new Promise((resolve, reject) => {
            jwt.verify(refreshToken, this.refreshSecret, {
                issuer: 'fleet-tracker',
                audience: 'fleet-tracker-users'
            }, (err, decoded) => {
                if (err) {
                    logger.warn('Refresh token verification failed', { error: err.message });
                    return reject(new Error('Invalid or expired refresh token'));
                }

                // Verify token type
                if (decoded.type !== 'refresh') {
                    logger.warn('Invalid refresh token type', { type: decoded.type });
                    return reject(new Error('Invalid refresh token'));
                }

                // Check if refresh token exists in store
                const storedToken = refreshTokens.get(decoded.tokenId);
                if (!storedToken) {
                    logger.warn('Refresh token not found in store', { tokenId: decoded.tokenId });
                    return reject(new Error('Invalid refresh token'));
                }

                // Check if expired
                if (Date.now() > storedToken.expiresAt) {
                    logger.warn('Refresh token expired', { tokenId: decoded.tokenId });
                    refreshTokens.delete(decoded.tokenId);
                    return reject(new Error('Refresh token expired'));
                }

                resolve(decoded);
            });
        });
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken, req) {
        try {
            const decoded = await this.verifyRefreshToken(refreshToken);
            
            // Revoke old refresh token (token rotation)
            refreshTokens.delete(decoded.tokenId);

            let userData;
            
            // Handle system admin differently
            if (decoded.userId === 'admin_system') {
                userData = {
                    id: 'admin_system',
                    email: 'admin@system.local',
                    firstName: 'System',
                    lastName: 'SuperAdmin',
                    tenantId: 'system',
                    companyId: null,
                    organizationRole: 'systemAdmin'
                };
            } else {
                // Get fresh user data for regular users
                const user = await userManager.getUserProfile(decoded.userId);
                if (!user || user.isActive === 0) {
                    throw new Error('User account is inactive');
                }

                userData = {
                    id: user.id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    tenantId: user.tenantId,
                    organizationRole: user.organizationRole
                };
            }

            const { token: newAccessToken, tokenId } = this.createAccessToken(userData, req);
            const { refreshToken: newRefreshToken } = this.createRefreshToken(decoded.userId, req);

            logger.info('Tokens refreshed', { userId: decoded.userId, oldTokenId: decoded.tokenId });

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                user: userData
            };
        } catch (error) {
            logger.error('Token refresh failed', error);
            throw error;
        }
    }

    /**
     * Revoke access token
     */
    revokeAccessToken(token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded && decoded.tokenId) {
                tokenBlacklist.add(token);
                tokenFingerprints.delete(decoded.tokenId);
                logger.info('Access token revoked', { tokenId: decoded.tokenId });
            }
        } catch (error) {
            logger.error('Error revoking access token', error);
        }
    }

    /**
     * Revoke refresh token
     */
    revokeRefreshToken(refreshToken) {
        try {
            const decoded = jwt.decode(refreshToken);
            if (decoded && decoded.tokenId) {
                refreshTokens.delete(decoded.tokenId);
                logger.info('Refresh token revoked', { tokenId: decoded.tokenId });
            }
        } catch (error) {
            logger.error('Error revoking refresh token', error);
        }
    }

    /**
     * Revoke all tokens for a user
     */
    revokeAllUserTokens(userId) {
        // Remove all refresh tokens for user
        for (const [tokenId, tokenData] of refreshTokens.entries()) {
            if (tokenData.userId === userId) {
                refreshTokens.delete(tokenId);
            }
        }

        // Remove all fingerprints for user
        for (const [tokenId, fingerprintData] of tokenFingerprints.entries()) {
            if (fingerprintData.userId === userId) {
                tokenFingerprints.delete(tokenId);
            }
        }

        logger.info('All tokens revoked for user', { userId });
    }

    /**
     * Clean up expired tokens
     */
    cleanupExpiredTokens() {
        const now = Date.now();
        let cleanedCount = 0;

        // Clean up expired refresh tokens
        for (const [tokenId, tokenData] of refreshTokens.entries()) {
            if (now > tokenData.expiresAt) {
                refreshTokens.delete(tokenId);
                cleanedCount++;
            }
        }

        // Clean up old fingerprints (older than 24 hours)
        for (const [tokenId, fingerprintData] of tokenFingerprints.entries()) {
            if (now - fingerprintData.createdAt > 24 * 60 * 60 * 1000) {
                tokenFingerprints.delete(tokenId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info('Cleaned up expired tokens', { count: cleanedCount });
        }
    }

    /**
     * Get token statistics
     */
    getTokenStats() {
        return {
            activeRefreshTokens: refreshTokens.size,
            activeFingerprints: tokenFingerprints.size,
            blacklistedTokens: tokenBlacklist.size
        };
    }
}

// Export singleton instance
module.exports = new JWTSecurityService();
