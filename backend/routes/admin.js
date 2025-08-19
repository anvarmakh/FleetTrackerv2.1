const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error-handling');
const { userManager, companyManager, trailerCustomCompanyManager, statsManager, gpsProviderManager, trailerManager } = require('../database/database-manager');
const { getDatabaseConnection } = require('../database/database-initializer');
const { COMPANY_TYPES, USER_ROLES } = require('../utils/constants');
const cacheService = require('../services/cache-service');
const rateLimiter = require('../services/rate-limiter');
const logger = require('../utils/logger');

// Rate limiting for admin routes (more restrictive than regular routes)
const { createRateLimiter } = require('../middleware/rate-limit');
const adminRateLimiter = createRateLimiter({
    windowMs: require('../utils/security-config').ENCRYPTION_CONFIG.RATE_LIMITS.ADMIN_WINDOW,
    max: require('../utils/security-config').ENCRYPTION_CONFIG.RATE_LIMITS.ADMIN_REQUESTS,
    message: 'Too many admin requests, please try again later'
});

const router = express.Router();

// SuperAdmin middleware - check if user is system SuperAdmin
const requireSuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
    }
    
    // Check for SuperAdmin role - use organizationRole as that's what's set in user context
    if (!req.user.organizationRole || req.user.organizationRole !== USER_ROLES.SUPER_ADMIN) {
        // Log unauthorized access attempt
        console.warn(`🚨 Unauthorized admin access attempt by user ${req.user.email} (${req.user.id}) from IP ${req.ip}`);
        return res.status(403).json({
            success: false,
            error: 'SuperAdmin access required - this is a system management area'
        });
    }
    
    // Log successful admin access
    logger.info('Admin access granted', {
        userId: req.user.id,
        email: req.user.email,
        method: req.method,
        path: req.path,
        type: 'admin_access'
    });
    next();
};

