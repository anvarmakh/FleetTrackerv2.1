/**
 * Permissions Manager
 * Handles role-based permissions and access control
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const BaseManager = require('./baseManager');

class PermissionsManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // PERMISSION DEFINITIONS
    // ============================================================================
    
    // Define available permissions - resource-specific with clean names
    static PERMISSIONS = {
        // User Management
        USERS_VIEW: 'users_view',
        USERS_CREATE: 'users_create',
        USERS_EDIT: 'users_edit',
        USERS_DELETE: 'users_delete',
        
        // Company Management
        COMPANIES_VIEW: 'companies_view',
        COMPANIES_CREATE: 'companies_create',
        COMPANIES_EDIT: 'companies_edit',
        COMPANIES_DELETE: 'companies_delete',
        
        // Cross-Company Access
        CROSS_COMPANY_ACCESS: 'cross_company_access',
        
        // Trailer Management
        TRAILERS_VIEW: 'trailers_view',
        TRAILERS_CREATE: 'trailers_create',
        TRAILERS_EDIT: 'trailers_edit',
        TRAILERS_DELETE: 'trailers_delete',
        
        // GPS Provider Management
        PROVIDERS_VIEW: 'providers_view',
        PROVIDERS_CREATE: 'providers_create',
        PROVIDERS_EDIT: 'providers_edit',
        PROVIDERS_DELETE: 'providers_delete',
        PROVIDERS_TEST: 'providers_test',
        
        // Location Management
        LOCATIONS_VIEW: 'locations_view',
        LOCATIONS_CREATE: 'locations_create',
        LOCATIONS_EDIT: 'locations_edit',
        LOCATIONS_DELETE: 'locations_delete',
        
        // Notes Management
        NOTES_VIEW: 'notes_view',
        NOTES_CREATE: 'notes_create',
        NOTES_EDIT: 'notes_edit',
        NOTES_DELETE: 'notes_delete',
        
        // Settings & Configuration
        SETTINGS_VIEW: 'settings_view',
        SETTINGS_EDIT: 'settings_edit',
        
        // Reports & Analytics
        REPORTS_VIEW: 'reports_view',
        REPORTS_EXPORT: 'reports_export',
        
        // Role Assignment
        ASSIGN_ADMIN_ROLES: 'assign_admin_roles'
    };

    // Define role permissions
    static ROLE_PERMISSIONS = {
        'owner': [
            // Full access to everything
            ...Object.values(PermissionsManager.PERMISSIONS)
        ],
        'admin': [
            // User Management
            PermissionsManager.PERMISSIONS.USERS_VIEW,
            PermissionsManager.PERMISSIONS.USERS_CREATE,
            PermissionsManager.PERMISSIONS.USERS_EDIT,
            PermissionsManager.PERMISSIONS.USERS_DELETE,
            
            // Company Management
            PermissionsManager.PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.PERMISSIONS.COMPANIES_CREATE,
            PermissionsManager.PERMISSIONS.COMPANIES_EDIT,
            PermissionsManager.PERMISSIONS.COMPANIES_DELETE,
            
            // Cross-Company Access
            PermissionsManager.PERMISSIONS.CROSS_COMPANY_ACCESS,
            
            // Trailer Management
            PermissionsManager.PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.PERMISSIONS.TRAILERS_CREATE,
            PermissionsManager.PERMISSIONS.TRAILERS_EDIT,
            PermissionsManager.PERMISSIONS.TRAILERS_DELETE,
            
            // GPS Provider Management
            PermissionsManager.PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.PERMISSIONS.PROVIDERS_CREATE,
            PermissionsManager.PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.PERMISSIONS.PROVIDERS_DELETE,
            PermissionsManager.PERMISSIONS.PROVIDERS_TEST,
            
            // Location Management
            PermissionsManager.PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.PERMISSIONS.LOCATIONS_CREATE,
            PermissionsManager.PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.PERMISSIONS.LOCATIONS_DELETE,
            
            // Notes Management
            PermissionsManager.PERMISSIONS.NOTES_VIEW,
            PermissionsManager.PERMISSIONS.NOTES_CREATE,
            PermissionsManager.PERMISSIONS.NOTES_EDIT,
            PermissionsManager.PERMISSIONS.NOTES_DELETE,
            
            // Settings & Configuration
            PermissionsManager.PERMISSIONS.SETTINGS_VIEW,
            PermissionsManager.PERMISSIONS.SETTINGS_EDIT,
            
            // Reports & Analytics
            PermissionsManager.PERMISSIONS.REPORTS_VIEW,
            PermissionsManager.PERMISSIONS.REPORTS_EXPORT
        ],
        'manager': [
            // User Management (limited)
            PermissionsManager.PERMISSIONS.USERS_VIEW,
            PermissionsManager.PERMISSIONS.USERS_CREATE,
            PermissionsManager.PERMISSIONS.USERS_EDIT,
            
            // Company Management (limited)
            PermissionsManager.PERMISSIONS.COMPANIES_VIEW,
            PermissionsManager.PERMISSIONS.COMPANIES_EDIT,
            
            // Trailer Management
            PermissionsManager.PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.PERMISSIONS.TRAILERS_CREATE,
            PermissionsManager.PERMISSIONS.TRAILERS_EDIT,
            PermissionsManager.PERMISSIONS.TRAILERS_DELETE,
            
            // GPS Provider Management (limited)
            PermissionsManager.PERMISSIONS.PROVIDERS_VIEW,
            PermissionsManager.PERMISSIONS.PROVIDERS_EDIT,
            PermissionsManager.PERMISSIONS.PROVIDERS_TEST,
            
            // Location Management
            PermissionsManager.PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.PERMISSIONS.LOCATIONS_CREATE,
            PermissionsManager.PERMISSIONS.LOCATIONS_EDIT,
            PermissionsManager.PERMISSIONS.LOCATIONS_DELETE,
            
            // Notes Management
            PermissionsManager.PERMISSIONS.NOTES_VIEW,
            PermissionsManager.PERMISSIONS.NOTES_CREATE,
            PermissionsManager.PERMISSIONS.NOTES_EDIT,
            PermissionsManager.PERMISSIONS.NOTES_DELETE,
            
            // Settings & Configuration (limited)
            PermissionsManager.PERMISSIONS.SETTINGS_VIEW,
            
            // Reports & Analytics
            PermissionsManager.PERMISSIONS.REPORTS_VIEW,
            PermissionsManager.PERMISSIONS.REPORTS_EXPORT
        ],
        'user': [
            // Basic viewing permissions
            PermissionsManager.PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.PERMISSIONS.NOTES_VIEW,
            PermissionsManager.PERMISSIONS.NOTES_CREATE,
            PermissionsManager.PERMISSIONS.REPORTS_VIEW
        ],
        'viewer': [
            // Read-only access
            PermissionsManager.PERMISSIONS.TRAILERS_VIEW,
            PermissionsManager.PERMISSIONS.LOCATIONS_VIEW,
            PermissionsManager.PERMISSIONS.NOTES_VIEW,
            PermissionsManager.PERMISSIONS.REPORTS_VIEW
        ]
    };

    // ============================================================================
    // STATIC PERMISSION METHODS
    // ============================================================================
    
    // Get permissions for a specific role
    static getPermissionsForRole(role) {
        if (!role) {
            console.log('getPermissionsForRole: role is null/undefined');
            return [];
        }
        
        const permissions = PermissionsManager.ROLE_PERMISSIONS[role];
        
        if (!permissions) {
            console.log('getPermissionsForRole: no permissions found for role:', role);
            return [];
        }
        
        if (!Array.isArray(permissions)) {
            console.log('getPermissionsForRole: permissions is not an array for role:', role, 'value:', permissions);
            return [];
        }
        
        return permissions;
    }

    // Check if a role has a specific permission
    static hasPermission(role, permission) {
        if (!role) {
            console.log('hasPermission: role is null/undefined');
            return false;
        }
        
        const rolePermissions = PermissionsManager.getPermissionsForRole(role);
        
        if (!Array.isArray(rolePermissions)) {
            console.log('hasPermission: rolePermissions is not an array for role:', role, 'value:', rolePermissions);
            return false;
        }
        
        return rolePermissions.includes(permission);
    }

    // Get all available roles
    static getAvailableRoles() {
        return Object.keys(PermissionsManager.ROLE_PERMISSIONS);
    }

    // Get all available permissions
    static getAllPermissions() {
        return Object.values(PermissionsManager.PERMISSIONS);
    }

    // Check if a user has cross-company access permission
    static hasCrossCompanyAccess(role) {
        return PermissionsManager.hasPermission(role, PermissionsManager.PERMISSIONS.CROSS_COMPANY_ACCESS);
    }

    // Get role description
    static getRoleDescription(role) {
        const descriptions = {
            'owner': 'System administrator with full access to all features and user management',
            'admin': 'Administrative access with user management and system configuration capabilities',
            'manager': 'Management access with limited user oversight and operational control',
            'user': 'Standard user access with basic fleet management capabilities',
            'viewer': 'Read-only access for viewing fleet data and reports'
        };
        return descriptions[role] || 'Custom role with specific permissions';
    }

    // Validate if a role can be assigned by a user with a given role
    static canAssignRole(assignerRole, targetRole) {
        // Check if the assigner has the assign_admin_roles permission
        const assignerPermissions = PermissionsManager.getPermissionsForRole(assignerRole);
        const hasAssignPermission = assignerPermissions.includes(PermissionsManager.PERMISSIONS.ASSIGN_ADMIN_ROLES);
        
        if (!hasAssignPermission) {
            return false;
        }
        
        // Define role hierarchy for assignment
        const roleHierarchy = {
            'owner': ['owner', 'admin', 'manager', 'user'],
            'admin': ['admin', 'manager', 'user'],
            'manager': ['manager', 'user'],
            'user': []
        };
        
        return roleHierarchy[assignerRole]?.includes(targetRole) || false;
    }

    // Get roles that can be assigned by a specific role
    static getAssignableRoles(role) {
        // Check if the role has the assign_admin_roles permission
        const rolePermissions = PermissionsManager.getPermissionsForRole(role);
        const hasAssignPermission = rolePermissions.includes(PermissionsManager.PERMISSIONS.ASSIGN_ADMIN_ROLES);
        
        if (!hasAssignPermission) {
            return [];
        }
        
        // Define role hierarchy for assignment
        const roleHierarchy = {
            'owner': ['owner', 'admin', 'manager', 'user'],
            'admin': ['admin', 'manager', 'user'],
            'manager': ['manager', 'user'],
            'user': []
        };
        
        return roleHierarchy[role] || [];
    }

    // ============================================================================
    // DATABASE-DRIVEN PERMISSION METHODS
    // ============================================================================
    
    // Get all available roles including custom roles
    async getAllRoles(tenant_id = null) {
        try {
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            // Get system roles
            const systemRoles = Object.keys(PermissionsManager.ROLE_PERMISSIONS);
            
            // Get custom roles from database
            const customRoles = await executeQuery(this.db, `
                SELECT name, display_name, description, permissions_json
                FROM custom_roles
                WHERE tenant_id = ?
                ORDER BY created_at DESC
            `, [actualTenantId]);
            
            const processedCustomRoles = customRoles.map(row => ({
                name: row.name,
                displayName: row.display_name,
                description: row.description,
                permissions: JSON.parse(row.permissions_json),
                isCustom: true
            }));

            // Get system role permission overrides
            const systemRoleOverrides = await executeQuery(this.db, `
                SELECT role_name, permissions_json
                FROM custom_role_permissions
                WHERE tenant_id = ? AND role_name IN (${systemRoles.map(() => '?').join(',')})
            `, [actualTenantId, ...systemRoles]);
            
            const overrideMap = new Map();
            systemRoleOverrides.forEach(row => {
                overrideMap.set(row.role_name, JSON.parse(row.permissions_json));
            });

            // Combine system and custom roles
            const allRoles = [
                ...systemRoles.map(role => ({
                    name: role,
                    displayName: role.charAt(0).toUpperCase() + role.slice(1),
                    description: PermissionsManager.getRoleDescription(role),
                    permissions: overrideMap.has(role) ? overrideMap.get(role) : PermissionsManager.getPermissionsForRole(role),
                    isCustom: false
                })),
                ...processedCustomRoles
            ];

            return allRoles;
        } catch (error) {
            console.error('Error getting all roles:', error);
            throw new Error('Failed to retrieve roles');
        }
    }

    // Get permissions for a role (including custom roles)
    async getPermissionsForRoleAsync(roleName, tenant_id = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            // First check if it's a custom role
            const customRole = await executeQueryFirst(this.db, `
                SELECT permissions_json FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            if (customRole) {
                // Custom role found
                return JSON.parse(customRole.permissions_json);
            }
            
            // Check for custom role permissions override
            const overrideRole = await executeQueryFirst(this.db, `
                SELECT permissions_json FROM custom_role_permissions WHERE role_name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            if (overrideRole) {
                // Override found
                return JSON.parse(overrideRole.permissions_json);
            }
            
            // Use default system permissions
            return PermissionsManager.ROLE_PERMISSIONS[roleName] || [];
        } catch (error) {
            console.error('Error getting permissions for role:', error);
            throw new Error('Failed to retrieve role permissions');
        }
    }

    // Create custom role
    async createCustomRole(name, displayName, description, permissions, tenant_id = null) {
        try {
            if (!name || !displayName || !permissions) {
                throw new Error('Role name, display name, and permissions are required');
            }
            
            if (!Array.isArray(permissions)) {
                throw new Error('Permissions must be an array');
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            const roleId = generateId('role');
            const timestamp = getCurrentTimestamp();

            const result = await this.executeSingleQuery(this.db, `
                INSERT INTO custom_roles (
                    id, name, display_name, description, permissions_json, tenant_id, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [roleId, name, displayName, description, JSON.stringify(permissions), actualTenantId, timestamp]);
            
            return { id: roleId, changes: result.changes };
        } catch (error) {
            console.error('Error creating custom role:', error);
            throw new Error('Failed to create custom role');
        }
    }

    // Update custom role
    async updateCustomRole(roleName, updates, tenant_id = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
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
            console.error('Error updating custom role:', error);
            throw new Error('Failed to update custom role');
        }
    }

    // Delete custom role
    async deleteCustomRole(roleName, tenant_id = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting custom role:', error);
            throw new Error('Failed to delete custom role');
        }
    }

    // Get custom role by name
    async getCustomRoleByName(roleName, tenant_id = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            const role = await executeQueryFirst(this.db, `
                SELECT name, display_name, description, permissions_json, created_at, updated_at
                FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            if (!role) {
                return null;
            }
            
            return {
                name: role.name,
                displayName: role.display_name,
                description: role.description,
                permissions: JSON.parse(role.permissions_json),
                isCustom: true,
                createdAt: role.created_at,
                updatedAt: role.updated_at
            };
        } catch (error) {
            console.error('Error getting custom role by name:', error);
            throw new Error('Failed to retrieve custom role');
        }
    }

    // Check if role exists (system or custom)
    async roleExists(roleName, tenant_id = null) {
        try {
            if (!roleName) {
                throw new Error('Role name is required');
            }
            
            // Check system roles first
            if (PermissionsManager.ROLE_PERMISSIONS[roleName]) {
                return true;
            }
            
            // Check custom roles
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenant_id || defaultTenantId;
            
            const role = await executeQueryFirst(this.db, `
                SELECT COUNT(*) as count FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);
            
            return role.count > 0;
        } catch (error) {
            console.error('Error checking if role exists:', error);
            throw new Error('Failed to check role existence');
        }
    }

    // Validate permissions against available permissions
    validatePermissions(permissions) {
        if (!Array.isArray(permissions)) {
            throw new Error('Permissions must be an array');
        }
        
        const availablePermissions = Object.values(PermissionsManager.PERMISSIONS);
        const invalidPermissions = permissions.filter(permission => !availablePermissions.includes(permission));
        
        if (invalidPermissions.length > 0) {
            throw new Error(`Invalid permissions: ${invalidPermissions.join(', ')}`);
        }
        
        return true;
    }
}

module.exports = PermissionsManager;
