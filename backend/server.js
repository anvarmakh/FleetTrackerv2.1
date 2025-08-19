require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import database initialization
const { initializeDatabase } = require('./database/database-initializer');

// Import services
const RefreshService = require('./services/auto-refresh');
const sseService = require('./services/sse-service');

// Import middleware
const { authenticateToken, optionalAuth } = require('./middleware/auth');
const { sanitizeRequestBody, validateRequestBody } = require('./middleware/validation');
const { 
    handleError, 
    asyncHandler, 
    notFoundHandler, 
    globalErrorHandler,
    validationErrorHandler,
    databaseErrorHandler,
    jwtErrorHandler,
    rateLimitErrorHandler
} = require('./middleware/error-handling');

// Import utilities
const { 
    GPS_PROVIDER_TYPES, 
    LOCATION_TYPES, 
    TRAILER_STATUSES,
    NOTE_CATEGORIES,
    API_MESSAGES,
    TIME_CONSTANTS
} = require('./utils/constants');
const { validateSecurityEnvironment, CORS_CONFIG } = require('./utils/security-config');
const logger = require('./utils/logger');

// Route modules will be imported inside startServer function after database initialization

const app = express();
const PORT = process.env.PORT || 3000;

// Security headers middleware
app.use((req, res, next) => {
    // Prevent information disclosure
    res.removeHeader('X-Powered-By');
    
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Content Security Policy for production
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:;");
    }
    
    next();
});

// Middleware
app.use(cors(CORS_CONFIG));
app.use(express.json());

// Serve static files from frontend build directory
app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));

// ============================================================================
// AUTO-REFRESH ROUTES (inline routes for SSE)
// ============================================================================

app.get('/api/auto-refresh/stream', (req, res) => {
    const { extractAndVerifyToken } = require('./utils/authUtils');
    const { JWT_SECRET } = require('./middleware/auth');
    const sseService = require('./services/sse-service');

    // Verify token FIRST before setting any headers
    extractAndVerifyToken(req, JWT_SECRET, (err, user) => {
        if (err) {
            // Return error without setting SSE headers to prevent information leakage
            return res.status(401).json({
                success: false,
                error: 'Authentication required for auto-refresh stream'
            });
        }

        // Only set SSE headers after successful authentication
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            // CORS for SSE should align with global CORS; avoid wildcard with credentials
            'Access-Control-Allow-Headers': 'Cache-Control, Authorization'
        });
        
        // Proceed with SSE stream registration
        sseService.registerClient(user.id, res);
    });
});



// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date(),
        system: 'GPS Fleet Management with DOT Tenancy (Refactored)',
        version: '2.4.0',
        features: {
            multiTenant: true,
            dotTenancy: true,
            autoDiscovery: true,
            encryption: true,
            authentication: true,
            persistentTrailers: true,
            gpsProviders: ['spireon', 'skybitz', 'samsara'],
            modularArchitecture: true
        },
        demo: undefined
    });
});

// ============================================================================
// API ROUTES (must be registered before error handlers)
// ============================================================================

// Import route modules
const authRoutes = require('./routes/auth').router;
const companiesRoutes = require('./routes/companies');
const trailersRoutes = require('./routes/trailers');
const providersRoutes = require('./routes/providers');
const trailerCustomLocationsRoutes = require('./routes/trailer-custom-locations');
const systemNotesRoutes = require('./routes/system-notes');
const statsRoutes = require('./routes/stats');
const refreshRoutes = require('./routes/refresh');
const trailerCustomCompaniesRoutes = require('./routes/trailer-custom-companies');
const usersRoutes = require('./routes/users');
const maintenanceRoutes = require('./routes/maintenance');
const geocodingRoutes = require('./routes/geocoding');
const adminRoutes = require('./routes/admin');
const tokenManagementRoutes = require('./routes/token-management');

// Register routes
logger.info('Registering API routes');
app.use('/api/auth', authRoutes);
app.use('/api/companies', authenticateToken, companiesRoutes);
app.use('/api/trailers', authenticateToken, trailersRoutes);
app.use('/api/providers', authenticateToken, providersRoutes);
app.use('/api/trailer-custom-locations', authenticateToken, trailerCustomLocationsRoutes);
app.use('/api/notes', authenticateToken, systemNotesRoutes);
app.use('/api/stats', authenticateToken, statsRoutes);
app.use('/api/refresh', authenticateToken, refreshRoutes);
app.use('/api/trailer-custom-companies', authenticateToken, trailerCustomCompaniesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/user', usersRoutes); // For profile routes at /api/user/profile
app.use('/api/maintenance', authenticateToken, maintenanceRoutes);
app.use('/api/geocode', authenticateToken, geocodingRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/tokens', tokenManagementRoutes);
logger.info('All API routes registered successfully');

// Add a test route to verify server is working
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Server is working!' });
});

