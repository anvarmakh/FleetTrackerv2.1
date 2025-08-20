/**
 * User Manager
 * Handles all user-related database operations with enhanced error handling and validation
 */

const crypto = require('crypto');
const encryptionUtil = require('../../utils/encryption');
const {
    generateId,
    getCurrentTimestamp,
    formatDateForDB,
    parseDateFromDB,
    executeQuery,
    executeSingleQuery,
    executeQueryFirst,
    executeQueryFirstCamelCase,
    executeQueryCamelCase,
    executeInTransaction,
    buildWhereClause,
    buildOrderByClause,
    buildLimitClause
} = require('../utils/db-helpers');
const { USER_ROLES, VALIDATION_RULES, CACHE_KEYS } = require('../../utils/constants');
const BaseManager = require('./baseManager');
const { normalizePagination, buildPaginationClause, createPaginatedResponse, getDefaultPaginationForType } = require('../../utils/pagination');
const cacheService = require('../../services/cache-service');

class UserManager extends BaseManager {
    constructor(db) {
        super(db);
    }

    /**
     * Get user profile by ID with caching
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User profile or null if not found
     */
    async getUserProfile(userId) {
        return cacheService.cached(
            `${CACHE_KEYS.USER_PROFILE}:${userId}`,
            () => this.getEntityById('users', userId),
            null,
            300 // 5 minutes cache
        );
    }

