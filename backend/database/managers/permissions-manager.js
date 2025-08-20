/**
 * Permissions Manager
 * Handles role-based permissions and access control
 * Hybrid system: Block-level permissions with granular override capability
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const BaseManager = require('./baseManager');

class PermissionsManager extends BaseManager {
    constructor(db) {
        super(db);
        this.db = db;
    }

    // ============================================================================
    // PERMISSION DEFINITIONS - HYBRID SYSTEM
    // ============================================================================
    
    // Block-level permissions (major categories)
    static BLOCK_PERMISSIONS = {
        // Fleet Management Block
        FLEET_VIEW: 'fleet_view',
        FLEET_CREATE: 'fleet_create',
        FLEET_EDIT: 'fleet_edit',
        FLEET_DELETE: 'fleet_delete',
        FLEET_ADMIN: 'fleet_admin',
        
        // Organization Management Block
        ORG_VIEW: 'org_view',
        ORG_CREATE: 'org_create',
        ORG_EDIT: 'org_edit',
        ORG_DELETE: 'org_delete',
        ORG_ADMIN: 'org_admin',
        
        // Analytics & Reports Block
        ANALYTICS_VIEW: 'analytics_view',
        ANALYTICS_EXPORT: 'analytics_export',
        ANALYTICS_ADMIN: 'analytics_admin'
    };

    // Granular permissions (detailed control)
    static GRANULAR_PERMISSIONS = {
        // Fleet Management - Trailers
        TRAILERS_VIEW: 'trailers_view',
        TRAILERS_CREATE: 'trailers_create',
        TRAILERS_EDIT: 'trailers_edit',
        TRAILERS_DELETE: 'trailers_delete',
        TRAILERS_LOCATION: 'trailers_location',
        TRAILERS_HISTORY: 'trailers_history',
        
        // Fleet Management - Locations
        LOCATIONS_VIEW: 'locations_view',
        LOCATIONS_CREATE: 'locations_create',
        LOCATIONS_EDIT: 'locations_edit',
        LOCATIONS_DELETE: 'locations_delete',
        
        // Fleet Management - Maintenance
        MAINTENANCE_VIEW: 'maintenance_view',
        MAINTENANCE_CREATE: 'maintenance_create',
        MAINTENANCE_EDIT: 'maintenance_edit',
        MAINTENANCE_DELETE: 'maintenance_delete',
        MAINTENANCE_ALERTS: 'maintenance_alerts',
        
        // Fleet Management - Notes
        NOTES_VIEW: 'notes_view',
        NOTES_CREATE: 'notes_create',
        NOTES_EDIT: 'notes_edit',
        NOTES_DELETE: 'notes_delete',
        NOTES_MANAGE: 'notes_manage',
        
        // Organization Management - Users
        USERS_VIEW: 'users_view',
        USERS_CREATE: 'users_create',
        USERS_EDIT: 'users_edit',
        USERS_DELETE: 'users_delete',
        USERS_ROLES: 'users_roles',
        
        // Organization Management - Companies
        COMPANIES_VIEW: 'companies_view',
        COMPANIES_CREATE: 'companies_create',
        COMPANIES_EDIT: 'companies_edit',
        COMPANIES_DELETE: 'companies_delete',
        COMPANIES_SWITCH: 'companies_switch',
        
        // Organization Management - Providers
        PROVIDERS_VIEW: 'providers_view',
        PROVIDERS_CREATE: 'providers_create',
        PROVIDERS_EDIT: 'providers_edit',
        PROVIDERS_DELETE: 'providers_delete',
        PROVIDERS_TEST: 'providers_test',
        
        // Organization Management - Settings
        SETTINGS_VIEW: 'settings_view',
        SETTINGS_EDIT: 'settings_edit',
        SETTINGS_MAINTENANCE: 'settings_maintenance',
        SETTINGS_NOTIFICATIONS: 'settings_notifications',
        
        // Analytics & Reports
        REPORTS_VIEW: 'reports_view',
        REPORTS_EXPORT: 'reports_export',
        REPORTS_ADVANCED: 'reports_advanced',
        
        // Geocoding (utility service)
        GEOCODING_VIEW: 'geocoding_view'
    };

    // Permission inheritance mapping (block → granular)
    static PERMISSION_INHERITANCE = {
        // Fleet Management Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.GEOCODING_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_CREATE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_LOCATION,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_ALERTS,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_DELETE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_DELETE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_DELETE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN]: [
            // Include the block permission itself
            PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW,
            PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE,
            PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT,
            PermissionsManager.BLOCK_PERMISSIONS.FLEET_DELETE,
            // Plus all granular permissions
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_LOCATION,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_ALERTS,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_HISTORY,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_MANAGE
        ],
        
        // Organization Management Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_MAINTENANCE,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_NOTIFICATIONS
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_ADMIN]: [
            // Include the block permission itself
            PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE,
            // Plus all granular permissions
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_MAINTENANCE,
            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_NOTIFICATIONS,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_ROLES,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_TEST
        ],
        
        // Analytics & Reports Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_EXPORT
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN]: [
            // Include the block permission itself
            PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
            PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT,
            // Plus all granular permissions
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_EXPORT,
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_ADVANCED
        ]
    };

    // Predefined role templates
    static ROLE_TEMPLATES = {
        'viewer': {
            name: 'Viewer',
            description: 'Read-only access to fleet and analytics',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW
            ],
            granularPermissions: []
        },
        
        'user': {
            name: 'User',
            description: 'Basic fleet operations and viewing',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE,
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW
            ],
            granularPermissions: []
        },
        
        'manager': {
            name: 'Manager',
            description: 'Team leadership with organization management',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE,
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT,
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_DELETE,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT
            ],
            granularPermissions: []
        },
        
        'admin': {
            name: 'Admin',
            description: 'Organization management with full fleet control',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN
            ],
            granularPermissions: []
        },
    
        'owner': {
            name: 'Owner',
            description: 'Full system access and control',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN
            ],
            granularPermissions: []
        }
    };

    // ============================================================================
    // STATIC PERMISSION METHODS
    // ============================================================================
    
    // Get all permissions for a role (including inheritance)
    static getEffectivePermissions(blockPermissions = [], granularPermissions = []) {
        const effectivePermissions = new Set();
        
        // Add block permissions and their inherited granular permissions
        blockPermissions.forEach(blockPermission => {
            effectivePermissions.add(blockPermission);
            
            const inheritedPermissions = PermissionsManager.PERMISSION_INHERITANCE[blockPermission] || [];
            inheritedPermissions.forEach(permission => {
                effectivePermissions.add(permission);
            });
        });
        
        // Add explicit granular permissions
        granularPermissions.forEach(permission => {
            effectivePermissions.add(permission);
        });
        
        return Array.from(effectivePermissions);
    }
    
    // Get permissions for a specific role template
    static getPermissionsForRole(role) {
        if (!role) {
            console.log('getPermissionsForRole: role is null/undefined');
            return [];
        }
        
        const template = PermissionsManager.ROLE_TEMPLATES[role.toLowerCase()];
        if (!template) {
            console.log(`getPermissionsForRole: unknown role "${role}"`);
            return [];
        }
        
        return PermissionsManager.getEffectivePermissions(
            template.blockPermissions,
            template.granularPermissions
        );
    }
    
    // Check if a user has a specific permission
    static hasPermission(userPermissions, requiredPermission) {
        if (!userPermissions || !Array.isArray(userPermissions)) {
            return false;
        }
        
        return userPermissions.includes(requiredPermission);
    }
    
    // Get all available permissions (for UI display)
    static getAllPermissions() {
        return {
            blocks: PermissionsManager.BLOCK_PERMISSIONS,
            granular: PermissionsManager.GRANULAR_PERMISSIONS,
            inheritance: PermissionsManager.PERMISSION_INHERITANCE,
            templates: PermissionsManager.ROLE_TEMPLATES
        };
    }
    
    // Get all available roles (for UI display)
    static getAllRoles() {
        return Object.keys(PermissionsManager.ROLE_TEMPLATES).map(role => ({
            id: role,
            name: PermissionsManager.ROLE_TEMPLATES[role].name,
            description: PermissionsManager.ROLE_TEMPLATES[role].description
        }));
    }
    
    // Get permission groups for UI organization
    static getPermissionGroups() {
        return {
            fleet: {
                name: 'Fleet Management',
                icon: '🚛',
                blocks: [
                    PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW,
                    PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE,
                    PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT,
                    PermissionsManager.BLOCK_PERMISSIONS.FLEET_DELETE,
                    PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN
                ],
                granular: {
                    trailers: {
                        name: 'Trailers',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_LOCATION,
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_HISTORY
                        ]
                    },
                    locations: {
                        name: 'Locations',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_DELETE
                        ]
                    },
                    maintenance: {
                        name: 'Maintenance',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_ALERTS
                        ]
                    },
                    notes: {
                        name: 'Notes',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_MANAGE
                        ]
                    }
                }
            },
            organization: {
                name: 'Organization Management',
                icon: '🏢',
                blocks: [
                    PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW,
                    PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE,
                    PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT,
                    PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE,
                    PermissionsManager.BLOCK_PERMISSIONS.ORG_ADMIN
                ],
                granular: {
                    users: {
                        name: 'Users',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_ROLES
                        ]
                    },
                    companies: {
                        name: 'Companies',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH
                        ]
                    },
                    providers: {
                        name: 'GPS Providers',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_TEST
                        ]
                    },
                    settings: {
                        name: 'Settings',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_MAINTENANCE,
                            PermissionsManager.GRANULAR_PERMISSIONS.SETTINGS_NOTIFICATIONS
                        ]
                    }
                }
            },
            analytics: {
                name: 'Analytics & Reports',
                icon: '📊',
                blocks: [
                    PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
                    PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT,
                    PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN
                ],
                granular: {
                    reports: {
                        name: 'Reports',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_EXPORT,
                            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_ADVANCED
                        ]
                    }
                }
            },
            utilities: {
                name: 'Utilities',
                icon: '🔧',
                blocks: [],
                granular: {
                    geocoding: {
                        name: 'Geocoding',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.GEOCODING_VIEW
                        ]
                    }
                }
            }
        };
    }

    // ============================================================================
    // DATABASE METHODS
    // ============================================================================
    
    // Get user permissions from database
    async getUserPermissions(userId) {
        try {
            const user = await executeQueryFirst(
                this.db,
                'SELECT organization_role as organizationRole, custom_permissions as customPermissions FROM users WHERE id = ?',
                [userId]
            );
            
            if (!user) {
                return [];
            }
            
            // Get base permissions from role template
            const basePermissions = PermissionsManager.getPermissionsForRole(user.organizationRole);
            
            // If user has custom permissions, merge them
            if (user.customPermissions) {
                try {
                    const customPermissions = JSON.parse(user.customPermissions);
                    return PermissionsManager.getEffectivePermissions(
                        customPermissions.blockPermissions || [],
                        customPermissions.granularPermissions || []
                    );
        } catch (error) {
                    console.error('Error parsing custom permissions:', error);
                    return basePermissions;
                }
            }
            
            return basePermissions;
        } catch (error) {
            console.error('Error getting user permissions:', error);
            return [];
        }
    }
    
    // Update user permissions
    async updateUserPermissions(userId, blockPermissions = [], granularPermissions = []) {
        try {
            const customPermissions = JSON.stringify({
                blockPermissions,
                granularPermissions
            });
            
            await executeQuery(
                this.db,
                'UPDATE users SET custom_permissions = ? WHERE id = ?',
                [customPermissions, userId]
            );
            
            return true;
        } catch (error) {
            console.error('Error updating user permissions:', error);
            return false;
        }
    }
    
    // Get all available roles (instance method)
    async getAllRoles(tenantId = null) {
        return PermissionsManager.getAllRoles();
    }
    
    // Get all roles with their permissions
    async getRolesWithPermissions() {
        try {
            const roles = Object.keys(PermissionsManager.ROLE_TEMPLATES);
            const rolesWithPermissions = {};
            
            roles.forEach(role => {
                const template = PermissionsManager.ROLE_TEMPLATES[role];
                rolesWithPermissions[role] = {
                    ...template,
                    effectivePermissions: PermissionsManager.getEffectivePermissions(
                        template.blockPermissions,
                        template.granularPermissions
                    )
                };
            });
            
            return rolesWithPermissions;
        } catch (error) {
            console.error('Error getting roles with permissions:', error);
            return {};
        }
    }
}

module.exports = PermissionsManager;
