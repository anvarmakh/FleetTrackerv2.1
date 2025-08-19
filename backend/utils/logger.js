/**
 * Centralized Logger
 * Provides structured logging with different levels and proper formatting
 */

const LOG_LEVELS = {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
};

const LOG_COLORS = {
    ERROR: '\x1b[31m', // Red
    WARN: '\x1b[33m',  // Yellow
    INFO: '\x1b[36m',  // Cyan
    DEBUG: '\x1b[35m', // Magenta
    RESET: '\x1b[0m'   // Reset
};

const LOG_SYMBOLS = {
    ERROR: '❌',
    WARN: '⚠️',
    INFO: 'ℹ️',
    DEBUG: '🔍'
};

class Logger {
    constructor() {
        this.level = this.getLogLevel();
        this.enableColors = process.env.NODE_ENV !== 'production';
    }

    getLogLevel() {
        const envLevel = process.env.LOG_LEVEL?.toUpperCase();
        // Default to INFO level to show user logins and other important events
        return LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.INFO;
    }

    formatMessage(level, message, context = {}) {
        const timestamp = new Date().toLocaleTimeString();
        const symbol = LOG_SYMBOLS[level];
        const color = this.enableColors ? LOG_COLORS[level] : '';
        const reset = this.enableColors ? LOG_COLORS.RESET : '';
        
        // Concise format: symbol time level: message
        let formatted = `${color}${symbol} ${timestamp} ${level}:${reset} ${message}`;
        
        // Only show essential context, not full objects
        if (context.error) {
            formatted += ` (${context.error})`;
        } else if (context.email) {
            formatted += ` (${context.email})`;
        }
        
        return formatted;
    }

    log(level, message, context = {}) {
        if (LOG_LEVELS[level] <= this.level) {
            console.log(this.formatMessage(level, message, context));
        }
    }

    error(message, error = null, context = {}) {
        const errorContext = {
            ...context,
            ...(error && {
                error: error.message,
                stack: error.stack
            })
        };
        this.log('ERROR', message, errorContext);
    }

    warn(message, context = {}) {
        this.log('WARN', message, context);
    }

    info(message, context = {}) {
        this.log('INFO', message, context);
    }

    debug(message, context = {}) {
        this.log('DEBUG', message, context);
    }

    // Convenience methods for common operations (simplified)
    logApiError(method, url, statusCode, error = null) {
        if (statusCode >= 400) {
            this.error(`${method} ${url} - ${statusCode}`, error);
        }
    }

    logAuthentication(event, email, success = true, error = null) {
        const level = success ? 'INFO' : 'WARN';
        this.log(level, `Authentication ${event}: ${email}`, {
            event,
            email,
            success,
            error: error?.message,
            type: 'authentication'
        });
    }

    logGpsSync(provider, status, trailerCount = 0, error = null) {
        const level = status === 'success' ? 'INFO' : 'ERROR';
        this.log(level, `GPS Sync ${provider}: ${status}`, {
            provider,
            status,
            trailerCount,
            error: error?.message,
            type: 'gps_sync'
        });
    }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;