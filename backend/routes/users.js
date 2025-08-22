const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { 
    requirePermission, 
    requireRoleAssignmentPermission,
    getUserPermissions,
    getAssignableRoles 
} = require('../middleware/permissions');
const { userManager, companyManager, permissionsManager, PermissionsManager } = require('../database/database-manager');
const { validatePassword, ENCRYPTION_CONFIG } = require('../utils/security-config');
const { USER_ROLES, ROLE_HIERARCHY } = require('../utils/constants');
const { isValidEmail } = require('../utils/validation');
const encryptionUtil = require('../utils/encryption');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handling');
const { validateRoleCanBeModified, validateRoleCanBeDeleted, validateRoleCanBeCreated, ROLE_PROTECTION_MESSAGES } = require('../utils/role-constants');

const router = express.Router();

// ============================================================================
// USER PROFILE ROUTES
// ============================================================================

// Helper function to get roles with caching
let rolesCache = null;
let rolesCacheTimestamp = 0;
const ROLES_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getCachedRoles(tenantId) {
    const now = Date.now();
    if (rolesCache && (now - rolesCacheTimestamp) < ROLES_CACHE_DURATION) {
        return rolesCache;
    }
    
    rolesCache = await permissionsManager.getAllRoles(tenantId);
    rolesCacheTimestamp = now;
    return rolesCache;
}

// Clear roles cache when roles are modified
function clearRolesCache() {
    rolesCache = null;
    rolesCacheTimestamp = 0;
}

// Get user profile
router.get('/profile', authenticateToken, asyncHandler(async (req, res) => {
    const user = await userManager.getUserProfile(req.user.id);
    
    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }
    
    const responseData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        timezone: user.timezone,
        language: user.language,
        tenantId: user.tenantId,
        organizationRole: user.organizationRole
    };
    
    res.json({
        success: true,
        data: responseData
    });
}));

// Update user profile
router.put('/profile', authenticateToken, asyncHandler(async (req, res) => {
    // Trim and normalize input data
    const { firstName, lastName, email, phone, timezone, language } = req.body;
    
    // Validate required fields with trimming
    if (!firstName || !firstName.trim()) {
        return res.status(400).json({
            success: false,
            error: 'First name is required'
        });
    }
    
    if (!lastName || !lastName.trim()) {
        return res.status(400).json({
            success: false,
            error: 'Last name is required'
        });
    }

    // Validate email if provided using robust validation
    if (email && !isValidEmail(email.trim())) {
        return res.status(400).json({
            success: false,
            error: 'Invalid email format'
        });
    }

    const result = await userManager.updateUserProfile(req.user.id, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email ? email.trim() : email,
        phone: phone ? phone.trim() : phone,
        timezone: timezone ? timezone.trim() : timezone,
        language: language ? language.trim() : language
    });

    if (result.changes === 0) {
        return res.status(404).json({
            success: false,
            error: 'User not found'
        });
    }

    logger.info('User profile updated', { email: req.user.email });

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { firstName, lastName, email, phone, timezone, language }
    });
}));

// Get all users for the tenant
router.get('/', authenticateToken, requirePermission('users_view'), asyncHandler(async (req, res) => {
  // Validate that user has a tenant ID
  if (!req.user.tenantId) {
    return res.status(400).json({
      success: false,
      error: 'User tenant ID not found'
    });
  }

  const usersResponse = await userManager.getUsersByTenant(req.user.tenantId);
  
  res.json({
    success: true,
    users: usersResponse.data || []
  });
}));

// Get user permissions and assignable roles
router.get('/permissions', authenticateToken, asyncHandler(async (req, res) => {
  const userRole = req.user.organizationRole;
  const userPermissions = getUserPermissions(userRole);
  const assignableRoles = getAssignableRoles(userRole);
  const availableRoles = PermissionsManager.getAllRoles();
  
  res.json({
    success: true,
    data: {
      userRole,
      userPermissions,
      assignableRoles,
      availableRoles
    }
  });
}));

// Get permission structure for organization role management (owners, admins, managers)
router.get('/permission-structure', authenticateToken, requirePermission('users_view'), asyncHandler(async (req, res) => {
  try {
    const permissionGroups = PermissionsManager.getPermissionGroups();
    const roleTemplates = PermissionsManager.ROLE_TEMPLATES;
    const blockPermissions = PermissionsManager.BLOCK_PERMISSIONS;
    const granularPermissions = PermissionsManager.GRANULAR_PERMISSIONS;
    
    res.json({
      success: true,
      data: {
        permissionStructure: permissionGroups,
        roleTemplates,
        blockPermissions,
        granularPermissions
      }
    });
const logger = require('../utils/logger');

  } catch (error) {
    logger.error('Error getting permission structure:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get permission structure'
    });
  }
}));

