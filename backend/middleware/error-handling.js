/**
 * Error handling middleware for centralized error handling
 */

const logger = require('../utils/logger');

/**
 * Centralized error handler
 */
function handleError(res, error, context = 'operation') {
    logger.error(`${context} error:`, error); // Use structured logger
    
    // Determine appropriate status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        statusCode = 400;
        errorMessage = 'Duplicate entry - this item already exists';
    } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
        statusCode = 400;
        errorMessage = 'Cannot delete - this item is referenced by other records';
    } else if (error.message && error.message.includes('not found')) {
        statusCode = 404;
        errorMessage = 'Resource not found';
    } else if (error.message && error.message.includes('access denied')) {
        statusCode = 403;
        errorMessage = 'Access denied';
    } else if (error.message && error.message.includes('validation')) {
        statusCode = 400;
        errorMessage = error.message;
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    res.status(statusCode).json({
        success: false,
        error: `Failed to ${context}: ${errorMessage}`
    });
}

/**
 * Async error wrapper for route handlers
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 handler for unmatched routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path,
        method: req.method
    });
}

/**
 * Global error handler middleware
 */
function globalErrorHandler(err, req, res, next) {
    console.error('Unhandled error:', err);
    
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
        success: false,
        error: isDevelopment ? err.message : 'Internal server error',
        ...(isDevelopment && { stack: err.stack })
    });
}

/**
 * Validation error handler
 */
function validationErrorHandler(err, req, res, next) {
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: err.details || err.message
        });
    }
    next(err);
}

/**
 * Database error handler
 */
function databaseErrorHandler(err, req, res, next) {
    if (err.code && err.code.startsWith('SQLITE_')) {
        console.error('Database error:', err);
        
        let statusCode = 500;
        let errorMessage = 'Database operation failed';
        
        switch (err.code) {
            case 'SQLITE_CONSTRAINT_UNIQUE':
                statusCode = 400;
                errorMessage = 'Duplicate entry - this item already exists';
                break;
            case 'SQLITE_CONSTRAINT_FOREIGNKEY':
                statusCode = 400;
                errorMessage = 'Cannot delete - this item is referenced by other records';
                break;
            case 'SQLITE_BUSY':
                statusCode = 503;
                errorMessage = 'Database is busy - please try again';
                break;
            case 'SQLITE_LOCKED':
                statusCode = 503;
                errorMessage = 'Database is locked - please try again';
                break;
        }
        
        return res.status(statusCode).json({
            success: false,
            error: errorMessage
        });
    }
    next(err);
}

/**
 * JWT error handler
 */
function jwtErrorHandler(err, req, res, next) {
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            error: 'Token expired'
        });
    }
    
    next(err);
}

/**
 * Rate limiting error handler
 */
function rateLimitErrorHandler(err, req, res, next) {
    if (err.type === 'RateLimitError') {
        return res.status(429).json({
            success: false,
            error: 'Too many requests - please try again later'
        });
    }
    next(err);
}

/**
 * Log error with context
 */
function logError(error, context = {}) {
    const errorLog = {
        timestamp: new Date().toISOString(),
        error: error.message,
        stack: error.stack,
        context: {
            url: context.url,
            method: context.method,
            userId: context.userId,
            userAgent: context.userAgent,
            ip: context.ip
        }
    };
    
    console.error('Error Log:', JSON.stringify(errorLog, null, 2));
}

module.exports = {
    handleError,
    asyncHandler,
    notFoundHandler,
    globalErrorHandler,
    validationErrorHandler,
    databaseErrorHandler,
    jwtErrorHandler,
    rateLimitErrorHandler,
    logError
}; 
