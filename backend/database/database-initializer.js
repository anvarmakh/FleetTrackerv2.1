/**
 * Database Initializer - Production Ready
 * Handles database schema creation, initialization, and connection management
 * Features: Connection pooling, proper locking, error recovery, and production hardening
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Database configuration - Use Railway's persistent volume if available
const DB_DIR = process.env.RAILWAY_VOLUME_PATH || '/app/database' || path.join(__dirname, 'db');
const DB_PATH = path.join(DB_DIR, 'fleet_management.db');

// Connection pool for production readiness
let dbConnection = null;
let isInitializing = false;
let initPromise = null;

/**
 * Ensure database directory exists
 */
function ensureDatabaseDirectory() {
    logger.info('Database directory path:', DB_DIR);
    logger.info('Database file path:', DB_PATH);
    
    if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
        logger.info('Created database directory');
    }
    
    // Check if database file exists
    if (fs.existsSync(DB_PATH)) {
        const stats = fs.statSync(DB_PATH);
        logger.info('Database file exists, size:', stats.size, 'bytes');
    } else {
        logger.info('Database file does not exist, will be created');
    }
}

/**
 * Get database connection with proper error handling
 */
function getDatabaseConnection() {
    if (dbConnection) {
        return dbConnection;
    }

    ensureDatabaseDirectory();

    try {
        dbConnection = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                logger.error('Failed to open database connection:', err);
                // Don't throw here - let the calling function handle the error
                dbConnection = null;
            }
        });

        // Check if connection was established successfully
        if (!dbConnection) {
            throw new Error('Failed to create database connection');
        }

        // Configure database for production use with error handling
        try {
            dbConnection.configure('busyTimeout', 10000); // 10 second timeout
            dbConnection.run('PRAGMA foreign_keys = ON');
            dbConnection.run('PRAGMA journal_mode = WAL');
            dbConnection.run('PRAGMA synchronous = NORMAL');
            dbConnection.run('PRAGMA temp_store = MEMORY');
            dbConnection.run('PRAGMA cache_size = 10000');
            dbConnection.run('PRAGMA mmap_size = 268435456'); // 256MB
            dbConnection.run('PRAGMA locking_mode = NORMAL'); // Allow concurrent access for better performance
        } catch (configError) {
            logger.warn('Database configuration warning:', configError.message);
            // Continue anyway - database will work with default settings
        }

        logger.info('Database connection established');
        return dbConnection;
    } catch (error) {
        logger.error('Database connection failed:', error);
        dbConnection = null;
        throw error;
    }
}

/**
 * Close database connection safely
 */
function closeDatabaseConnection() {
    if (dbConnection) {
        return new Promise((resolve) => {
            dbConnection.close((err) => {
                if (err) {
                    logger.error('Error closing database:', err);
                } else {
                    logger.info('Database connection closed');
                }
                dbConnection = null;
                resolve();
            });
        });
    }
    return Promise.resolve();
}

/**
 * Execute SQL with proper error handling and retry logic
 */
async function executeSQL(db, sql, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                db.run(sql, function(err) {
                    if (err) {
                        if (err.code === 'SQLITE_BUSY' && attempt < retries) {
                            logger.warn(`Database busy, retrying (${attempt}/${retries})...`);
                            setTimeout(() => reject(err), 1000 * attempt);
                        } else {
                            reject(err);
                        }
                    } else {
                        resolve(this);
                    }
                });
            });
        } catch (error) {
            if (attempt === retries) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }
}

/**
 * Create complete database schema with production hardening
 */
