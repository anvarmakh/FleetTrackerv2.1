const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { userManager, companyManager } = require('../database/database-manager');
const { validatePassword, ENCRYPTION_CONFIG } = require('../utils/security-config');
const emailService = require('../services/emailService');
const encryptionUtil = require('../utils/encryption');
const jwtSecurityService = require('../services/jwt-security');
const logger = require('../utils/logger');

const router = express.Router();

// Rate limiting for auth endpoints (centralized)
const { loginLimiter, adminLoginLimiter } = require('../middleware/rate-limit');

// Import JWT_SECRET and authenticateToken from middleware to ensure consistency
const { JWT_SECRET, authenticateToken } = require('../middleware/auth');

// Login route with enhanced security
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { email, password, tenantId } = req.body;
        
        console.log(`🔐 Login attempt for email: ${email}, tenantId: ${tenantId}`);
        
        if (!email || !password) {
            console.log(`❌ Missing credentials: email=${!!email}, password=${!!password}`);
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }
        
        const user = await userManager.authenticateUser(email, password, tenantId);
        
        if (!user) {
            logger.warn(`Failed login attempt: ${email}`);
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // Get user's active company
        let activeCompany = null;
        try {
            activeCompany = await companyManager.getActiveCompany(user.id, user.tenantId);
        } catch (error) {
            logger.warn(`Could not get active company for user ${user.id}:`, error.message);
            // Continue without active company - user can still login
        }
        
        // Create user data for token
        const userData = {
            id: user.id, 
            email: user.email, 
            firstName: user.firstName, 
            lastName: user.lastName,
            tenantId: user.tenantId,
            companyId: activeCompany ? activeCompany.id : null,
            organizationRole: user.organizationRole
        };

        // Generate enhanced access token with fingerprinting
        const { token: accessToken, tokenId } = jwtSecurityService.createAccessToken(userData, req);
        
        // Generate refresh token
        const { refreshToken } = jwtSecurityService.createRefreshToken(user.id, req);
        
        const responseData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenantId: user.tenantId,
            companyId: activeCompany ? activeCompany.id : null,
            organizationRole: user.organizationRole
        };

        logger.warn('User login successful', { 
            userId: user.id, 
            email: user.email,
            tokenId 
        });

        res.json({
            success: true,
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: responseData
        });
        
    } catch (error) {
        logger.error('Login failed', error, { endpoint: '/api/auth/login' });
        res.status(500).json({ 
            success: false, 
            error: 'Login failed: ' + error.message 
        });
    }
});

// Refresh token route
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: 'Refresh token is required'
            });
        }

        // Use JWT security service to refresh tokens
        const result = await jwtSecurityService.refreshAccessToken(refreshToken, req);
        
        logger.info('Token refresh successful', { 
            userId: result.user.id 
        });

        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
            user: result.user
        });
        
    } catch (error) {
        logger.warn('Token refresh failed', { error: error.message });
        res.status(401).json({
            success: false,
            error: error.message || 'Token refresh failed'
        });
    }
});

// Logout route with token revocation
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.substring(7);
        const { refreshToken } = req.body;
        
        // Revoke access token
        if (token) {
            jwtSecurityService.revokeAccessToken(token);
        }
        
        // Revoke refresh token if provided
        if (refreshToken) {
            jwtSecurityService.revokeRefreshToken(refreshToken);
        }
        
        logger.info('User logout successful', { 
            userId: req.user.id,
            email: req.user.email 
        });

        res.json({
            success: true,
            message: 'Logout successful'
        });
        
    } catch (error) {
        logger.error('Logout failed', error);
        res.status(500).json({
            success: false,
            error: 'Logout failed'
        });
    }
});