    /**
     * Update user password
     * @param {string} userId - User ID
     * @param {string} hashedPassword - Hashed password
     * @returns {Promise<Object>} Update result
     */
    async updateUserPassword(userId, hashedPassword) {
        return this.transact(async (tx) => {
            if (!userId || !hashedPassword) {
                throw new Error('User ID and hashed password are required');
            }

            const result = await executeSingleQuery(tx, `
                UPDATE users 
                SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND is_active = 1
            `, [hashedPassword, userId]);

            if (result.changes === 0) {
                throw new Error('User not found or not active');
            }

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Create password reset token
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Token information
     */
    async createPasswordResetToken(userId) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const tokenId = `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const token = crypto.randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

            await executeSingleQuery(tx, `
                INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
                VALUES (?, ?, ?, ?)
            `, [tokenId, userId, token, formatDateForDB(expiresAt)]);

            return { tokenId, token, expiresAt };
        });
    }

    /**
     * Validate password reset token
     * @param {string} token - Reset token
     * @returns {Promise<Object|null>} Token data or null if invalid
     */
    async validatePasswordResetToken(token) {
        return this.execute(
            `
                SELECT prt.*, u.email, u.first_name, u.last_name
                FROM password_reset_tokens prt
                JOIN users u ON prt.user_id = u.id
                WHERE prt.token = ? AND prt.expires_at > CURRENT_TIMESTAMP AND prt.used = 0
            `,
            [token],
            { first: true }
        );
    }

    /**
     * Mark password reset token as used
     * @param {string} tokenId - Token ID
     * @returns {Promise<Object>} Update result
     */
    async markPasswordResetTokenUsed(tokenId) {
        return this.transact(async (tx) => {
            if (!tokenId) {
                throw new Error('Token ID is required');
            }

            const result = await executeSingleQuery(tx, `
                UPDATE password_reset_tokens 
                SET used = 1, used_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [tokenId]);

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Clean up expired password reset tokens
     * @returns {Promise<Object>} Cleanup result
     */
    async cleanupExpiredResetTokens() {
        return this.transact(async (tx) => {
            const result = await executeSingleQuery(tx, `
                DELETE FROM password_reset_tokens 
                WHERE expires_at < CURRENT_TIMESTAMP OR used = 1
            `);

            return { success: true, deleted: result.changes };
        });
    }

    /**
     * Check if email exists
     * @param {string} email - Email address
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<boolean>} True if email exists
     */
    async emailExists(email, tenantId = null) {
        return this.execute(
            `
                SELECT id FROM users WHERE email = ? AND is_active = 1
            `,
            [email.toLowerCase()],
            { first: true }
        );
    }

    /**
     * Create user with tenant support
     * @param {Object} userData - User data object
     * @returns {Promise<Object>} Created user data
     */
    async createUserWithTenant(userData) {
        return this.transact(async (db) => {
            const {
                firstName, lastName, email, password, tenantId = null,
                tenantName = null, organizationRole = USER_ROLES.USER, phone = null,
                timezone = 'UTC', language = 'en'
            } = userData;

            // Validate required fields
            if (!firstName || !lastName || !email || !password) {
                throw new Error('First name, last name, email, and password are required');
            }

            // Check if email already exists INSIDE transaction to prevent race conditions
            const existingUser = await executeQueryFirst(db, `
                SELECT id FROM users WHERE email = ? AND is_active = 1
            `, [email.toLowerCase()]);
            
            if (existingUser) {
                throw new Error('Email already registered');
            }

            // Determine tenant ID
            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const finalTenantId = tenantId || defaultTenantId;

            // Create tenant if it doesn't exist
            const tenantExists = await executeQueryFirst(db, `
                SELECT id FROM tenants WHERE id = ?
            `, [finalTenantId]);

            if (!tenantExists) {
                const finalTenantName = tenantName || `Tenant for ${finalTenantId}`;
                await executeSingleQuery(db, `
                    INSERT INTO tenants (id, name, created_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                `, [finalTenantId, finalTenantName]);
            }

            // Password is already hashed from the route, use it directly
            const hashedPassword = password;

            // Generate user ID
            const userId = generateId('user');

            // Insert user
            // Note: Database should have UNIQUE constraint on email as backup protection
            await executeSingleQuery(db, `
                INSERT INTO users (
                    id, tenant_id, email, password_hash, first_name, last_name,
                    organization_role, created_at, is_active
                ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 1)
            `, [userId, finalTenantId, email.toLowerCase(), hashedPassword, firstName, lastName, organizationRole]);

            // Return user data (without password)
            return {
                id: userId,
                email: email.toLowerCase(),
                firstName,
                lastName,
                tenantId: finalTenantId,
                organizationRole,
                phone,
                timezone,
                language,
                createdAt: new Date()
            };
        });
    }

    /**
     * Authenticate user
     * @param {string} email - Email address
     * @param {string} password - Plain text password
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Object|null>} User data or null if authentication fails
     */
    async authenticateUser(email, password, tenantId = null) {
        // Authenticating user with optional tenant validation
        
        // Fetch user with password hash
        const userRecord = await this.execute(
            `
                SELECT id, email, password_hash, first_name, last_name, tenant_id,
                       organization_role, is_active
                FROM users
                WHERE email = ? AND is_active = 1
            `,
            [email.toLowerCase()],
            { camelCase: true, first: true }
        );

        if (!userRecord) {
            return null;
        }

        // Optional tenant check if provided by client flow - case insensitive
        if (tenantId && userRecord.tenantId && userRecord.tenantId.toLowerCase() !== tenantId.toLowerCase()) {
            return null;
        }

        // Verify password using encryption utility (bcrypt)
        console.log(`🔐 Verifying password for user: ${userRecord.email}`);
        const isPasswordValid = await encryptionUtil.comparePassword(password, userRecord.passwordHash);
        if (!isPasswordValid) {
            return null;
        }

        console.log(`✅ Password verified successfully for user: ${userRecord.email}`);

        // Update last login timestamp
        await this.execute(
            `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`,
            [userRecord.id]
        );

        // Return sanitized user object (without password hash)
        return {
            id: userRecord.id,
            email: userRecord.email,
            firstName: userRecord.firstName,
            lastName: userRecord.lastName,
            tenantId: userRecord.tenantId,
            organizationRole: userRecord.organizationRole,
            isActive: true
        };
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updates - Update data
     * @returns {Promise<Object>} Update result
     */
    async updateUserProfile(userId, updates) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const { firstName, lastName, email, phone, timezone, language } = updates;

            // Check if email is being updated and if it's already in use by another user
            if (email) {
                const existingUser = await executeQueryFirst(tx, `
                    SELECT id FROM users WHERE email = ? AND id != ? AND is_active = 1
                `, [email.toLowerCase(), userId]);
                
                if (existingUser) {
                    throw new Error('Email is already in use by another user');
                }
            }

            console.log(`🔍 Updating user profile for user ${userId}:`, { firstName, lastName, email, phone, timezone, language });
            
            const userUpdates = { first_name: firstName, last_name: lastName, email: email?.toLowerCase(), phone, timezone, language };
            const result = await this.updateEntity('users', userId, userUpdates);
            
            // Invalidate user profile cache
            cacheService.delete(`${CACHE_KEYS.USER_PROFILE}:${userId}`);
            
            console.log(`✅ User profile update result:`, { changes: result.changes, userId });

            return result;
        });
    }