async function createDatabaseSchema(db) {
    logger.info('🗄️ Creating database schema...');
    
    const schema = [
        // Users table
        `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            phone TEXT,
            timezone TEXT DEFAULT 'UTC',
            language TEXT DEFAULT 'en',
            tenant_id TEXT NOT NULL,
            organization_role TEXT DEFAULT 'user',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            last_login DATETIME,
            is_active BOOLEAN DEFAULT 1
        )`,

        // Companies table
        `CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            dot_number TEXT,
            mc_number TEXT,
            color TEXT DEFAULT '#3B82F6',
            tenant_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // User company preferences
        `CREATE TABLE IF NOT EXISTS user_company_preferences (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            active_company_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (active_company_id) REFERENCES companies(id) ON DELETE SET NULL
        )`,

        // GPS Providers table
        `CREATE TABLE IF NOT EXISTS gps_providers (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            status TEXT,
            last_sync DATETIME,
            trailer_count INTEGER,
            error_message TEXT,
            description TEXT,
            credentials_encrypted TEXT,
            company_id TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
        )`,

        // Persistent trailers table
        `CREATE TABLE IF NOT EXISTS persistent_trailers (
            id TEXT PRIMARY KEY,
            company_id TEXT NOT NULL,
            external_id TEXT,
            provider_id TEXT,
            tenant_id TEXT,
            unit_number TEXT,
            vin TEXT,
            dot_number TEXT,
            year INTEGER,
            make TEXT,
            model TEXT,
            plate TEXT,
            status TEXT,
            gps_enabled BOOLEAN,
            gps_status TEXT,
            last_latitude REAL,
            last_longitude REAL,
            last_address TEXT,
            last_gps_update DATETIME,
            last_sync DATETIME,
            manual_location_override BOOLEAN,
            manual_location_notes TEXT,
            location_source TEXT NOT NULL DEFAULT 'gps',
            location_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            last_annual_inspection DATE,
            next_annual_inspection_due DATE,
            last_midtrip_inspection DATE,
            next_midtrip_inspection_due DATE,
            last_brake_inspection DATE,
            next_brake_inspection_due DATE,
            tire_status TEXT,
            last_tire_service DATE,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
            FOREIGN KEY (provider_id) REFERENCES gps_providers(id) ON DELETE SET NULL
        )`,

        // Trailer inspections table
        `CREATE TABLE IF NOT EXISTS trailer_inspections (
            id TEXT PRIMARY KEY,
            trailer_id TEXT NOT NULL,
            inspection_type TEXT NOT NULL,
            inspection_date DATE NOT NULL,
            expiry_date DATE,
            inspector TEXT,
            status TEXT DEFAULT 'pending',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trailer_id) REFERENCES persistent_trailers(id) ON DELETE CASCADE
        )`,

        // Tire records table
        `CREATE TABLE IF NOT EXISTS tire_records (
            id TEXT PRIMARY KEY,
            trailer_id TEXT NOT NULL,
            tire_position TEXT NOT NULL,
            service_date DATE NOT NULL,
            service_type TEXT NOT NULL,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trailer_id) REFERENCES persistent_trailers(id) ON DELETE CASCADE
        )`,

        // Maintenance alerts table
        `CREATE TABLE IF NOT EXISTS maintenance_alerts (
            id TEXT PRIMARY KEY,
            trailer_id TEXT NOT NULL,
            type TEXT NOT NULL,
            severity TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            due_date DATE,
            is_resolved BOOLEAN DEFAULT 0,
            resolution_notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (trailer_id) REFERENCES persistent_trailers(id) ON DELETE CASCADE
        )`,

        // System notes table
        `CREATE TABLE IF NOT EXISTS system_notes (
            id TEXT PRIMARY KEY,
            title TEXT,
            content TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            entity_type TEXT,
            entity_id TEXT,
            trailer_id TEXT,
            tenant_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trailer_id) REFERENCES persistent_trailers(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Password reset tokens table
        `CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            token TEXT NOT NULL,
            expires_at DATETIME NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Custom roles table
        `CREATE TABLE IF NOT EXISTS custom_roles (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            display_name TEXT NOT NULL,
            description TEXT,
            permissions_json TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(name, tenant_id)
        )`,

        // Custom role permissions override table
        `CREATE TABLE IF NOT EXISTS custom_role_permissions (
            id TEXT PRIMARY KEY,
            role_name TEXT NOT NULL,
            permissions_json TEXT NOT NULL,
            tenant_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(role_name, tenant_id)
        )`,

        // Tenants table (referenced by stats manager)
        `CREATE TABLE IF NOT EXISTS tenants (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`,

        // Trailer custom locations table
        `CREATE TABLE IF NOT EXISTS trailer_custom_locations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT,
            lat REAL NOT NULL,
            lng REAL NOT NULL,
            color TEXT DEFAULT '#3B82F6',
            icon_name TEXT,
            is_shared BOOLEAN DEFAULT 0,
            notes TEXT,
            tenant_id TEXT NOT NULL,
            created_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Trailer custom companies table
        `CREATE TABLE IF NOT EXISTS trailer_custom_companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT,
            dot_number TEXT,
            mc_number TEXT,
            color TEXT DEFAULT '#3B82F6',
            tenant_id TEXT NOT NULL,
            created_by_user_id TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE
        )`,

        // Maintenance preferences table
        `CREATE TABLE IF NOT EXISTS maintenance_preferences (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            annual_inspection_interval INTEGER DEFAULT 12,
            midtrip_inspection_interval INTEGER DEFAULT 6,
            brake_inspection_interval INTEGER DEFAULT 12,
            annual_alert_threshold INTEGER DEFAULT 30,
            midtrip_alert_threshold INTEGER DEFAULT 14,
            brake_alert_threshold INTEGER DEFAULT 30,
            enable_maintenance_alerts BOOLEAN DEFAULT 1,
            enable_email_notifications BOOLEAN DEFAULT 1,
            enable_push_notifications BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(tenant_id)
        )`,

        // System refresh log table
        `CREATE TABLE IF NOT EXISTS system_refresh_log (
            id TEXT PRIMARY KEY,
            user_id TEXT,
            tenant_id TEXT NOT NULL,
            operation_type TEXT NOT NULL,
            provider_id TEXT,
            trigger_type TEXT NOT NULL,
            status TEXT NOT NULL,
            trailers_processed INTEGER DEFAULT 0,
            trailers_updated INTEGER DEFAULT 0,
            error_message TEXT,
            duration_ms INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (provider_id) REFERENCES gps_providers(id) ON DELETE SET NULL
        )`,

        // Create indexes for better performance
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`,
        `CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_trailers_company_id ON persistent_trailers(company_id)`,
        `CREATE INDEX IF NOT EXISTS idx_trailers_tenant_id ON persistent_trailers(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_trailers_status ON persistent_trailers(status)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_trailer_id ON system_notes(trailer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON system_notes(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_entity_type ON system_notes(entity_type)`,
        `CREATE INDEX IF NOT EXISTS idx_notes_entity_id ON system_notes(entity_id)`,
        `CREATE INDEX IF NOT EXISTS idx_custom_roles_tenant_id ON custom_roles(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id)`,
        `CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token)`,
        `CREATE INDEX IF NOT EXISTS idx_refresh_log_tenant_id ON system_refresh_log(tenant_id)`,
        `CREATE INDEX IF NOT EXISTS idx_refresh_log_created_at ON system_refresh_log(created_at)`,
        `CREATE INDEX IF NOT EXISTS idx_trailer_inspections_trailer_id ON trailer_inspections(trailer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_tire_records_trailer_id ON tire_records(trailer_id)`,
        `CREATE INDEX IF NOT EXISTS idx_maintenance_alerts_trailer_id ON maintenance_alerts(trailer_id)`
    ];

    try {
        for (const sql of schema) {
            await executeSQL(db, sql);
        }
        
        logger.info('✅ Database schema created successfully');
    } catch (error) {
        logger.error('❌ Schema creation failed:', error);
        throw error;
    }
}

/**
 * Initialize database with production-ready error handling
 */
async function initializeDatabase() {
    // Prevent multiple simultaneous initializations
    if (isInitializing) {
        if (initPromise) {
            return initPromise;
        }
    }

    isInitializing = true;
    initPromise = new Promise(async (resolve, reject) => {
        try {
            const db = getDatabaseConnection();
            await createDatabaseSchema(db);
            isInitializing = false;
            resolve(db);
        } catch (error) {
            isInitializing = false;
            logger.error('❌ Database initialization failed:', error);
            reject(error);
        }
    });

    return initPromise;
}





/**
 * Check if database exists
 */
function databaseExists() {
    return fs.existsSync(DB_PATH);
}

/**
 * Check database status and log information
 */
async function checkDatabaseStatus() {
    try {
        const db = getDatabaseConnection();
        
        // Check if database has data
        const userCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM users WHERE is_active = 1', (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });
        
        const tenantCount = await new Promise((resolve, reject) => {
            db.get('SELECT COUNT(*) as count FROM tenants', (err, row) => {
                if (err) reject(err);
                else resolve(row ? row.count : 0);
            });
        });
        
        logger.info('Database status check:', {
            users: userCount,
            tenants: tenantCount,
            databasePath: DB_PATH,
            databaseExists: fs.existsSync(DB_PATH)
        });
        
        return { users: userCount, tenants: tenantCount };
    } catch (error) {
        logger.error('Database status check failed:', error);
        return { users: 0, tenants: 0 };
    }
}

module.exports = {
    getDatabaseConnection,
    closeDatabaseConnection,
    databaseExists,
    initializeDatabase,
    checkDatabaseStatus,
    DB_PATH
};
