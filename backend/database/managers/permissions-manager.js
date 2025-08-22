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
const { validateRoleCanBeModified, validateRoleCanBeDeleted, validateRoleCanBeCreated } = require('../../utils/role-constants');

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
        
        // Organization Management - Roles (CRUD operations)
        ROLES_VIEW: 'roles_view',
        ROLES_CREATE: 'roles_create',
        ROLES_EDIT: 'roles_edit',
        ROLES_DELETE: 'roles_delete',
        ROLES_ASSIGN_ADMIN: 'roles_assign_admin',
        
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
        MAINTENANCE_SETTINGS_VIEW: 'maintenance_settings_view',
        MAINTENANCE_SETTINGS_EDIT: 'maintenance_settings_edit',
        COMPANY_PREFERENCES_VIEW: 'company_preferences_view',
        COMPANY_PREFERENCES_EDIT: 'company_preferences_edit',
        
        // Analytics & Reports
        REPORTS_VIEW: 'reports_view',
        REPORTS_EXPORT: 'reports_export',
        REPORTS_ADVANCED: 'reports_advanced',
        

    };

    // Permission inheritance mapping (block → granular)
    static PERMISSION_INHERITANCE = {
        // Fleet Management Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_CREATE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_CREATE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.FLEET_EDIT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_EDIT,
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
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.LOCATIONS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.NOTES_MANAGE
        ],
        
        // Organization Management Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_EDIT
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE]: [
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ORG_ADMIN]: [
            // Include all org block permissions
            PermissionsManager.BLOCK_PERMISSIONS.ORG_VIEW,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_CREATE,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_EDIT,
            PermissionsManager.BLOCK_PERMISSIONS.ORG_DELETE,
            // Plus all granular permissions
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_TEST,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_VIEW,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_CREATE,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_EDIT,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_DELETE,
            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_ASSIGN_ADMIN
        ],
        
        // Analytics & Reports Block Inheritance
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW]: [
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_VIEW
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT]: [
            PermissionsManager.GRANULAR_PERMISSIONS.REPORTS_EXPORT
        ],
        
        [PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN]: [
            // Include all analytics block permissions
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
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT
            ],
            granularPermissions: [
                // Explicitly grant all org granular permissions EXCEPT roles
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_TEST,
                PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_EDIT
                // Note: NO ROLES_* permissions included here
            ]
        },
        
        'admin': {
            name: 'Admin',
            description: 'Organization management with full fleet control (no role management)',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_VIEW,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_EXPORT,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN
            ],
            granularPermissions: [
                // Explicitly grant all org granular permissions EXCEPT roles
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.PROVIDERS_TEST,
                PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_EDIT
                // Note: NO ROLES_* permissions included here
            ]
        },
    
        'owner': {
            name: 'Owner',
            description: 'Full system access and control',
            blockPermissions: [
                PermissionsManager.BLOCK_PERMISSIONS.FLEET_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ORG_ADMIN,
                PermissionsManager.BLOCK_PERMISSIONS.ANALYTICS_ADMIN
            ],
            granularPermissions: [
                // Explicitly add roles permissions for owner
                PermissionsManager.GRANULAR_PERMISSIONS.ROLES_VIEW,
                PermissionsManager.GRANULAR_PERMISSIONS.ROLES_CREATE,
                PermissionsManager.GRANULAR_PERMISSIONS.ROLES_EDIT,
                PermissionsManager.GRANULAR_PERMISSIONS.ROLES_DELETE,
                PermissionsManager.GRANULAR_PERMISSIONS.ROLES_ASSIGN_ADMIN
            ]
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
            return [];
        }
        
        const template = PermissionsManager.ROLE_TEMPLATES[role.toLowerCase()];
        if (!template) {
            return [];
        }
        
        return PermissionsManager.getEffectivePermissions(
            template.blockPermissions,
            template.granularPermissions
        );
    }
    
    // Get permissions for a role (including custom roles) - instance method
    async getPermissionsForRoleAsync(roleName, tenantId = null) {
        try {
            if (!roleName) {
                return [];
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            // First check if it's a custom role
            const customRole = await executeQueryFirst(
                this.db,
                'SELECT permissions_json FROM custom_roles WHERE name = ? AND tenant_id = ?',
                [roleName, actualTenantId]
            );
            
            if (customRole) {
                // Custom role found
                return JSON.parse(customRole.permissions_json);
            }
            
            // Check for system role override
            const overrideRole = await executeQueryFirst(
                this.db,
                'SELECT permissions_json FROM custom_role_permissions WHERE role_name = ? AND tenant_id = ?',
                [roleName, actualTenantId]
            );
            
            if (overrideRole) {
                // Override found
                return JSON.parse(overrideRole.permissions_json);
            }
            
            // Use default system permissions
            return PermissionsManager.getPermissionsForRole(roleName);
            
const logger = require('../../utils/logger');

        } catch (error) {
            logger.error('Error getting permissions for role:', error);
            // Fallback to static method
            return PermissionsManager.getPermissionsForRole(roleName);
        }
    }
    
    // Check if a user has a specific permission
    static hasPermission(userPermissions, requiredPermission) {
        if (!userPermissions || !Array.isArray(userPermissions)) {
            return false;
        }
        
        return userPermissions.includes(requiredPermission);
    }
    
    // Check if a user has cross-company access permission
    static hasCrossCompanyAccess(userPermissions, userRole = null) {
        // First check explicit permissions if provided
        if (userPermissions && Array.isArray(userPermissions)) {
            return userPermissions.includes(PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH);
        }
        
        // Fallback to role-based check if no permissions provided
        if (userRole && userRole.trim()) {
            // Get permissions for the role
            const rolePermissions = PermissionsManager.getPermissionsForRole(userRole);
            return rolePermissions.includes(PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH);
        }
        
        return false;
    }
    
    // Get cross-company access permission name (for consistency)
    static getCrossCompanyAccessPermission() {
        return PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH;
    }
    
    // Check if a role has cross-company access by default
    static roleHasCrossCompanyAccess(roleName) {
        if (!roleName) return false;
        
        const permissions = PermissionsManager.getPermissionsForRole(roleName);
        return permissions.includes(PermissionsManager.GRANULAR_PERMISSIONS.COMPANIES_SWITCH);
    }
    
    // Get all roles that have cross-company access by default
    static getRolesWithCrossCompanyAccess() {
        const roles = Object.keys(PermissionsManager.ROLE_TEMPLATES);
        return roles.filter(role => PermissionsManager.roleHasCrossCompanyAccess(role));
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
    
    // Role hierarchy for assignment permissions
    static ROLE_HIERARCHY = {
        'systemAdmin': ['systemAdmin', 'owner', 'admin', 'manager', 'user', 'viewer'],
        'owner': ['owner', 'admin', 'manager', 'user', 'viewer'],
        'admin': ['manager', 'user', 'viewer'],  // Admin cannot assign admin role
        'manager': ['manager', 'user', 'viewer'],
        'user': ['user', 'viewer'],
        'viewer': ['viewer']
    };
    
    // Get assignable roles for a given role
    static getAssignableRoles(role) {
        if (!role) {
            return [];
        }
        
        return PermissionsManager.ROLE_HIERARCHY[role.toLowerCase()] || [];
    }
    
    // Check if a role can assign another role
    static canAssignRole(assignerRole, targetRole) {
        const assignableRoles = PermissionsManager.getAssignableRoles(assignerRole);
        
        // Basic role hierarchy check
        if (!assignableRoles.includes(targetRole.toLowerCase())) {
            return false;
        }
        
        // Special check for admin role assignment - requires roles_assign_admin permission
        if (targetRole.toLowerCase() === 'admin') {
            // Get assigner's permissions
            const assignerPermissions = PermissionsManager.getPermissionsForRole(assignerRole);
            return assignerPermissions.includes(PermissionsManager.GRANULAR_PERMISSIONS.ROLES_ASSIGN_ADMIN);
        }
        
        return true;
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
                            PermissionsManager.GRANULAR_PERMISSIONS.TRAILERS_DELETE
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
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_DELETE
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
                            PermissionsManager.GRANULAR_PERMISSIONS.USERS_DELETE
                        ]
                    },
                    roles: {
                        name: 'Roles',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_CREATE,
                            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_EDIT,
                            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_DELETE,
                            PermissionsManager.GRANULAR_PERMISSIONS.ROLES_ASSIGN_ADMIN
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
                    maintenanceSettings: {
                        name: 'Maintenance Settings',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.MAINTENANCE_SETTINGS_EDIT
                        ]
                    },
                    companyPreferences: {
                        name: 'Company Preferences',
                        permissions: [
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_VIEW,
                            PermissionsManager.GRANULAR_PERMISSIONS.COMPANY_PREFERENCES_EDIT
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
                'SELECT organization_role as organizationRole, custom_permissions as customPermissions, tenant_id as tenantId FROM users WHERE id = ?',
                [userId]
            );
            
            if (!user) {
                return [];
            }
            
            // Get base permissions from role (including custom roles)
            const basePermissions = await this.getPermissionsForRoleAsync(user.organizationRole, user.tenantId);
            
            // If user has custom permissions, merge them
            if (user.customPermissions) {
                try {
                    const customPermissions = JSON.parse(user.customPermissions);
                    return PermissionsManager.getEffectivePermissions(
                        customPermissions.blockPermissions || [],
                        customPermissions.granularPermissions || []
                    );
                } catch (error) {
                    logger.error('Error parsing custom permissions:', error);
                    return basePermissions;
                }
            }
            
            return basePermissions;
        } catch (error) {
            logger.error('Error getting user permissions:', error);
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
            logger.error('Error updating user permissions:', error);
            return false;
        }
    }
    
    // Get all available roles (instance method) - includes custom roles
    async getAllRoles(tenantId = null) {
        try {
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            // Get system roles
            const systemRoles = Object.keys(PermissionsManager.ROLE_TEMPLATES).map(role => ({
                name: role,
                displayName: PermissionsManager.ROLE_TEMPLATES[role].name,
                description: PermissionsManager.ROLE_TEMPLATES[role].description,
                isCustom: false,
                permissions: PermissionsManager.getPermissionsForRole(role)
            }));
            
            // Get custom roles from database
            const customRoles = await executeQuery(
                this.db,
                `SELECT name, display_name, description, permissions_json, created_at, updated_at
                 FROM custom_roles 
                 WHERE tenant_id = ?
                 ORDER BY created_at ASC`,
                [actualTenantId]
            );
            
            const processedCustomRoles = customRoles.map(row => ({
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                isCustom: true,
                permissions: JSON.parse(row.permissions_json),
                createdAt: row.created_at,
                updatedAt: row.updated_at
            }));
            
            // Get system role overrides from custom_role_permissions
            const systemRoleOverrides = await executeQuery(
                this.db,
                `SELECT role_name, permissions_json
                 FROM custom_role_permissions 
                 WHERE tenant_id = ?`,
                [actualTenantId]
            );
            
            // Apply overrides to system roles
            const overrideMap = new Map();
            systemRoleOverrides.forEach(row => {
                overrideMap.set(row.role_name, JSON.parse(row.permissions_json));
            });
            
            const systemRolesWithOverrides = systemRoles.map(role => {
                if (overrideMap.has(role.name)) {
                    return {
                        ...role,
                        permissions: overrideMap.get(role.name),
                        hasOverride: true
                    };
                }
                return role;
            });
            
            // Combine system and custom roles
            return [...systemRolesWithOverrides, ...processedCustomRoles];
            
        } catch (error) {
            console.error('Error getting all roles:', error);
            // Fallback to system roles only
            return Object.keys(PermissionsManager.ROLE_TEMPLATES).map(role => ({
                name: role,
                displayName: PermissionsManager.ROLE_TEMPLATES[role].name,
                description: PermissionsManager.ROLE_TEMPLATES[role].description,
                isCustom: false,
                permissions: PermissionsManager.getPermissionsForRole(role)
            }));
        }
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
            logger.error('Error getting roles with permissions:', error);
            return {};
        }
    }
    
    // Create custom role
    async createCustomRole(name, displayName, description, permissions, tenantId = null) {
        try {
            if (!name || !displayName || !permissions) {
                throw new Error('Role name, display name, and permissions are required');
            }
            
            if (!Array.isArray(permissions)) {
                throw new Error('Permissions must be an array');
            }

            // Prevent creating a role with reserved names
            validateRoleCanBeCreated(name);
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            const roleId = generateId('role');
            const timestamp = getCurrentTimestamp();

            const result = await executeSingleQuery(this.db, `
                INSERT INTO custom_roles (
                    id, name, display_name, description, permissions_json, tenant_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [roleId, name, displayName, description, JSON.stringify(permissions), actualTenantId, timestamp]);
            
            return { id: roleId, changes: result.changes };
        } catch (error) {
            logger.error('Error creating custom role:', error);
            throw new Error('Failed to create custom role');
        }
    }
    
    // Update custom role
    async updateCustomRole(roleName, updates, tenantId = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }

            // Prevent modification of protected roles
            validateRoleCanBeModified(roleName);
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            const { displayName, description, permissions } = updates;
            
            if (permissions && !Array.isArray(permissions)) {
                throw new Error('Permissions must be an array');
            }
            
            let query = `UPDATE custom_roles SET `;
            let params = [];
            let setClauses = [];
            
            if (displayName !== undefined) {
                setClauses.push('display_name = ?');
                params.push(displayName);
            }
            if (description !== undefined) {
                setClauses.push('description = ?');
                params.push(description);
            }
            if (permissions !== undefined) {
                setClauses.push('permissions_json = ?');
                params.push(JSON.stringify(permissions));
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            setClauses.push('updated_at = ?');
            params.push(getCurrentTimestamp());
            
            query += setClauses.join(', ');
            query += ` WHERE name = ? AND tenant_id = ?`;
            params.push(roleName, actualTenantId);
            
            const result = await executeSingleQuery(this.db, query, params);
            return { changes: result.changes };
        } catch (error) {
            logger.error('Error updating custom role:', error);
            throw new Error('Failed to update custom role');
        }
    }
    
    // Delete custom role
    async deleteCustomRole(roleName, tenantId = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }

            // Prevent deletion of protected roles
            validateRoleCanBeDeleted(roleName);
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            return { changes: result.changes };
        } catch (error) {
            logger.error('Error deleting custom role:', error);
            throw new Error('Failed to delete custom role');
        }
    }
    
    // Check if role exists (system or custom)
    async roleExists(roleName, tenantId = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            // Check system roles first
            if (PermissionsManager.ROLE_TEMPLATES[roleName]) {
                return true;
            }
            
            // Check custom roles
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            
            const role = await executeQueryFirst(this.db, `
                SELECT COUNT(*) as count FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            return role.count > 0;
        } catch (error) {
            logger.error('Error checking if role exists:', error);
            throw new Error('Failed to check role existence');
        }
    }
}

module.exports = PermissionsManager;
