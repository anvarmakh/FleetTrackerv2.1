const jwt = require('jsonwebtoken');
const { userManager } = require('../database/database-manager');
const jwtSecurityService = require('../services/jwt-security');
const logger = require('../utils/logger');
const config = require('../config');

// JWT secret key from config
const JWT_SECRET = config.jwt.secret;

/**
 * Middleware to authenticate JWT tokens with enhanced security
 */
async function authenticateToken(req, res, next) {
    try {
        const token = extractTokenFromRequest(req);
        
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Access token required'
            });
        }

        // Use enhanced JWT security service
        const decoded = await jwtSecurityService.verifyAccessToken(token, req);
        
        // Additional security validation
        if (!decoded || !decoded.id || !decoded.email) {
            return res.status(403).json({
                success: false,
                error: 'Invalid user token'
            });
        }
        
        // Allow system SuperAdmin token without DB lookup
        if ((decoded.organizationRole === 'superAdmin' || decoded.systemRole === 'superAdmin') && decoded.id === 'admin_system') {
            req.user = decoded;
            return next();
        }

        // Ensure the user is still active and fetch latest role/tenant
        const dbUser = await userManager.getUserProfile(decoded.id);
        if (!dbUser) {
            // User no longer exists (e.g., database reset) – force re-auth
            return res.status(401).json({
                success: false,
                error: 'Invalid or expired token'
            });
        }
        if (dbUser.isActive === 0) {
            return res.status(403).json({
                success: false,
                error: 'User account is inactive'
            });
        }
        
        req.user = {
            ...decoded,
            tenantId: dbUser.tenantId || decoded.tenantId,
            organizationRole: dbUser.organizationRole || decoded.organizationRole
        };
        
        logger.debug('Token authentication successful', { 
            userId: req.user.id, 
            email: req.user.email 
        });
        
        next();
    } catch (error) {
        logger.warn('Token authentication failed', { 
            error: error.message,
            ip: req.ip || req.connection.remoteAddress 
        });
        
        return res.status(401).json({
            success: false,
            error: error.message || 'Authentication failed'
        });
    }
}

/**
 * Extract token from request headers or cookies
 */
function extractTokenFromRequest(req) {
    let token = null;
    
    // Try Authorization header first
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }
    
    // Try cookies if no header token
    if (!token && req.headers.cookie) {
        const cookies = req.headers.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'authToken') {
                token = value;
                break;
            }
        }
    }
    
    return token;
}

/**
 * Middleware to validate tenant access
 */
function validateTenant(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    // SuperAdmin bypasses tenant scoping
    if (req.user.organizationRole === 'superAdmin') {
        return next();
    }
    
    // Check if user has tenant access
    if (!req.user.tenantId) {
        return res.status(403).json({
            success: false,
            error: 'Tenant access required'
        });
    }
    
    // Check tenant ID from header if provided
    const headerTenantId = req.headers['x-tenant-id'];
    if (headerTenantId && req.user && req.user.tenantId) {
        if (headerTenantId !== req.user.tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Tenant mismatch'
            });
        }
    }
    
    next();
}

/**
 * Middleware to check if user has specific role
 */
function requireRole(requiredRole) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!req.user.organizationRole || req.user.organizationRole !== requiredRole) {
            return res.status(403).json({
                success: false,
                error: `Role '${requiredRole}' required`
            });
        }
        
        next();
    };
}

/**
 * Middleware to check if user has any of the specified roles
 */
function requireAnyRole(requiredRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }
        
        if (!req.user.organizationRole || !requiredRoles.includes(req.user.organizationRole)) {
            return res.status(403).json({
                success: false,
                error: `One of the following roles required: ${requiredRoles.join(', ')}`
            });
        }
        
        next();
    };
}

/**
 * Middleware to require SuperAdmin access
 */
function requireSuperAdmin(req, res, next) {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    if (req.user.organizationRole !== 'superAdmin' && req.user.systemRole !== 'superAdmin') {
        return res.status(403).json({
            success: false,
            error: 'SuperAdmin access required'
        });
    }
    
    next();
}

module.exports = {
    authenticateToken,
    validateTenant,
    requireRole,
    requireAnyRole,
    requireSuperAdmin,
    JWT_SECRET
}; 
