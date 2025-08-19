/**
 * Token Management Routes
 * Endpoints for managing JWT tokens and security
 */

const express = require('express');
const jwtSecurityService = require('../services/jwt-security');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * Get token statistics (SuperAdmin only)
 */
router.get('/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const stats = jwtSecurityService.getTokenStats();
        
        logger.info('Token statistics retrieved', { 
            adminId: req.user.id 
        });

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        logger.error('Error getting token statistics', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get token statistics'
        });
    }
});

/**
 * Revoke all tokens for a specific user (SuperAdmin only)
 */
router.post('/revoke-user/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        jwtSecurityService.revokeAllUserTokens(userId);
        
        logger.warn('All tokens revoked for user', { 
            adminId: req.user.id,
            targetUserId: userId 
        });

        res.json({
            success: true,
            message: `All tokens revoked for user ${userId}`
        });
    } catch (error) {
        logger.error('Error revoking user tokens', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revoke user tokens'
        });
    }
});

/**
 * Revoke specific access token
 */
router.post('/revoke-access', authenticateToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.substring(7);
        
        if (token) {
            jwtSecurityService.revokeAccessToken(token);
            
            logger.info('Access token revoked by user', { 
                userId: req.user.id 
            });
        }

        res.json({
            success: true,
            message: 'Access token revoked'
        });
    } catch (error) {
        logger.error('Error revoking access token', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revoke access token'
        });
    }
});

/**
 * Revoke specific refresh token
 */
router.post('/revoke-refresh', authenticateToken, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        jwtSecurityService.revokeRefreshToken(refreshToken);
        
        logger.info('Refresh token revoked by user', { 
            userId: req.user.id 
        });

        res.json({
            success: true,
            message: 'Refresh token revoked'
        });
    } catch (error) {
        logger.error('Error revoking refresh token', error);
        res.status(500).json({
            success: false,
            error: 'Failed to revoke refresh token'
        });
    }
});

/**
 * Force cleanup of expired tokens (SuperAdmin only)
 */
router.post('/cleanup', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        jwtSecurityService.cleanupExpiredTokens();
        
        logger.info('Manual token cleanup performed', { 
            adminId: req.user.id 
        });

        res.json({
            success: true,
            message: 'Token cleanup completed'
        });
    } catch (error) {
        logger.error('Error during token cleanup', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup tokens'
        });
    }
});

module.exports = router;