// Registration route
router.post('/register', async (req, res) => {
    
    try {
        const { firstName, lastName, companyName, email, password, dotNumber, tenantId } = req.body;
        
        // Validation
        if (!firstName || !lastName || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'All fields are required' 
            });
        }
        
        // Validate password strength
        const passwordErrors = validatePassword(password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: passwordErrors[0] 
            });
        }
        
        // Determine tenant ID
        let finalTenantId = process.env.DEFAULT_TENANT_ID || 'default'; // Default tenant
        
        if (tenantId) {
            // Use provided tenant ID if valid
            finalTenantId = tenantId;
        } else if (dotNumber) {
            // Check if DOT number exists in companies table
            const dotExists = await userManager.checkDOTNumberExists(dotNumber);
            if (dotExists) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'DOT number already registered' 
                });
            }
            
            // For now, use default tenant - DOT numbers are now company properties
            finalTenantId = process.env.DEFAULT_TENANT_ID || 'default';
        }
        
        // Check if email exists
        const emailExists = await userManager.emailExists(email);
        if (emailExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email already registered' 
            });
        }
        
        // Hash password
        const hashedPassword = await encryptionUtil.hashPassword(password);
        
        // Create user with tenant support
        const user = await userManager.createUserWithTenant({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: email.trim(),
            password: hashedPassword,
            tenantId: finalTenantId
        });

        logger.info(`User registered: ${user.email}`, { tenantId: finalTenantId });

        // Create user data for token
        const userData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            companyName: user.companyName,
            tenantId: finalTenantId,
            organizationRole: user.organizationRole
        };

        // Generate enhanced access token with fingerprinting
        const { token: accessToken, tokenId } = jwtSecurityService.createAccessToken(userData, req);
        
        // Generate refresh token
        const { refreshToken } = jwtSecurityService.createRefreshToken(user.id, req);

        logger.info('User registration successful', { 
            userId: user.id, 
            email: user.email,
            tokenId 
        });

        res.json({
            success: true,
            message: 'Registration successful',
            accessToken,
            refreshToken,
            user: userData
        });
        
    } catch (error) {
        logger.error('Registration failed', error, { endpoint: '/api/auth/register' });
        res.status(500).json({ 
            success: false, 
            error: 'Registration failed: ' + error.message 
        });
    }
});

// Customer onboarding route (for admin use)
router.post('/onboard-customer', async (req, res) => {
    
    try {
        const { companyName, dotNumber, owner } = req.body;
        
        // Validate required fields
        if (!companyName || !dotNumber || !owner || !owner.firstName || !owner.lastName || !owner.email || !owner.password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Company name, DOT number, and owner details are required' 
            });
        }
        
        // Validate DOT number format
        if (!/^DOT\d{6,7}$/i.test(dotNumber)) {
            return res.status(400).json({ 
                success: false, 
                error: 'DOT number must be in format DOT123456' 
            });
        }
        
        // Check if DOT number already exists
        const dotExists = await userManager.checkDOTNumberExists(dotNumber);
        if (dotExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'DOT number already registered' 
            });
        }
        
        // Check if owner email already exists
        const emailExists = await userManager.emailExists(owner.email);
        if (emailExists) {
            return res.status(400).json({ 
                success: false, 
                error: 'Owner email already registered' 
            });
        }
        
        // Validate password strength
        const passwordErrors = validatePassword(owner.password);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: passwordErrors[0] 
            });
        }
        
        // Use default tenant - DOT numbers are now company properties
        const tenantId = process.env.DEFAULT_TENANT_ID || 'default';
        
        // Create owner user
        const user = await userManager.createUserWithTenant({
            firstName: owner.firstName.trim(),
            lastName: owner.lastName.trim(),
            email: owner.email.trim(),
            password: owner.password,
            tenantId: tenantId
        });

        logger.info(`Customer onboarded: ${user.email}`, { tenantId });

        // Create user data for token
        const userData = {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenantId: tenantId,
            organizationRole: user.organizationRole
        };

        // Generate enhanced access token with fingerprinting
        const { token: accessToken, tokenId } = jwtSecurityService.createAccessToken(userData, req);
        
        // Generate refresh token
        const { refreshToken } = jwtSecurityService.createRefreshToken(user.id, req);

        logger.info('Customer onboarding successful', { 
            userId: user.id, 
            email: user.email,
            tokenId 
        });

        res.json({
            success: true,
            message: 'Customer onboarding successful',
            accessToken,
            refreshToken,
            user: userData
        });
        
    } catch (error) {
        logger.error('Customer onboarding failed', error, { endpoint: '/api/auth/onboard-customer' });
        res.status(500).json({ 
            success: false, 
            error: 'Customer onboarding failed: ' + error.message 
        });
    }
});

// Admin login route
router.post('/admin-login', adminLoginLimiter, async (req, res) => {
    
    try {
        const { adminKey } = req.body;
        
        if (!adminKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'Admin key is required' 
            });
        }
        
        // Validate admin key
        const config = require('../config');
        const validAdminKey = config.admin.secretKey;
        
        // Warn if using default key in production
        if (process.env.NODE_ENV === 'production' && config.admin.secretKey === 'dev-admin-key-change-in-production') {
            logger.error('Using default admin key in production - security risk!');
        }
        
        if (adminKey !== validAdminKey) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid admin key' 
            });
        }
        
        // Generate admin user data (using camelCase for JavaScript objects)
        const adminUser = {
            id: 'admin_system',
            email: 'admin@system.local',
            firstName: 'System',
            lastName: 'SuperAdmin',
            tenantId: 'system',
            companyId: null,
            organizationRole: 'superAdmin'
        };
        
        // Generate enhanced access token with fingerprinting
        const { token: accessToken, tokenId } = jwtSecurityService.createAccessToken(adminUser, req);
        
        // Generate refresh token
        const { refreshToken } = jwtSecurityService.createRefreshToken(adminUser.id, req);
        
        logger.warn('Admin login successful - monitor this access', { tokenId });
        
        res.json({
            success: true,
            message: 'Admin login successful',
            accessToken,
            refreshToken,
            user: adminUser
        });
        
    } catch (error) {
        logger.error('Admin login failed', error, { endpoint: '/api/auth/admin-login' });
        res.status(500).json({ 
            success: false, 
            error: 'Admin login failed: ' + error.message 
        });
    }
});