// Get user permissions by user ID (for organization role management)
router.get('/:userId/permissions', authenticateToken, requirePermission('users_view'), asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if target user exists and is in same tenant
    const targetUser = await userManager.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (targetUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot access user from different tenant'
      });
    }
    
    // Check if user has permission to view this user's permissions
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, targetUser.organizationRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot view permissions for user with this role'
      });
    }
    
    const userPermissions = await permissionsManager.getUserPermissions(userId);
    
    res.json({
      success: true,
      data: {
        userId,
        permissions: userPermissions
      }
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user permissions'
    });
  }
}));

// Update user permissions (for organization role management)
router.put('/:userId/permissions', authenticateToken, requirePermission('users_edit'), asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const { blockPermissions = [], granularPermissions = [] } = req.body;
    
    // Check if target user exists and is in same tenant
    const targetUser = await userManager.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    if (targetUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify user from different tenant'
      });
    }
    
    // Check if user has permission to modify this user's permissions
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, targetUser.organizationRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify permissions for user with this role'
      });
    }
    
    const success = await permissionsManager.updateUserPermissions(userId, blockPermissions, granularPermissions);
    
    if (success) {
      res.json({
        success: true,
        message: 'User permissions updated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update user permissions'
      });
    }
  } catch (error) {
    logger.error('Error updating user permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user permissions'
    });
  }
}));


// Get all roles for the tenant
router.get('/roles', authenticateToken, requirePermission('roles_view'), asyncHandler(async (req, res) => {
  try {
    const allRoles = await getCachedRoles(req.user.tenantId);
    
    res.json({
      success: true,
      roles: allRoles
    });
  } catch (error) {
    logger.error('Error getting roles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get roles'
    });
  }
}));

// Get a specific user by ID
router.get('/:id', authenticateToken, requirePermission('users_view'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    // Validate that user has a tenant ID
    if (!req.user.tenantId) {
      return res.status(400).json({
        success: false,
        error: 'User tenant ID not found'
      });
    }

    // Get the user (including inactive users for admin access)
    let user = await userManager.getUserById(id);
    if (!user) {
      // Try to get inactive user if active user not found
      user = await userManager.getInactiveUserById(id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Check if user is in the same tenant
    if (user.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot access user from different tenant'
      });
    }


    
    res.json({
      success: true,
      user: user
    });
  } catch (error) {
    logger.error('Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}));

// Create a new user
router.post('/', authenticateToken, requirePermission('users_create'), asyncHandler(async (req, res) => {
  try {
    const { email, firstName, lastName, phone, role, companyName, password, tenantId, dotNumber } = req.body;

    // Validate required fields
    if (!email || !firstName || !lastName || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email, first name, last name, and password are required'
      });
    }

    // Validate role assignment permission
    const targetRole = role || USER_ROLES.USER;
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, targetRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot assign this role',
        targetRole: targetRole,
        userRole: req.user.organizationRole
      });
    }

    // Check if user already exists
    const existingUser = await userManager.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await encryptionUtil.hashPassword(password);

    // Determine tenant ID
    let targetTenantId = req.user.tenantId; // Default to current user's tenant
    
    // If tenant_id is provided and user is owner, use it
    if (tenantId && req.user.organizationRole === USER_ROLES.OWNER) {
      targetTenantId = tenantId;
    }

    // Create user
    const userData = {
      email,
      firstName,
      lastName,
      phone: phone || null,
      password: hashedPassword,
      tenantId: targetTenantId,
      organizationRole: targetRole,
      companyName: companyName || null
    };
    


    const newUser = await userManager.createUserWithTenant(userData);

    // Assign user to the first available company in the tenant
    let assignedCompany = null;
    try {
      const companies = await companyManager.getCompaniesByTenant(targetTenantId);
      if (companies && companies.length > 0) {
        // Assign user to the first company in the tenant
        assignedCompany = companies[0];
        await companyManager.assignUserToCompany(newUser.id, assignedCompany.id);
        logger.info(`User ${newUser.id} assigned to company ${assignedCompany.name} (${assignedCompany.id})`);
      } else {
        logger.warn(`No companies found in tenant ${targetTenantId} for user assignment`);
      }
    } catch (error) {
      logger.error('Could not assign user to company:', error.message);
    }

    if (newUser) {
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          organizationRole: newUser.organizationRole,
          tenantId: newUser.tenantId,
          companyId: assignedCompany ? assignedCompany.id : null,
          companyName: assignedCompany ? assignedCompany.name : null
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create user'
      });
    }
  } catch (error) {
    logger.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user: ' + error.message
    });
  }
}));

