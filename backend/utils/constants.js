/**
 * Application constants
 */

// GPS Provider Types
const GPS_PROVIDER_TYPES = {
    SPIREON: 'spireon',
    SKYBITZ: 'skybitz',
    SAMSARA: 'samsara'
};

// Company Types
const COMPANY_TYPES = {
    CARRIER: 'carrier',
    BROKER: 'broker',
    SHIPPER: 'shipper',
    LOGISTICS: 'logistics',
    OTHER: 'other'
};

// Location Types
const LOCATION_TYPES = {
    GENERAL: 'general',
    WAREHOUSE: 'warehouse',
    DEPOT: 'depot',
    TERMINAL: 'terminal',
    YARD: 'yard',
    OFFICE: 'office',
    MAINTENANCE: 'maintenance',
    FUEL: 'fuel',
    REST: 'rest',
    CUSTOM: 'custom'
};

// Trailer Status
const TRAILER_STATUS = {
    AVAILABLE: 'available',
    IN_USE: 'inUse',
    MAINTENANCE: 'maintenance',
    OUT_OF_SERVICE: 'outOfService'
};

// GPS Status
const GPS_STATUS = {
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    UNKNOWN: 'unknown'
};

// Note Categories
const NOTE_CATEGORIES = {
    GENERAL: 'general',
    MAINTENANCE: 'maintenance',
    DAMAGE: 'damage',
    REPAIR: 'repair',
    INSPECTION: 'inspection'
};

// Maintenance Severity
const MAINTENANCE_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical'
};

// User Roles
const USER_ROLES = {
    SUPER_ADMIN: 'superAdmin',
    OWNER: 'owner',
    ADMIN: 'admin',
    USER: 'user'
};

const ROLE_HIERARCHY = {
    'owner': ['admin', 'user'],
    'admin': ['user'],
    'user': []
};

// HTTP Status Codes
const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500,
    SERVICE_UNAVAILABLE: 503
};

// API Response Messages
const API_MESSAGES = {
    SUCCESS: 'Operation completed successfully',
    CREATED: 'Resource created successfully',
    UPDATED: 'Resource updated successfully',
    DELETED: 'Resource deleted successfully',
    NOT_FOUND: 'Resource not found',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'Access denied',
    VALIDATION_ERROR: 'Validation failed',
    INTERNAL_ERROR: 'Internal server error'
};

// Database Constraints
const DB_CONSTRAINTS = {
    UNIQUE: 'SQLITE_CONSTRAINT_UNIQUE',
    FOREIGN_KEY: 'SQLITE_CONSTRAINT_FOREIGNKEY',
    NOT_NULL: 'SQLITE_CONSTRAINT_NOTNULL'
};

// Time Constants (in milliseconds)
const TIME_CONSTANTS = {
    SECOND: 1000,
    MINUTE: 60 * 1000,
    HOUR: 60 * 60 * 1000,
    DAY: 24 * 60 * 60 * 1000,
    WEEK: 7 * 24 * 60 * 60 * 1000,
    MONTH: 30 * 24 * 60 * 60 * 1000,
    YEAR: 365 * 24 * 60 * 60 * 1000
};

// Auto-refresh Intervals
const REFRESH_INTERVALS = {
    GPS_SYNC_AND_CONNECTION: 20 * TIME_CONSTANTS.MINUTE, // 20 minutes
    MAINTENANCE_ALERTS: TIME_CONSTANTS.HOUR, // 1 hour
};

// Rate Limiting Delays (in milliseconds)
const RATE_LIMITING = {
    BETWEEN_USERS: 1000, // 1 second delay between processing different users
    BETWEEN_PROVIDERS: 2000, // 2 second delay between API calls to different providers
    BETWEEN_COMPANIES: 500 // 0.5 second delay between processing different companies
};

// File Upload Limits
const UPLOAD_LIMITS = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif'],
    ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'text/plain', 'application/msword']
};

// Pagination Defaults
const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100
};

// Validation Rules
const VALIDATION_RULES = {
    PASSWORD_MIN_LENGTH: 8,
    PASSWORD_MAX_LENGTH: 128,
    EMAIL_MAX_LENGTH: 255,
    NAME_MAX_LENGTH: 100,
    COMPANY_NAME_MAX_LENGTH: 200,
    TRAILER_UNIT_MAX_LENGTH: 50,
    VIN_LENGTH: 17,
    DOT_NUMBER_PATTERN: /^DOT\d{6,7}$/i,
    EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};

// GPS Provider URLs
const GPS_PROVIDER_URLS = {
    SPIREON: 'https://services.spireon.com/v0/rest',
    SKYBITZ: 'https://xml.skybitz.com:9443',
    SAMSARA: 'https://api.samsara.com'
};

// Environment Types
const ENVIRONMENT = {
    DEVELOPMENT: 'development',
    STAGING: 'staging',
    PRODUCTION: 'production'
};

// Log Levels
const LOG_LEVELS = {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
};

// Cache Keys
const CACHE_KEYS = {
    USER_PROFILE: 'user_profile',
    COMPANY_DATA: 'company_data',
    TRAILER_LIST: 'trailer_list',
    GPS_PROVIDERS: 'gps_providers',
    MAINTENANCE_ALERTS: 'maintenance_alerts',
    CUSTOM_COMPANIES: 'custom_companies',
    TENANT_STATS: 'tenant_stats',
    SYSTEM_STATS: 'system_stats'
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
    USER_PROFILE: 300, // 5 minutes
    COMPANY_DATA: 600, // 10 minutes
    TRAILER_LIST: 300, // 5 minutes
    GPS_PROVIDERS: 1800, // 30 minutes
    MAINTENANCE_ALERTS: 900, // 15 minutes
    CUSTOM_COMPANIES: 600, // 10 minutes
    TENANT_STATS: 300, // 5 minutes
    SYSTEM_STATS: 1800 // 30 minutes
};

module.exports = {
    GPS_PROVIDER_TYPES,
    COMPANY_TYPES,
    LOCATION_TYPES,
    TRAILER_STATUS,
    GPS_STATUS,
    NOTE_CATEGORIES,
    MAINTENANCE_SEVERITY,
    USER_ROLES,
    ROLE_HIERARCHY,
    HTTP_STATUS,
    API_MESSAGES,
    DB_CONSTRAINTS,
    TIME_CONSTANTS,
    REFRESH_INTERVALS,
    RATE_LIMITING,
    UPLOAD_LIMITS,
    PAGINATION,
    VALIDATION_RULES,
    GPS_PROVIDER_URLS,
    ENVIRONMENT,
    LOG_LEVELS,
    CACHE_KEYS,
    CACHE_TTL
}; 
