const { permissionsManager } = require('../database/database-manager');
const { PermissionsManager } = require('../database/database-manager');
const logger = require('../utils/logger');

/**
 * Middleware to require a specific permission
 * Works with both block-level and granular permissions
 */
const requirePermission = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // Get user from request (set by authenticateToken middleware)
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Get user's effective permissions
            const userPermissions = await permissionsManager.getUserPermissions(user.id);
            
            // Check if user has the required permission
            const hasPermission = PermissionsManager.hasPermission(userPermissions, requiredPermission);
            
            if (!hasPermission) {
                logger.warn(`Permission denied: User ${user.id} (${user.email}) attempted to access ${req.method} ${req.originalUrl} without permission: ${requiredPermission}`);
                
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermission: requiredPermission,
                    message: `You don't have permission to perform this action. Required: ${requiredPermission}`
                });
            }

            // Add user permissions to request for potential use in route handlers
            req.userPermissions = userPermissions;
            
            next();
        } catch (error) {
            logger.error('Error in requirePermission middleware:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error during permission check'
            });
        }
    };
};

/**
 * Middleware to require any of the specified permissions (OR logic)
 */
const requireAnyPermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const userPermissions = await permissionsManager.getUserPermissions(user.id);
            
            // Check if user has any of the required permissions
            const hasAnyPermission = requiredPermissions.some(permission => 
                PermissionsManager.hasPermission(userPermissions, permission)
            );
            
            if (!hasAnyPermission) {
                logger.warn(`Permission denied: User ${user.id} (${user.email}) attempted to access ${req.method} ${req.originalUrl} without any of the required permissions: ${requiredPermissions.join(', ')}`);
                
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermissions: requiredPermissions,
                    message: `You don't have permission to perform this action. Required: ${requiredPermissions.join(' OR ')}`
                });
            }

            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            logger.error('Error in requireAnyPermission middleware:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error during permission check'
            });
        }
    };
};

/**
 * Middleware to require all of the specified permissions (AND logic)
 */
const requireAllPermissions = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            const userPermissions = await permissionsManager.getUserPermissions(user.id);
            
            // Check if user has all of the required permissions
            const hasAllPermissions = requiredPermissions.every(permission => 
                PermissionsManager.hasPermission(userPermissions, permission)
            );
            
            if (!hasAllPermissions) {
                const missingPermissions = requiredPermissions.filter(permission => 
                    !PermissionsManager.hasPermission(userPermissions, permission)
                );
                
                logger.warn(`Permission denied: User ${user.id} (${user.email}) attempted to access ${req.method} ${req.originalUrl} missing permissions: ${missingPermissions.join(', ')}`);
                
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermissions: requiredPermissions,
                    missingPermissions: missingPermissions,
                    message: `You don't have all required permissions. Missing: ${missingPermissions.join(', ')}`
                });
            }

            req.userPermissions = userPermissions;
            next();
        } catch (error) {
            logger.error('Error in requireAllPermissions middleware:', error);
            return res.status(500).json({
                success: false,
                error: 'Internal server error during permission check'
            });
        }
    };
};

/**
 * Middleware to check if user has a specific permission (non-blocking)
 * Adds permission info to request but doesn't block if missing
 */
const checkPermission = (permission) => {
    return async (req, res, next) => {
        try {
            const user = req.user;
            
            if (!user) {
                req.hasPermission = false;
                return next();
            }

            const userPermissions = await permissionsManager.getUserPermissions(user.id);
            
            req.hasPermission = PermissionsManager.hasPermission(userPermissions, permission);
            req.userPermissions = userPermissions;
            
            next();
        } catch (error) {
            logger.error('Error in checkPermission middleware:', error);
            req.hasPermission = false;
            next();
        }
    };
};

/**
 * Middleware to require super admin access
 */
const requireSuperAdmin = async (req, res, next) => {
    try {
        const user = req.user;
        
        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
        }

        if (user.organizationRole !== 'owner') {
            logger.warn(`Super admin access denied: User ${user.id} (${user.email}) attempted to access ${req.method} ${req.originalUrl}`);
            
            return res.status(403).json({
                success: false,
                error: 'Super admin access required',
                message: 'This action requires super administrator privileges'
            });
        }

        next();
    } catch (error) {
        logger.error('Error in requireSuperAdmin middleware:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error during super admin check'
            });
    }
};

/**
 * Utility function to check if user has permission (for use in route handlers)
 */
const hasPermission = (userPermissions, permission) => {
    return PermissionsManager.hasPermission(userPermissions, permission);
};

/**
 * Utility function to get user's effective permissions (for use in route handlers)
 */
const getUserEffectivePermissions = async (userId) => {
    return await permissionsManager.getUserPermissions(userId);
};

module.exports = {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    checkPermission,
    requireSuperAdmin,
    hasPermission,
    getUserEffectivePermissions
}; 