// Update a user
router.put('/:id', authenticateToken, requirePermission('users_edit'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, role, companyId } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'First name and last name are required'
      });
    }

    // Check if user exists (including inactive users for admin access)
    let existingUser = await userManager.getUserById(id);
    if (!existingUser) {
      // Try to get inactive user if active user not found
      existingUser = await userManager.getInactiveUserById(id);
      if (!existingUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }
    }

    // Check if user is in the same tenant
    if (existingUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify user from different tenant'
      });
    }

    // Validate role assignment permission if role is being changed
    if (role && role !== existingUser.organizationRole) {
      if (!PermissionsManager.canAssignRole(req.user.organizationRole, role)) {
        return res.status(403).json({
          success: false,
          error: 'Cannot assign this role',
          targetRole: role,
          userRole: req.user.organizationRole
        });
      }
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== existingUser.email) {
      const emailExists = await userManager.emailExists(email, req.user.tenantId);
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Email address is already in use'
        });
      }
    }

    // Update user
    const updateData = {
      firstName,
      lastName,
      email: email || existingUser.email,
      phone: phone || null,
      organizationRole: role || existingUser.organizationRole,
      companyId: companyId || existingUser.companyId
    };

    const updatedUser = await userManager.updateUser(id, updateData);

    if (updatedUser) {
      res.json({
        success: true,
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          organizationRole: updatedUser.organizationRole,
          tenantId: updatedUser.tenantId
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update user'
      });
    }
  } catch (error) {
    logger.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
}));

// Delete a user
router.delete('/:id', authenticateToken, requirePermission('users_delete'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await userManager.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is in the same tenant
    if (existingUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete user from different tenant'
      });
    }

    // Check if user is trying to delete themselves
    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete your own account'
      });
    }

    // Check if user has permission to delete this user
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, existingUser.organizationRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete user with this role',
        targetUserRole: existingUser.organizationRole,
        userRole: req.user.organizationRole
      });
    }

    // Hard delete user
    const deletedUser = await userManager.hardDeleteUser(id);

    if (deletedUser) {
      res.json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  } catch (error) {
    logger.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
}));

// Deactivate a user
router.patch('/:id/deactivate', authenticateToken, requirePermission('users_edit'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await userManager.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is in the same tenant
    if (existingUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot deactivate user from different tenant'
      });
    }

    // Check if user is trying to deactivate themselves
    if (existingUser.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot deactivate your own account'
      });
    }

    // Check if user has permission to deactivate this user
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, existingUser.organizationRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot deactivate user with this role',
        targetUserRole: existingUser.organizationRole,
        userRole: req.user.organizationRole
      });
    }

    // Deactivate user
    const deactivatedUser = await userManager.deactivateUser(id);

    if (deactivatedUser) {
      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to deactivate user'
      });
    }
  } catch (error) {
    logger.error('Error deactivating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate user'
    });
  }
}));

// Activate a user
router.patch('/:id/activate', authenticateToken, requirePermission('users_edit'), asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists (inactive users)
    const existingUser = await userManager.getInactiveUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is in the same tenant
    if (existingUser.tenantId !== req.user.tenantId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot activate user from different tenant'
      });
    }

    // Check if user has permission to activate this user
    if (!PermissionsManager.canAssignRole(req.user.organizationRole, existingUser.organizationRole)) {
      return res.status(403).json({
        success: false,
        error: 'Cannot activate user with this role',
        targetUserRole: existingUser.organizationRole,
        userRole: req.user.organizationRole
      });
    }

    // Activate user
    const activatedUser = await userManager.activateUser(id);

    if (activatedUser) {
      res.json({
        success: true,
        message: 'User activated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to activate user'
      });
    }
  } catch (error) {
    logger.error('Error activating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate user'
    });
  }
}));