// ============================================================================
// FRONTEND ROUTES (SPA routing - must be after API routes)
// ============================================================================

// Serve React app for all non-API routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE (Order matters!)
// ============================================================================

// Specific error type handlers (these must come before global error handler)
app.use(validationErrorHandler);
app.use(databaseErrorHandler);
app.use(jwtErrorHandler);
app.use(rateLimitErrorHandler);

// Global error handling middleware (must be last)
app.use(globalErrorHandler);

// 404 handler for unmatched routes (must be last, after all routes)
app.use(notFoundHandler);

// ============================================================================
// SERVER STARTUP
// ============================================================================

function startAutoRefreshSystem() {
    try {
        RefreshService.startAutoRefreshSystem();
    } catch (error) {
        logger.error('Failed to start auto-refresh system:', error);
        // Don't let service startup errors crash the server
    }
}



async function startServer() {
    try {
        logger.info('Starting FleetTracker v2.1');
        
        validateSecurityEnvironment();
        
        // Initialize database first
        await initializeDatabase();
        logger.info('Database initialized successfully');
        
        // Routes are already registered at the top level
        
        // Start services with error handling
        startAutoRefreshSystem();
        
        // Start the server
        const server = app.listen(PORT, () => {
                    logger.info(`Server running at http://localhost:${PORT}`);
        logger.info(`Server started at ${new Date().toLocaleTimeString()}`);

        if (!process.env.ADMIN_SECRET_KEY) {
            logger.warn('Admin secret not set - using development default');
        }
        });

        // Server lifecycle diagnostics
        server.on('close', () => {
            logger.info('HTTP server closed');
        });

        server.on('error', (err) => {
            logger.error('HTTP server error', err);
        });
        
    } catch (error) {
        logger.error('Server startup failed', error);
        // Add cleanup, e.g., close DB if partially initialized
        const { closeDatabaseConnection } = require('./database/database-initializer');
        closeDatabaseConnection();
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    logger.info('Shutting down server');
    try {
        // Close database connection
        const { closeDatabaseConnection } = require('./database/database-initializer');
        await closeDatabaseConnection();
        logger.info('Database connection closed');
    } catch (err) {
        logger.error('Shutdown error', err);
    }
    process.exit(0);
});

// Handle uncaught exceptions (CRASH-PROOF)
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception detected', err);
    
    // Log the error but don't exit the process
    logger.error('Uncaught Exception prevented from crashing server', err);
    
    // Only exit if it's a critical error that we can't recover from
    if (err.code === 'EADDRINUSE' || err.code === 'EACCES') {
        logger.error('Critical error - exiting process', err);
        process.exit(1);
    } else {
        logger.info('Non-critical error handled - server continues running');
    }
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection detected', { reason, promise });
    
    // Log the error but don't exit the process
    logger.error('Unhandled Rejection prevented from crashing server', { reason });
    
    // Only exit if it's a critical rejection that we can't recover from
    if (reason && reason.code === 'EADDRINUSE' || reason.code === 'EACCES') {
        logger.error('Critical rejection - exiting process', { reason });
        process.exit(1);
    } else {
        logger.info('Non-critical rejection handled - server continues running');
    }
});

// Handle process warnings (CRASH-PROOF)
process.on('warning', (warning) => {
    logger.warn('Process warning detected', { 
        name: warning.name, 
        message: warning.message, 
        stack: warning.stack 
    });
});

// Additional exit diagnostics
process.on('beforeExit', (code) => {
    logger.info('Process beforeExit', { code });
});

process.on('exit', (code) => {
    logger.info('Process exit', { code });
});

// Windows-specific signal used by consoles (e.g., Ctrl+Break)
process.on('SIGBREAK', async () => {
    logger.info('SIGBREAK received');
    try {
        const { closeDatabaseConnection } = require('./database/database-initializer');
        await closeDatabaseConnection();
    } catch (err) {
        logger.error('Shutdown error (SIGBREAK)', err);
    }
    process.exit(0);
});



// Start the server
startServer();

module.exports = { app };