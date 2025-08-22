/**
 * Role-related constants and utilities for backend
 */

const PROTECTED_ROLES = {
    OWNER: 'owner',
};

const ROLE_PROTECTION_MESSAGES = {
    CANNOT_MODIFY: 'The Owner role cannot be modified to prevent accidental loss of system access',
    CANNOT_DELETE: 'The Owner role cannot be deleted to prevent accidental loss of system access',
    CANNOT_CREATE_DUPLICATE: 'Cannot create a role with the reserved name "owner"',
};

/**
 * Check if a role is protected from modification
 * @param {string} roleName - The role name to check
 * @returns {boolean} True if the role is protected
 */
const isProtectedRole = (roleName) => {
    return roleName && roleName.toLowerCase() === PROTECTED_ROLES.OWNER;
};

/**
 * Validate that a role can be modified
 * @param {string} roleName - The role name to validate
 * @throws {Error} If the role is protected
 */
const validateRoleCanBeModified = (roleName) => {
    if (isProtectedRole(roleName)) {
        throw new Error(ROLE_PROTECTION_MESSAGES.CANNOT_MODIFY);
    }
};

/**
 * Validate that a role can be deleted
 * @param {string} roleName - The role name to validate
 * @throws {Error} If the role is protected
 */
const validateRoleCanBeDeleted = (roleName) => {
    if (isProtectedRole(roleName)) {
        throw new Error(ROLE_PROTECTION_MESSAGES.CANNOT_DELETE);
    }
};

/**
 * Validate that a role name can be used for creation
 * @param {string} roleName - The role name to validate
 * @throws {Error} If the role name is reserved
 */
const validateRoleCanBeCreated = (roleName) => {
    if (isProtectedRole(roleName)) {
        throw new Error(ROLE_PROTECTION_MESSAGES.CANNOT_CREATE_DUPLICATE);
    }
};

module.exports = {
    PROTECTED_ROLES,
    ROLE_PROTECTION_MESSAGES,
    isProtectedRole,
    validateRoleCanBeModified,
    validateRoleCanBeDeleted,
    validateRoleCanBeCreated,
};
