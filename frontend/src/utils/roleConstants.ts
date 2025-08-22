/**
 * Role-related constants and utilities
 */

export const PROTECTED_ROLES = {
  OWNER: 'owner',
} as const;

export const ROLE_PROTECTION_MESSAGES = {
  CANNOT_MODIFY: 'The Owner role cannot be modified to prevent accidental loss of system access',
  CANNOT_DELETE: 'The Owner role cannot be deleted to prevent accidental loss of system access',
  CANNOT_CREATE_DUPLICATE: 'Cannot create a role with the reserved name "owner"',
  PROTECTED_ROLE_LABEL: 'Owner Role (Protected)',
} as const;

/**
 * Check if a role is protected from modification
 */
export const isProtectedRole = (roleName: string): boolean => {
  return roleName.toLowerCase() === PROTECTED_ROLES.OWNER;
};

/**
 * Get the appropriate button text for role editing
 */
export const getEditButtonText = (roleName: string, canEditRoles: boolean): string => {
  if (isProtectedRole(roleName)) {
    return ROLE_PROTECTION_MESSAGES.PROTECTED_ROLE_LABEL;
  }
  
  return canEditRoles ? 'Edit Permissions' : 'Edit Permissions (No Permission)';
};
