const { PermissionsManager } = require('../database/database-manager');

/**
 * Middleware to check if user has a specific permission
 */
function requirePermission(permission) {
    return (req, res, next) => {
        try {
            const userRole = req.user.organizationRole;
            
            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    error: 'User role not found'
                });
            }

            if (PermissionsManager.hasPermission(userRole, permission)) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermission: permission,
                    userRole: userRole
                });
            }
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
}

/**
 * Middleware to check if user can assign a specific role
 */
function requireRoleAssignmentPermission(targetRole) {
    return (req, res, next) => {
        try {
            const userRole = req.user.organizationRole;
            
            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    error: 'User role not found'
                });
            }

            if (PermissionsManager.canAssignRole(userRole, targetRole)) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Cannot assign this role',
                    targetRole: targetRole,
                    userRole: userRole
                });
            }
        } catch (error) {
            console.error('Role assignment check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Role assignment check failed'
            });
        }
    };
}

/**
 * Middleware to check if user has any of the specified permissions
 */
function requireAnyPermission(permissions) {
    return (req, res, next) => {
        try {
            const userRole = req.user.organizationRole;
            
            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    error: 'User role not found'
                });
            }

            const hasAnyPermission = permissions.some(permission => 
                PermissionsManager.hasPermission(userRole, permission)
            );

            if (hasAnyPermission) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermissions: permissions,
                    userRole: userRole
                });
            }
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
}

/**
 * Middleware to check if user has all of the specified permissions
 */
function requireAllPermissions(permissions) {
    return (req, res, next) => {
        try {
            const userRole = req.user.organizationRole;
            
            if (!userRole) {
                return res.status(403).json({
                    success: false,
                    error: 'User role not found'
                });
            }

            const hasAllPermissions = permissions.every(permission => 
                PermissionsManager.hasPermission(userRole, permission)
            );

            if (hasAllPermissions) {
                next();
            } else {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    requiredPermissions: permissions,
                    userRole: userRole
                });
            }
        } catch (error) {
            console.error('Permission check error:', error);
            return res.status(500).json({
                success: false,
                error: 'Permission check failed'
            });
        }
    };
}

/**
 * Helper function to get user permissions for frontend
 */
function getUserPermissions(userRole) {
    return PermissionsManager.getPermissionsForRole(userRole);
}

/**
 * Helper function to get assignable roles for frontend
 */
function getAssignableRoles(userRole) {
    return PermissionsManager.getAssignableRoles(userRole);
}

// Unified role check
function hasRole(req, requiredRole) {
    const user = req.user;
    return user && (user.organizationRole === requiredRole || user.systemRole === requiredRole);
}

module.exports = {
    requirePermission,
    requireRoleAssignmentPermission,
    requireAnyPermission,
    requireAllPermissions,
    getUserPermissions,
    getAssignableRoles,
    PermissionsManager
}; 