    /**
     * Get all active users with pagination
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of users per page
     * @param {number} pagination.offset - Number of users to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with users and pagination metadata
     */
    async getAllActiveUsers(pagination = {}) {
        // Get default pagination settings for users
        const defaultSettings = getDefaultPaginationForType('users');
        const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });
        
        const { whereClause, whereParams, orderBy } = this.buildQueryParts({}, { 
            sort: { created_at: 'DESC' }, 
            allowedOrderFields: ['created_at','email','first_name','last_name','last_login'],
            allowedFields: ['email', 'first_name', 'last_name', 'tenant_id', 'organization_role', 'is_active']
        });
        const finalWhere = this.appendCommonConditions(whereClause || '');
        
        // Build count query for total items
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            ${finalWhere ? 'WHERE ' + finalWhere : ''}
        `;
        
        // Build data query with pagination
        const dataQuery = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                   u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active
            FROM users u
            ${finalWhere ? 'WHERE ' + finalWhere : ''}
            ${orderBy}
            LIMIT ? OFFSET ?
        `;
        
        // Execute both queries
        const [totalResult, users] = await Promise.all([
            this.execute(countQuery, whereParams, { first: true }),
            this.execute(dataQuery, [...whereParams, normalizedPagination.limit, normalizedPagination.offset], { camelCase: true })
        ]);
        
        const totalCount = totalResult.total;
        
        return createPaginatedResponse(users, normalizedPagination, totalCount);
    }

    /**
     * Get users by tenant with pagination
     * @param {string} tenantId - Tenant ID
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of users per page
     * @param {number} pagination.offset - Number of users to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with users and pagination metadata
     */
    async getUsersByTenant(tenantId, pagination = {}) {
        if (!tenantId) {
            throw new Error('Tenant ID is required');
        }
        
        // Get default pagination settings for users
        const defaultSettings = getDefaultPaginationForType('users');
        const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });
        
        // Build count query for total items (all users)
        const countQuery = `
            SELECT COUNT(*) as total
            FROM users u
            LEFT JOIN user_company_preferences ucp ON u.id = ucp.user_id
            LEFT JOIN companies c ON ucp.active_company_id = c.id
            WHERE u.tenant_id = ?
        `;
        
        // Build data query with pagination (all users)
        const dataQuery = `
            SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                   u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active,
                   ucp.active_company_id as companyId,
                   c.name as companyName
            FROM users u
            LEFT JOIN user_company_preferences ucp ON u.id = ucp.user_id
            LEFT JOIN companies c ON ucp.active_company_id = c.id
            WHERE u.tenant_id = ?
            ORDER BY u.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        // Execute both queries
        const [totalResult, users] = await Promise.all([
            executeQueryFirst(this.db, countQuery, [tenantId]),
            executeQueryCamelCase(this.db, dataQuery, [tenantId, normalizedPagination.limit, normalizedPagination.offset])
        ]);
        
        const totalCount = totalResult.total;
        
        // Process user data for consistent format
        const processedUsers = this.processUsersData(users);
        
        return createPaginatedResponse(processedUsers, normalizedPagination, totalCount);
    }

    /**
     * Process user data to ensure consistent format
     * @param {Object} user - Raw user data from database
     * @returns {Object} Processed user data
     */
    processUserData(user) {
        if (!user) return user;
        
        return {
            ...user,
            isActive: Boolean(user.isActive),
            lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString() : null
        };
    }

    /**
     * Process array of user data
     * @param {Array} users - Array of raw user data from database
     * @returns {Array} Array of processed user data
     */
    processUsersData(users) {
        if (!Array.isArray(users)) return users;
        
        return users.map(user => this.processUserData(user));
    }

    /**
     * Get user by email
     * @param {string} email - Email address
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserByEmail(email) {
        const user = await this.execute(
            `
                SELECT id, email, first_name, last_name, phone, timezone, language,
                       tenant_id, organization_role, created_at, last_login, is_active
                FROM users 
                WHERE email = ? AND is_active = 1
            `,
            [email.toLowerCase()],
            { first: true }
        );
        
        return this.processUserData(user);
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getUserById(userId) {
        // Custom query with joins, so keep as is, but could wrap in execute
        const user = await this.execute(
            `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                       u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active,
                       ucp.active_company_id as company_id,
                       c.name as company_name
                FROM users u
                LEFT JOIN user_company_preferences ucp ON u.id = ucp.user_id
                LEFT JOIN companies c ON ucp.active_company_id = c.id
                WHERE u.id = ? AND u.is_active = 1
            `,
            [userId],
            { first: true, camelCase: true }
        );
        
        return this.processUserData(user);
    }

    /**
     * Get user with password for authentication purposes
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object with password or null
     */
    async getUserWithPassword(userId) {
        return this.execute(
            `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                       u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active, u.password_hash
                FROM users u
                WHERE u.id = ?
            `,
            [userId],
            { first: true }
        );
    }

    /**
     * Get inactive user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getInactiveUserById(userId) {
        return this.execute(
            `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                       u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active,
                       ucp.active_company_id as company_id,
                       c.name as company_name
                FROM users u
                LEFT JOIN user_company_preferences ucp ON u.id = ucp.user_id
                LEFT JOIN companies c ON ucp.active_company_id = c.id
                WHERE u.id = ? AND u.is_active = 0
            `,
            [userId],
            { first: true, camelCase: true }
        );
    }

    /**
     * Get active user by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} User object or null
     */
    async getActiveUserById(userId) {
        return this.execute(
            `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                       u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active,
                       ucp.active_company_id as company_id,
                       c.name as company_name
                FROM users u
                LEFT JOIN user_company_preferences ucp ON u.id = ucp.user_id
                LEFT JOIN companies c ON ucp.active_company_id = c.id
                WHERE u.id = ? AND u.is_active = 1
            `,
            [userId],
            { first: true }
        );
    }

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {Object} updates - Update data
     * @returns {Promise<Object>} Update result
     */
    async updateUser(userId, updates) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const { firstName, lastName, email, phone, organizationRole, companyId } = updates;

            console.log(`🔍 Updating user ${userId} with data:`, { firstName, lastName, email, phone, organizationRole, companyId });

            // Update user basic info (company_id doesn't exist in users table)
            const result = await executeSingleQuery(tx, `
                UPDATE users 
                SET first_name = ?, last_name = ?, email = ?, phone = ?, organization_role = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [firstName, lastName, email, phone, organizationRole, userId]);

            // Handle company association through user_company_preferences table
            if (companyId !== undefined) {
                // Check if user has existing preferences
                const existingPrefs = await executeQueryFirst(tx, `
                    SELECT id FROM user_company_preferences WHERE user_id = ?
                `, [userId]);

                if (existingPrefs) {
                    // Update existing preferences
                    await executeSingleQuery(tx, `
                        UPDATE user_company_preferences 
                        SET active_company_id = ?, updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = ?
                    `, [companyId, userId]);
                } else {
                    // Create new preferences
                    await executeSingleQuery(tx, `
                        INSERT INTO user_company_preferences (id, user_id, active_company_id)
                        VALUES (?, ?, ?)
                    `, [`pref_${userId}`, userId, companyId]);
                }
            }

            if (result.changes === 0) {
                throw new Error('User not found');
            }

            // Return the updated user data (try active first, then inactive)
            let updatedUser = await this.getUserById(userId);
            if (!updatedUser) {
                updatedUser = await this.getInactiveUserById(userId);
            }
            return updatedUser;
        });
    }

    /**
     * Delete user (soft delete)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Delete result
     */
    async deleteUser(userId) {
        return this.deleteEntity('users', userId, true); // Soft delete
    }

    /**
     * Hard delete user (permanent deletion)
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Delete result
     */
    async hardDeleteUser(userId) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            // Hard delete user
            const result = await executeSingleQuery(tx, `
                DELETE FROM users WHERE id = ?
            `, [userId]);

            if (result.changes === 0) {
                throw new Error('User not found');
            }

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Deactivate user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Deactivate result
     */
    async deactivateUser(userId) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            console.log(`🔍 Attempting to deactivate user with ID: ${userId}`);
            
            // First, let's check if the user exists and their current status
            const userCheck = await executeQueryFirst(tx, `
                SELECT id, email, is_active FROM users WHERE id = ?
            `, [userId]);
            
            if (!userCheck) {
                console.log(`❌ User with ID ${userId} not found in database`);
                throw new Error('User not found');
            }
            
            console.log(`📊 User ${userCheck.email} (ID: ${userCheck.id}) current status: is_active = ${userCheck.is_active}`);
            
            if (userCheck.is_active === 0) {
                console.log(`⚠️ User ${userCheck.email} (ID: ${userCheck.id}) is already inactive`);
                throw new Error('User already deactivated');
            }

            const result = await executeSingleQuery(tx, `
                UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND is_active = 1
            `, [userId]);

            if (result.changes === 0) {
                console.log(`❌ No rows updated for user ${userId} - user may have been modified by another process`);
                throw new Error('User not found or already deactivated');
            }

            console.log(`✅ Successfully deactivated user ${userCheck.email} (ID: ${userCheck.id})`);
            return { success: true, changes: result.changes };
        });
    }

    /**
     * Activate user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Activate result
     */
    async activateUser(userId) {
        return this.transact(async (tx) => {
            if (!userId) {
                throw new Error('User ID is required');
            }

            const result = await executeSingleQuery(tx, `
                UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP
                WHERE id = ? AND is_active = 0
            `, [userId]);

            if (result.changes === 0) {
                throw new Error('User not found or already active');
            }

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Update role permissions
     * @param {string} roleName - Role name
     * @param {Array} permissions - Permissions array
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Object>} Update result
     */
    async updateRolePermissions(roleName, permissions, tenantId = null) {
        return this.transact(async (tx) => {
            if (!roleName || !permissions) {
                throw new Error('Role name and permissions are required');
            }

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;

            const result = await executeSingleQuery(tx, `
                INSERT OR REPLACE INTO custom_role_permissions (role_name, tenant_id, permissions_json, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [roleName, actualTenantId, JSON.stringify(permissions)]);

            return { success: true, message: 'Role permissions updated successfully' };
        });
    }

    /**
     * Create custom role
     * @param {string} name - Role name
     * @param {string} displayName - Display name
     * @param {string} description - Description
     * @param {Array} permissions - Permissions array
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Object>} Create result
     */
    async createCustomRole(name, displayName, description, permissions, tenantId = null) {
        return this.transact(async (tx) => {
            if (!name || !displayName || !permissions) {
                throw new Error('Name, display name, and permissions are required');
            }

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;
            const roleId = generateId();

            const result = await executeSingleQuery(tx, `
                INSERT INTO custom_roles (id, tenant_id, name, display_name, description, permissions_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [roleId, actualTenantId, name, displayName, description, JSON.stringify(permissions)]);

            return { success: true, message: 'Custom role created successfully' };
        });
    }

    /**
     * Delete custom role
     * @param {string} roleName - Role name
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Object>} Delete result
     */
    async deleteCustomRole(roleName, tenantId = null) {
        return this.transact(async (tx) => {
            if (!roleName) {
                throw new Error('Role name is required');
            }

            const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
            const actualTenantId = tenantId || defaultTenantId;

            // Check if role is in use
            const usageCheck = await executeQueryFirst(tx, `
                SELECT COUNT(*) as count FROM users 
                WHERE organization_role = ? AND is_active = 1
            `, [roleName]);

            if (usageCheck.count > 0) {
                throw new Error(`Cannot delete role: ${usageCheck.count} users are currently assigned to this role`);
            }

            const result = await executeSingleQuery(tx, `
                DELETE FROM custom_roles WHERE name = ? AND tenant_id = ?
            `, [roleName, actualTenantId]);

            if (result.changes === 0) {
                throw new Error('Role not found');
            }

            return { success: true, message: 'Custom role deleted successfully' };
        });
    }

    /**
     * Get custom roles
     * @param {string} tenantId - Tenant ID (optional)
     * @returns {Promise<Array>} Array of custom roles
     */
    async getCustomRoles(tenantId = null) {
        return this.execute(
            `
                SELECT id, name, display_name, description, permissions_json, created_at, updated_at
                FROM custom_roles
                WHERE tenant_id = ?
                ORDER BY created_at ASC
            `,
            [tenantId || process.env.DEFAULT_TENANT_ID || 'default'],
            { camelCase: true }
        );
    }

    /**
     * Get orphaned users (users without valid tenant)
     * @returns {Promise<Array>} Array of orphaned users
     */
    async getOrphanedUsers() {
        return this.execute(
            `
                SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.timezone, u.language,
                       u.tenant_id, u.organization_role, u.created_at, u.last_login, u.is_active
                FROM users u
                LEFT JOIN tenants t ON u.tenant_id = t.id
                WHERE t.id IS NULL
                ORDER BY u.created_at DESC
            `,
            [],
            { camelCase: true }
        );
    }
}

module.exports = UserManager;
