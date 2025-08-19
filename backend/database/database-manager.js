/**
 * Database Manager - Centralized Access Hub
 *
 * This file serves as the primary entry point for all database-related
 * functionality, providing access to manager instances and utilities.
 *
 * All actual database operations have been moved to individual manager classes
 * in the backend/database/managers/ directory.
 */

// Import the new modular managers
const UserManager = require('./managers/user-manager');
const TrailerManager = require('./managers/trailer-manager');
const CompanyManager = require('./managers/company-manager');
const GPSProviderManager = require('./managers/gps-provider-manager');
const MaintenanceManager = require('./managers/maintenance-manager');
const { SystemNotesManager } = require('./managers/system-notes-manager');
const TrailerCustomCompanyManager = require('./managers/trailer-custom-company-manager');
const TrailerCustomLocationManager = require('./managers/trailer-custom-location-manager');
const StatsManager = require('./managers/stats-manager');
const PermissionsManager = require('./managers/permissions-manager'); // Keep class for static methods
const MaintenancePreferencesManager = require('./managers/maintenance-preferences-manager');

// Import database utilities
const { getDatabaseConnection, closeDatabaseConnection, DB_PATH } = require('./database-initializer');
const { extractCityStateFromString } = require('./utils/database-utilities');

// Manager instances cache
let managers = {};

/**
 * Get or create a manager instance
 */
function getManager(name) {
    if (!managers[name]) {
        const db = getDatabaseConnection();
        
        switch (name) {
            case 'userManager':
                managers[name] = new UserManager(db);
                break;
            case 'trailerManager':
                managers[name] = new TrailerManager(db);
                break;
            case 'companyManager':
                managers[name] = new CompanyManager(db);
                break;
            case 'gpsProviderManager':
                managers[name] = new GPSProviderManager(db);
                break;
            case 'maintenanceManager':
                managers[name] = new MaintenanceManager(db);
                break;
            case 'systemNotesManager':
                managers[name] = new SystemNotesManager(db);
                break;
            case 'trailerCustomCompanyManager':
                managers[name] = new TrailerCustomCompanyManager(db);
                break;
            case 'trailerCustomLocationManager':
                managers[name] = new TrailerCustomLocationManager(db);
                break;
            case 'statsManager':
                const statsManager = new StatsManager(db);
                // Set dependencies after other managers are available
                statsManager.setDependencies(
                    getManager('userManager'),
                    getManager('companyManager'),
                    getManager('trailerCustomCompanyManager')
                );
                managers[name] = statsManager;
                break;
            case 'maintenancePreferencesManager':
                managers[name] = new MaintenancePreferencesManager(db);
                break;
            case 'permissionsManager':
                managers[name] = new PermissionsManager(db);
                break;
            default:
                throw new Error(`Unknown manager: ${name}`);
        }
    }
    
    return managers[name];
}

/**
 * Clear manager cache (useful for testing or reinitialization)
 */
function clearManagers() {
    managers = {};
}

module.exports = {
    // Database connection functions
    getDatabaseConnection,
    closeDatabaseConnection,
    dbPath: DB_PATH,
    
    // Manager instances (lazy-loaded)
    get userManager() { return getManager('userManager'); },
    get trailerManager() { return getManager('trailerManager'); },
    get companyManager() { return getManager('companyManager'); },
    get gpsProviderManager() { return getManager('gpsProviderManager'); },
    get maintenanceManager() { return getManager('maintenanceManager'); },
    get systemNotesManager() { return getManager('systemNotesManager'); },
    get trailerCustomCompanyManager() { return getManager('trailerCustomCompanyManager'); },
    get trailerCustomLocationManager() { return getManager('trailerCustomLocationManager'); },
    get statsManager() { return getManager('statsManager'); },
    get maintenancePreferencesManager() { return getManager('maintenancePreferencesManager'); },
    get permissionsManager() { return getManager('permissionsManager'); },
    
    // Static permission manager
    PermissionsManager,
    
    // Utility functions
    extractCityStateFromString,
    
    // Utility functions
    clearManagers
};