// Check authentication status
router.get('/check-auth', async (req, res) => {
    try {
        const token = req.headers.authorization?.substring(7) ||
            req.headers.cookie?.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];

        if (!token) {
            return res.json({ authenticated: false });
        }

        try {
            // Use enhanced JWT security service
            const decoded = await jwtSecurityService.verifyAccessToken(token, req);

            // Fetch complete user profile from database
            const userProfile = await userManager.getUserProfile(decoded.id);

            if (!userProfile) {
                return res.json({ authenticated: false });
            }

            // Get user's active company
            const activeCompany = await companyManager.getActiveCompany(userProfile.id, userProfile.tenantId);

            const userData = {
                id: userProfile.id,
                email: userProfile.email,
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                plan: userProfile.plan,
                tenantId: userProfile.tenantId,
                companyId: activeCompany ? activeCompany.id : null,
                organizationRole: userProfile.organizationRole || 'user'
            };

            res.json({
                authenticated: true,
                user: userData
            });
        } catch (error) {
            console.error('Error fetching user profile for check-auth:', error);
            // Fallback to JWT data if database query fails
            try {
                const decoded = jwt.decode(token);
                if (decoded && decoded.id && decoded.email) {
                    return res.json({
                        authenticated: true,
                        user: {
                            id: decoded.id,
                            email: decoded.email,
                            firstName: decoded.firstName || '',
                            lastName: decoded.lastName || '',
                            plan: decoded.plan,
                            tenantId: decoded.tenantId,
                            companyId: decoded.companyId,
                            organizationRole: decoded.organizationRole || 'user'
                        }
                    });
                }
                return res.json({ authenticated: false });
            } catch (e) {
                return res.json({ authenticated: false });
            }
        }
    } catch (error) {
        logger.error('Check auth failed', error, { endpoint: '/api/auth/check-auth' });
        res.json({ authenticated: false });
    }
});

// Password reset request
router.post('/forgot-password', async (req, res) => {
    
    try {
        const { email, tenantId } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email is required' 
            });
        }
        
        // Check if user exists
        const user = await userManager.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Check tenant if provided
        if (tenantId && user.tenantId !== tenantId) {
            logger.warn(`Password reset attempted for wrong tenant`, { email, tenantId });
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Generate reset token
        const { tokenId, token, expiresAt } = await userManager.createPasswordResetToken(user.id);
        
        // Send email
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        
        await emailService.sendPasswordResetEmail(
            email,
            user.firstName || user.email,
            resetUrl,
            expiresAt
        );
        

        
        res.json({
            success: true,
            message: 'Password reset email sent successfully'
        });
        
    } catch (error) {
        logger.error('Password reset failed', error, { endpoint: '/api/auth/forgot-password' });
        res.status(500).json({ 
            success: false, 
            error: 'Password reset failed: ' + error.message 
        });
    }
});

// Password reset confirmation
router.post('/reset-password', async (req, res) => {
    
    try {
        const { token, newPassword } = req.body;
        
        if (!token || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: 'Token and new password are required' 
            });
        }
        
        // Validate token
        const tokenData = await userManager.validatePasswordResetToken(token);
        if (!tokenData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid or expired reset token' 
            });
        }
        
        // Validate password strength
        const passwordErrors = validatePassword(newPassword);
        if (passwordErrors.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: passwordErrors[0] 
            });
        }
        
        // Hash new password
        const hashedPassword = await encryptionUtil.hashPassword(newPassword);
        
        // Update user password
        await userManager.updateUserPassword(tokenData.user_id, hashedPassword);
        
        // Mark token as used
        await userManager.markPasswordResetTokenUsed(tokenData.id);
        
        logger.info(`Password reset completed`, { email: tokenData.email });
        
        res.json({
            success: true,
            message: 'Password reset successful'
        });
        
    } catch (error) {
        logger.error('Password reset confirmation failed', error, { endpoint: '/api/auth/reset-password' });
        res.status(500).json({ 
            success: false, 
            error: 'Password reset failed: ' + error.message 
        });
    }
});

module.exports = { router, JWT_SECRET }; 
