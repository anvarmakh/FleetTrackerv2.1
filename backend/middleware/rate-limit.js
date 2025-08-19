const rateLimit = require('express-rate-limit');
const { ENCRYPTION_CONFIG } = require('../utils/security-config');

/**
 * Factory to create standardized rate limiters
 */
function createRateLimiter({ windowMs, max, message = 'Too many requests, please try again later' }) {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, error: message }
    });
}

// Pre-configured limiters (dev/prod aware via ENCRYPTION_CONFIG)
const loginLimiter = createRateLimiter({
    windowMs: ENCRYPTION_CONFIG.RATE_LIMITS.LOGIN_WINDOW,
    max: ENCRYPTION_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS,
    message: `Too many login attempts. Please wait ${Math.floor(ENCRYPTION_CONFIG.RATE_LIMITS.LOGIN_WINDOW / 60000)} minutes before trying again.`
});

const adminLoginLimiter = createRateLimiter({
    windowMs: ENCRYPTION_CONFIG.RATE_LIMITS.LOGIN_WINDOW,
    max: ENCRYPTION_CONFIG.RATE_LIMITS.LOGIN_ATTEMPTS,
    message: 'Too many admin login attempts, please try again later'
});

module.exports = {
    createRateLimiter,
    loginLimiter,
    adminLoginLimiter,
};