// Get admin dashboard overview
router.get('/overview', adminRateLimiter, authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
    logger.info('Admin overview request', { email: req.user.email });
    
    // Get system statistics
    const stats = await statsManager.getAllTenants();
            // Debug logging reduced
    
            // Get recent users with pagination
        const recentUsers = await userManager.getAllActiveUsers({ limit: 10 });
        // Debug logging reduced
    
    // Get tenant count
    const tenantCount = stats.length;
    
    // Get total user count
    const totalUsers = recentUsers.pagination.totalCount;
    
    // Get active companies count
    const activeCompanies = await companyManager.getAllActiveCompanies();
            // Debug logging reduced
    
    // Get total trailer count across all companies (use same method as user dashboard)
    let totalTrailers = 0;
    try {
        logger.debug('Counting total trailers using user dashboard method');
        const db = getDatabaseConnection();
        const trailerCountResult = await new Promise((resolve, reject) => {
            db.all(`
                SELECT COUNT(pt.id) as trailer_count
                FROM persistent_trailers pt
                LEFT JOIN companies c ON pt.company_id = c.id
                WHERE c.is_active = 1 AND c.tenant_id IS NOT NULL
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows[0]?.trailer_count || 0);
            });
        });
        totalTrailers = trailerCountResult;
    } catch (trailerError) {
        console.error('❌ Error counting total trailers:', trailerError);
        totalTrailers = 0;
    }
    logger.debug('Total trailers across all companies', { count: totalTrailers });
    
    const response = {
        success: true,
        data: {
            overview: {
                totalTenants: tenantCount,
                totalUsers: totalUsers,
                totalCompanies: activeCompanies.length,
                totalTrailers: totalTrailers,
                systemStatus: 'healthy'
            },
            recentActivity: {
                recentUsers: recentUsers.data.slice(0, 10), // Last 10 users
                recentTenants: stats.slice(0, 5) // Last 5 tenants
            }
        }
    };
    
    logger.debug('Admin overview response generated', { 
        userCount: response.userCount, 
        companyCount: response.companyCount,
        trailerCount: response.trailerCount 
    });
    res.json(response);
}));

// Get all tenants with enhanced statistics
router.get('/tenants', adminRateLimiter, authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        logger.info('Admin tenants request', { email: req.user.email });
        
        const tenants = await statsManager.getAllTenants();
        logger.debug('Raw tenants from getAllTenants', { tenantCount: tenants.length });
        
        // Enhance each tenant with additional statistics
        const enhancedTenants = await Promise.all(tenants.map(async (tenant) => {
            try {
                // Get users for this tenant
                logger.debug('Getting users for tenant', { tenantId: tenant.tenantId });
                const usersResponse = await userManager.getUsersByTenant(tenant.tenantId);
                const users = usersResponse?.data || [];
                logger.debug('Found users for tenant', { 
        tenantId: tenant.tenantId, 
        userCount: users.length,
        users: users.map(u => ({ id: u.id, email: u.email, isActive: u.isActive }))
    });
                
                // Get companies for this tenant
                const companiesResponse = await companyManager.getCompaniesByTenant(tenant.tenantId);
                const companies = companiesResponse?.data || [];
                
                // Get actual trailer count for this tenant (use same method as user dashboard)
                let trailerCount = 0;
                try {
                    logger.debug('Counting trailers for tenant using user dashboard method', { tenantId: tenant.tenantId });
                    const db = getDatabaseConnection();
                    const trailerCountResult = await new Promise((resolve, reject) => {
                        db.get(`
                            SELECT COUNT(pt.id) as trailer_count
                            FROM persistent_trailers pt
                            LEFT JOIN companies c ON pt.company_id = c.id
                            WHERE c.tenant_id = ? AND c.is_active = 1 AND c.tenant_id IS NOT NULL
                        `, [tenant.tenantId], (err, row) => {
                            if (err) reject(err);
                            else resolve(row.trailer_count);
                        });
                    });
                    trailerCount = trailerCountResult;
                    logger.debug('Total trailers for tenant', { tenantId: tenant.tenantId, count: trailerCount });
                } catch (trailerError) {
                    logger.error('Error counting trailers for tenant', { tenantId: tenant.tenantId, error: trailerError });
                    trailerCount = 0;
                }
                
                // Get active GPS providers for this tenant
                const providersResponse = await gpsProviderManager.getTenantProviders(tenant.tenantId);
                const providers = providersResponse?.data || [];
                
                // Calculate additional metrics
                const activeUsers = users.filter(user => user.isActive === 1 || user.isActive === true).length;
                const lastActivity = users.length > 0 ? 
                    Math.max(...users.map(u => new Date(u.lastLogin || u.createdAt).getTime())) : 
                    new Date(tenant.created_at).getTime();
                
                return {
                    ...tenant,
                    user_count: users?.length || 0,
                    active_user_count: activeUsers,
                    company_count: companies?.length || 0,
                    trailer_count: trailerCount,
                    provider_count: providers?.length || 0,
                    last_activity: new Date(lastActivity).toISOString(),
                    users: users?.slice(0, 5) || [], // Include first 5 users for preview
                    companies: companies?.slice(0, 3) || [], // Include first 3 companies for preview
                    providers: providers?.slice(0, 2) || [] // Include first 2 providers for preview
                };
            } catch (error) {
                console.error(`Error enhancing tenant ${tenant.tenantId}:`, error);
                return {
                    ...tenant,
                    user_count: 0,
                    active_user_count: 0,
                    company_count: 0,
                    trailer_count: 0,
                    provider_count: 0,
                    last_activity: tenant.created_at,
                    users: [],
                    companies: [],
                    providers: []
                };
            }
        }));
        
        res.json({
            success: true,
            data: enhancedTenants
        });
    } catch (error) {
        console.error('Get tenants error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load tenants'
        });
    }
});

// Get users by tenant
router.get('/tenants/:tenant_id/users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { tenant_id } = req.params;
        const usersResponse = await userManager.getUsersByTenant(tenant_id);
        const users = usersResponse.data;
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get tenant users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load tenant users'
        });
    }
});

// Get system logs (simplified)
router.get('/logs', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        // This would typically connect to a logging service
        // For now, return a mock log structure
        const logs = [
            {
                id: 1,
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'System startup completed',
                tenant: 'system'
            },
            {
                id: 2,
                timestamp: new Date(Date.now() - 60000).toISOString(),
                level: 'info',
                message: 'New user registered: john@company.com',
                tenant: 'DOT123456'
            }
        ];
        
        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        console.error('Get logs error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load system logs'
        });
    }
});

// Get system health
router.get('/health', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        logger.info('System health check requested', { email: req.user.email });
        
        // Test database connection
        let databaseStatus = 'disconnected';
        let databaseLatency = null;
        let databaseError = null;
        
        try {
            const startTime = Date.now();
            // Test database connection with a simple query
            const { getDatabaseConnection } = require('../database/database-initializer');
            const db = getDatabaseConnection();
            await new Promise((resolve, reject) => {
                db.get('SELECT 1 as test', (err, row) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(row);
                    }
                });
            });
            const endTime = Date.now();
            databaseLatency = endTime - startTime;
            databaseStatus = 'connected';
            logger.debug('Database health check passed', { latency: databaseLatency });
        } catch (dbError) {
            databaseError = dbError.message;
            console.error('❌ Database health check failed:', dbError.message);
        }

        // Get detailed memory usage
        const memoryUsage = process.memoryUsage();
        const heapUsagePercent = ((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100).toFixed(2);
        const rssToHeapRatio = (memoryUsage.rss / memoryUsage.heapTotal).toFixed(2);
        
        // Determine memory status
        let memoryStatus = 'healthy';
        let memoryWarning = null;
        
        if (heapUsagePercent > 90) {
            memoryStatus = 'critical';
            memoryWarning = `High heap usage: ${heapUsagePercent}%`;
        } else if (heapUsagePercent > 80) {
            memoryStatus = 'warning';
            memoryWarning = `Elevated heap usage: ${heapUsagePercent}%`;
        } else if (heapUsagePercent > 60) {
            memoryStatus = 'moderate';
        }
        
        // Check uptime and determine if restart is recommended
        const uptime = process.uptime();
        const uptimeDays = Math.floor(uptime / 86400);
        let uptimeStatus = 'healthy';
        let uptimeWarning = null;
        
        if (uptimeDays > 30) {
            uptimeStatus = 'warning';
            uptimeWarning = 'Server running for over 30 days - consider restart';
        } else if (uptimeDays > 7) {
            uptimeStatus = 'moderate';
            uptimeWarning = 'Server running for over 7 days';
        }

        // Enhanced health object
        const health = {
            database: {
                status: databaseStatus,
                latency: databaseLatency,
                error: databaseError
            },
            server: {
                status: 'running',
                uptime: uptime,
                uptimeStatus: uptimeStatus,
                uptimeWarning: uptimeWarning
            },
            memory: {
                ...memoryUsage,
                heapUsagePercent: parseFloat(heapUsagePercent),
                rssToHeapRatio: parseFloat(rssToHeapRatio),
                status: memoryStatus,
                warning: memoryWarning
            },
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            overall: databaseStatus === 'connected' && memoryStatus === 'healthy' && uptimeStatus === 'healthy' ? 'healthy' : 'warning'
        };
        
        logger.info('System health check completed', {
            database: health.database.status,
            memory: `${health.memory.heapUsagePercent}%`,
            uptime: `${uptimeDays}d`,
            overall: health.overall
        });
        
        res.json({
            success: true,
            data: health
        });
    } catch (error) {
        logger.error('Health check error', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed: ' + error.message
        });
    }
});

// Create new tenant with initial owner user
router.post('/tenants', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { 
            tenantName,
            email, 
            firstName, 
            lastName, 
            password,
            companyName,
            companyColor
        } = req.body;
        
        if (!tenantName || !email || !firstName || 
            !lastName || !password || !companyName) {
            return res.status(400).json({
                success: false,
                error: 'Tenant name, company name, and user details are required'
            });
        }
        
        // Generate tenant ID from tenant name (slugified)
        const tenant_id = tenantName.toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        
        // Check if tenant already exists
        const existingTenant = await statsManager.getTenantById(tenant_id);
        if (existingTenant) {
            return res.status(400).json({
                success: false,
                error: 'A tenant with this name already exists'
            });
        }
        
        // Check if user already exists
        const emailExists = await userManager.emailExists(email);
        if (emailExists) {
            return res.status(400).json({
                success: false,
                error: 'User email already exists'
            });
        }
        
        // Create tenant and initial owner user
        const userData = {
            firstName: firstName,
            lastName: lastName,
            email: email,
            password: password,
            organizationRole: USER_ROLES.OWNER,
            tenantId: tenant_id,
            tenantName: tenantName
        };
        
        const result = await userManager.createUserWithTenant(userData);
        
        // Create initial company for the tenant
        const companyData = {
            name: companyName,
            type: COMPANY_TYPES.CARRIER, // Use valid company type instead of defaulting to 'trucking'
            color: companyColor || '#6b7280',
            tenantId: tenant_id
        };
        
        const company = await companyManager.createCompany(result.id, companyData);
        
        res.json({
            success: true,
            message: 'Tenant, company, and owner user created successfully',
            data: {
                tenant: {
                    tenantId: tenant_id,
                    tenantName: tenantName,
                    createdAt: new Date().toISOString()
                },
                ownerUser: {
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    organizationRole: USER_ROLES.OWNER,
                    tenantId: tenant_id,
                    createdAt: new Date().toISOString()
                },
                company: {
                    id: company.id,
                    name: company.name,
                    color: company.color,
                    createdAt: new Date().toISOString()
                },
                loginInfo: {
                    email: email,
                    tenantId: tenant_id,
                    note: 'Use the tenantId above for login (it has been normalized to lowercase)'
                }
            }
        });
    } catch (error) {
        console.error('Create tenant error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create tenant'
        });
    }
});

// Create new user
router.post('/users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { email, tenantId, organizationRole, firstName, lastName } = req.body;
        
        if (!email || !tenantId || !organizationRole) {
            return res.status(400).json({
                success: false,
                error: 'Email, tenant ID, and role are required'
            });
        }
        
        // Check if user already exists
        const existingUser = await userManager.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        // Use provided password or generate a temporary one
        const password = req.body.password || (Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase());
        
        // Create new user in database
        const userData = {
            firstName: firstName || '',
            lastName: lastName || '',
            email: email,
            password: password,
            organizationRole: organizationRole,
            tenantId: tenantId
        };
        
        const result = await userManager.createUserWithTenant(userData);
        
        // Assign user to the first available company in the tenant
        let assignedCompany = null;
        try {
            const companies = await companyManager.getCompaniesByTenant(tenantId);
            if (companies && companies.length > 0) {
                // Assign user to the first company in the tenant
                assignedCompany = companies[0];
                await companyManager.assignUserToCompany(result.id, assignedCompany.id);
            }
        } catch (error) {
            console.warn('Could not assign user to company:', error.message);
        }
        
        res.json({
            success: true,
            message: 'User created successfully',
            data: {
                email,
                tenantId,
                organizationRole,
                firstName: firstName || '',
                lastName: lastName || '',
                createdAt: new Date().toISOString(),
                password: req.body.password ? 'Password set successfully' : password,
                assignedCompany: assignedCompany ? assignedCompany.name : 'No company assigned',
                note: req.body.password ? 'User can login with the provided password' : 'Please provide this temporary password to the user and ask them to change it on first login'
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create user'
        });
    }
});



// Get system statistics
router.get('/stats', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const stats = {
            totalTenants: (await statsManager.getAllTenants()).length,
            totalUsers: (await userManager.getAllActiveUsers({ limit: 1 })).pagination.totalCount,
            totalCompanies: (await companyManager.getAllActiveCompanies()).length,
            systemUptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            timestamp: new Date().toISOString()
        };
        
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get system statistics'
        });
    }
});

// Get all users across all tenants
router.get('/all-users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const users = await userManager.getAllActiveUsers({ limit: 100 });
        
        res.json({
            success: true,
            data: users
        });
    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load all users'
        });
    }
});

// Deactivate a tenant and all its users (soft delete)
router.patch('/tenants/:tenantId/deactivate', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        logger.info('Admin deactivating tenant', { tenantId, adminEmail: req.user.email });
        
        // Verify tenant exists
        const tenants = await statsManager.getAllTenants();
        const tenant = tenants.find(t => t.tenantId === tenantId);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }
        
        // Get all users in this tenant
        const tenantUsers = await userManager.getUsersByTenant(tenantId);
        logger.debug('Found users in tenant', { 
        tenantId, 
        userCount: tenantUsers.length,
        users: tenantUsers.map(u => ({ id: u.id, email: u.email, isActive: u.isActive }))
    });
        
        // Deactivate only active users in the tenant
        let deactivatedCount = 0;
        let errors = [];
        for (const user of tenantUsers) {
            logger.debug('Checking user status', { userId: user.id, email: user.email, isActive: user.isActive });
            if (user.isActive === 1 || user.isActive === true) {
                try {
                    logger.debug('Attempting to deactivate user', { userId: user.id, email: user.email });
                    await userManager.deactivateUser(user.id);
                    deactivatedCount++;
                    logger.info('Successfully deactivated user', { userId: user.id, email: user.email });
                } catch (error) {
                    console.warn(`❌ Failed to deactivate user ${user.id} (${user.email}):`, error.message);
                    errors.push(`User ${user.email}: ${error.message}`);
                }
            } else {
                logger.debug('Skipping user - already inactive', { userId: user.id, email: user.email });
            }
        }
        
        // Deactivate the tenant record itself
        await statsManager.deactivateTenant(tenantId);
        
        logger.info('Tenant and all users deactivated successfully', { tenantId, deactivatedCount });
        
        const message = errors.length > 0 
            ? `Tenant ${tenantId} deactivated. ${deactivatedCount} users deactivated successfully. ${errors.length} users had issues: ${errors.join(', ')}`
            : `Tenant ${tenantId} and ${deactivatedCount} users deactivated successfully`;
            
        res.json({
            success: true,
            message: message,
            data: {
                tenantId,
                deactivatedUsers: deactivatedCount,
                totalUsers: tenantUsers.length,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Deactivate tenant error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate tenant'
        });
    }
});

// Activate a tenant and all its users
router.patch('/tenants/:tenantId/activate', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        logger.info('Admin activating tenant', { tenantId, adminEmail: req.user.email });
        
        // Verify tenant exists (including inactive ones)
        const tenant = await statsManager.getTenantById(tenantId);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }
        
        // Get all users in this tenant (including inactive ones)
        const tenantUsers = await userManager.getUsersByTenant(tenantId);
        
        // Activate only inactive users in the tenant
        let activatedCount = 0;
        let errors = [];
        for (const user of tenantUsers) {
            if (user.isActive === 0 || user.isActive === false) {
                try {
                    await userManager.activateUser(user.id);
                    activatedCount++;
                } catch (error) {
                    console.warn(`Failed to activate user ${user.id} (${user.email}):`, error.message);
                    errors.push(`User ${user.email}: ${error.message}`);
                }
            }
        }
        
        // Activate the tenant record itself
        await statsManager.activateTenant(tenantId);
        
        logger.info('Tenant and all users activated successfully', { tenantId });
        
        const message = errors.length > 0 
            ? `Tenant ${tenantId} activated. ${activatedCount} users activated successfully. ${errors.length} users had issues: ${errors.join(', ')}`
            : `Tenant ${tenantId} and ${activatedCount} users activated successfully`;
            
        res.json({
            success: true,
            message: message,
            data: {
                tenantId,
                activatedUsers: activatedCount,
                totalUsers: tenantUsers.length,
                errors: errors.length > 0 ? errors : undefined
            }
        });
    } catch (error) {
        console.error('Activate tenant error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to activate tenant'
        });
    }
});

// Delete a tenant and all its data (hard delete)
router.delete('/tenants/:tenantId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { tenantId } = req.params;
        
        logger.info('Admin deleting tenant', { tenantId, adminEmail: req.user.email });
        
        // Verify tenant exists
        const tenants = await statsManager.getAllTenants();
        const tenant = tenants.find(t => t.tenantId === tenantId);
        
        if (!tenant) {
            return res.status(404).json({
                success: false,
                error: 'Tenant not found'
            });
        }
        
        // Wrap entire deletion process in one transaction-like sequence
        let deletedUsers = 0;
        let deletedCompanies = 0;
        let deletedProviders = 0;
        let deletedTrailers = 0;
        const failures = [];

        try {
            // Users
            const tenantUsersResponse = await userManager.getUsersByTenant(tenantId);
            const tenantUsers = tenantUsersResponse.data || [];
            for (const user of tenantUsers) {
                try { await userManager.hardDeleteUser(user.id); deletedUsers++; } catch (e) { failures.push({ type: 'user', id: user.id, error: e.message }); }
            }

            // Companies
            const tenantCompaniesResponse = await companyManager.getCompaniesByTenant(tenantId);
            const tenantCompanies = tenantCompaniesResponse.data || [];
            for (const company of tenantCompanies) {
                try { await companyManager.deleteCompany(company.id, req.user.id); deletedCompanies++; } catch (e) { failures.push({ type: 'company', id: company.id, error: e.message }); }
            }

            // Custom companies
            const customCompaniesResponse = await trailerCustomCompanyManager.getCustomCompaniesByTenant(tenantId);
            const customCompanies = customCompaniesResponse.data || [];
            for (const customCompany of customCompanies) {
                try { await trailerCustomCompanyManager.deleteCustomCompany(customCompany.id, tenantId); } catch (e) { failures.push({ type: 'custom_company', id: customCompany.id, error: e.message }); }
            }

            // Providers
            const providersResponse = await gpsProviderManager.getTenantProviders(tenantId);
            const providers = providersResponse.data || [];
            for (const provider of providers) {
                try { await gpsProviderManager.deleteProvider(provider.id, req.user.id); deletedProviders++; } catch (e) { failures.push({ type: 'provider', id: provider.id, error: e.message }); }
            }

            // Trailers (iterate companies)
            for (const company of tenantCompanies) {
                try {
                    const companyTrailersResponse = await trailerManager.getAllTrailersForCompany(company.id, { limit: 1000, page: 1 });
                    const companyTrailers = companyTrailersResponse.data || [];
                    for (const trailer of companyTrailers) {
                        try { await trailerManager.deleteTrailer(trailer.id, req.user.id); deletedTrailers++; } catch (e) { failures.push({ type: 'trailer', id: trailer.id, error: e.message }); }
                    }
                } catch (e) { failures.push({ type: 'company_trailers', companyId: company.id, error: e.message }); }
            }

            // Tenant
            await statsManager.deleteTenant(tenantId);
        } catch (e) {
            failures.push({ type: 'tenant', id: tenantId, error: e.message });
        }
        
        logger.info('Tenant and all associated data deleted successfully', { tenantId });
        
        res.json({
            success: failures.length === 0,
            message: failures.length === 0 ? `Tenant ${tenantId} and all associated data deleted successfully` : `Tenant ${tenantId} deleted with some errors`,
            data: {
                tenantId,
                deletedUsers,
                deletedCompanies,
                deletedProviders,
                deletedTrailers,
                failures
            }
        });
    } catch (error) {
        console.error('Delete tenant error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete tenant'
        });
    }
});

// Deactivate a user (soft delete)
router.patch('/users/:userId/deactivate', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        logger.info('Admin deactivating user', { userId, adminEmail: req.user.email });
        
        // Verify user exists
        const user = await userManager.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Check if user has higher or equal role than the admin
        const adminRole = req.user.organizationRole;
        const userRole = user.organizationRole;
        
        if (adminRole === USER_ROLES.ADMIN && (userRole === USER_ROLES.OWNER || userRole === USER_ROLES.ADMIN)) {
            return res.status(403).json({
                success: false,
                error: 'Cannot deactivate user with higher or equal role'
            });
        }
        
        // Deactivate user
        await userManager.deactivateUser(userId);
        
        logger.info('User deactivated successfully', { userId });
        
        res.json({
            success: true,
            message: `User ${user.email} deactivated successfully`,
            data: {
                userId,
                email: user.email,
                tenantId: user.tenantId
            }
        });
    } catch (error) {
        console.error('Deactivate user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to deactivate user'
        });
    }
});

// Activate a user
router.patch('/users/:userId/activate', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        logger.info('Admin activating user', { userId, adminEmail: req.user.email });
        
        // Verify user exists
        const user = await userManager.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Activate user
        await userManager.activateUser(userId);
        
        logger.info('User activated successfully', { userId });
        
        res.json({
            success: true,
            message: `User ${user.email} activated successfully`,
            data: {
                userId,
                email: user.email,
                tenantId: user.tenantId
            }
        });
    } catch (error) {
        console.error('Activate user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to activate user'
        });
    }
});

// Delete a user (hard delete)
router.delete('/users/:userId', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        
        logger.info('Admin deleting user', { userId, adminEmail: req.user.email });
        
        // Verify user exists
        const user = await userManager.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Check if user has higher or equal role than the admin
        const adminRole = req.user.organizationRole;
        const userRole = user.organizationRole;
        
        if (adminRole === USER_ROLES.ADMIN && (userRole === USER_ROLES.OWNER || userRole === USER_ROLES.ADMIN)) {
            return res.status(403).json({
                success: false,
                error: 'Cannot delete user with higher or equal role'
            });
        }
        
        // Hard delete user
        await userManager.hardDeleteUser(userId);
        
        logger.info('User deleted successfully', { userId });
        
        res.json({
            success: true,
            message: `User ${user.email} deleted successfully`,
            data: {
                userId,
                email: user.email,
                tenantId: user.tenantId
            }
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete user'
        });
    }
});

// Clean up orphaned users (hard delete)
router.delete('/orphaned-users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        logger.info('Admin cleaning up orphaned users', { adminEmail: req.user.email });
        
        // Get all orphaned users
        const orphanedUsers = await userManager.getOrphanedUsers();
        
        if (orphanedUsers.length === 0) {
            return res.json({
                success: true,
                message: 'No orphaned users found',
                data: {
                    deletedUsers: 0
                }
            });
        }
        
        // Hard delete all orphaned users
        let deletedCount = 0;
        for (const user of orphanedUsers) {
            try {
                await userManager.hardDeleteUser(user.id);
                deletedCount++;
                logger.info('Deleted orphaned user', { userId: user.id, email: user.email });
            } catch (error) {
                console.error(`❌ Failed to delete orphaned user ${user.email}:`, error);
            }
        }
        
        logger.info('Cleaned up orphaned users', { deletedCount });
        
        res.json({
            success: true,
            message: `${deletedCount} orphaned users have been permanently deleted`,
            data: {
                deletedUsers: deletedCount,
                totalFound: orphanedUsers.length
            }
        });
    } catch (error) {
        console.error('Clean up orphaned users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to clean up orphaned users'
        });
    }
});

// Get orphaned users (users without tenant assignments)
router.get('/orphaned-users', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        logger.info('Admin orphaned users request', { email: req.user.email });
        
        // Get users without tenant assignments or with null/empty tenant_id
        const orphanedUsers = await userManager.getOrphanedUsers();
        
        logger.debug('Found orphaned users', { count: orphanedUsers.length });
        
        res.json({
            success: true,
            data: orphanedUsers
        });
    } catch (error) {
        console.error('Get orphaned users error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to load orphaned users'
        });
    }
});

// Reset rate limits for testing (admin only)
router.post('/reset-rate-limits', authenticateToken, requireSuperAdmin, async (req, res) => {
    try {
        // Clear rate limit data
        const rateLimiter = require('../services/rate-limiter');
        rateLimiter.clear();
        
        logger.info('Rate limits reset by admin', { adminId: req.user.id });
        
        res.json({
            success: true,
            message: 'Rate limits have been reset'
        });
    } catch (error) {
        logger.error('Error resetting rate limits:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to reset rate limits'
        });
    }
});

// Get cache statistics
router.get('/cache-stats', adminRateLimiter, authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
    const cacheStats = cacheService.getStats();
    const rateLimitStats = rateLimiter.getStats();
    
    res.json({
        success: true,
        data: {
            cache: cacheStats,
            rateLimiter: rateLimitStats
        }
    });
}));

// Clear cache for a specific tenant
router.post('/clear-cache/:tenantId', adminRateLimiter, authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
    const { tenantId } = req.params;
    
    cacheService.clearTenant(tenantId);
    rateLimiter.clearTenant(tenantId);
    
    res.json({
        success: true,
        message: `Cache and rate limiter cleared for tenant: ${tenantId}`
    });
}));

// Clear all cache
router.post('/clear-all-cache', adminRateLimiter, authenticateToken, requireSuperAdmin, asyncHandler(async (req, res) => {
    cacheService.clear();
    rateLimiter.clear();
    
    res.json({
        success: true,
        message: 'All cache and rate limiter data cleared'
    });
}));

module.exports = router; 