// Update role permissions
router.put('/roles/:roleName', authenticateToken, requirePermission('roles_edit'), asyncHandler(async (req, res) => {
  try {
    const { roleName } = req.params;
    const { permissions } = req.body;

    if (!permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Permissions array is required'
      });
    }

    // Prevent modification of protected roles
    try {
      validateRoleCanBeModified(roleName);
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    const allRoles = await getCachedRoles(req.user.tenantId);
    const role = allRoles.find(role => role.name === roleName);

    if (!role) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    if (role.isCustom) {
      // Update custom role in custom_roles table
      await permissionsManager.updateCustomRole(roleName, { permissions }, req.user.tenantId);
    } else {
      // Update system role permissions in custom_role_permissions table
      await userManager.updateRolePermissions(roleName, permissions, req.user.tenantId);
    }
    
    clearRolesCache(); // Clear cache after role modification

    res.json({
      success: true,
      message: 'Role permissions updated successfully'
    });
  } catch (error) {
    logger.error('Error updating role permissions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update role permissions'
    });
  }
}));

// Create a new role
router.post('/roles', authenticateToken, requirePermission('roles_create'), asyncHandler(async (req, res) => {
  try {
    const { name, displayName, description, permissions } = req.body;

    if (!name || !displayName || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: 'Name, display name, and permissions array are required'
      });
    }

    // Prevent creating a role with reserved names
    try {
      validateRoleCanBeCreated(name);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }

    const allRoles = await getCachedRoles(req.user.tenantId);
    const roleExists = allRoles.some(role => role.name === name);

    if (roleExists) {
      return res.status(409).json({
        success: false,
        error: 'Role with this name already exists'
      });
    }

    await userManager.createCustomRole(name, displayName, description, permissions, req.user.tenantId);
    clearRolesCache(); // Clear cache after role creation

    res.status(201).json({
      success: true,
      message: 'Role created successfully'
    });
  } catch (error) {
    logger.error('Error creating role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create role'
    });
  }
}));

// Delete a role
router.delete('/roles/:roleName', authenticateToken, requirePermission('roles_delete'), asyncHandler(async (req, res) => {
  try {
    const { roleName } = req.params;

    // Prevent deletion of protected roles
    try {
      validateRoleCanBeDeleted(roleName);
    } catch (error) {
      return res.status(403).json({
        success: false,
        error: error.message
      });
    }

    const allRoles = await getCachedRoles(req.user.tenantId);
    const roleExists = allRoles.some(role => role.name === roleName);

    if (!roleExists) {
      return res.status(404).json({
        success: false,
        error: 'Role not found'
      });
    }

    await userManager.deleteCustomRole(roleName, req.user.tenantId);
    clearRolesCache(); // Clear cache after role deletion

    res.json({
      success: true,
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting role:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete role'
    });
  }
}));



// Change user password
router.put('/:id/password', authenticateToken, asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    // Validate password strength
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: passwordValidation.error
      });
    }

    // Get user
    const user = await userManager.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check if user is changing their own password or has permission
    // Only allow self-change, or if caller has users_edit permission
    const userPermissions = await permissionsManager.getUserPermissions(req.user.id);
    const canEditUsers = PermissionsManager.hasPermission(userPermissions, 'users_edit');
    if (user.id !== req.user.id && !canEditUsers) {
      return res.status(403).json({
        success: false,
        error: 'Cannot change password for other users'
      });
    }

    // Verify current password
    // Fetch password hash using dedicated method
    const userWithPassword = await userManager.getUserWithPassword(id);
    if (!userWithPassword || !userWithPassword.passwordHash) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    const isValidPassword = await encryptionUtil.comparePassword(currentPassword, userWithPassword.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await encryptionUtil.hashPassword(newPassword);

    // Update password
    await userManager.updateUserPassword(id, hashedPassword);

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password'
    });
  }
}));

// Helper functions
function getRolesThatCanAssign(targetRole) {
    return ROLE_HIERARCHY[targetRole] || [];
}

function getPermissionCategories() {
  return {
    userManagement: {
      title: 'User Management',
      permissions: ['users_view', 'users_create', 'users_edit', 'users_delete']
    },
    companyManagement: {
      title: 'Company Management',
              permissions: ['companies_view', 'companies_create', 'companies_edit', 'companies_delete', 'companies_switch']
    },
    trailerManagement: {
      title: 'Trailer Management',
      permissions: ['trailers_view', 'trailers_create', 'trailers_edit', 'trailers_delete']
    },
    providerManagement: {
      title: 'Provider Management',
      permissions: ['providers_view', 'providers_create', 'providers_edit', 'providers_delete', 'providers_test']
    }
  };
}

module.exports = router; 
