/**
 * Database helper utilities
 * Common functions used across database operations
 * Aligned with existing project patterns
 */

const { v4: uuidv4 } = require('uuid');
/**
 * Generate a unique ID with optional prefix
 */
function generateId(prefix = '') {
    const uuid = uuidv4();
    return prefix ? `${prefix}_${uuid}` : uuid;
}

/**
 * Get current timestamp in ISO format
 */
function getCurrentTimestamp() {
    return new Date().toISOString();
}

/**
 * Format date for database storage
 */
function formatDateForDB(date) {
    if (!date) return null;
    if (typeof date === 'string') {
        return new Date(date).toISOString();
    }
    if (date instanceof Date) {
        return date.toISOString();
    }
    return null;
}

/**
 * Parse date from database format
 */
function parseDateFromDB(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

/**
 * Create a promise wrapper for database operations
 */
function createDBPromise(operation) {
    return new Promise((resolve, reject) => {
        try {
            operation((err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Execute a database query with parameters
 */
function executeQuery(db, sql, params = []) {
    return createDBPromise((callback) => {
        db.all(sql, params, callback);
    });
}

/**
 * Execute a single database query (for INSERT, UPDATE, DELETE)
 */
function executeSingleQuery(db, sql, params = []) {
    return createDBPromise((callback) => {
        db.run(sql, params, function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null, this);
            }
        });
    });
}

/**
 * Execute a database query and get the first result
 */
function executeQueryFirst(db, sql, params = []) {
    return createDBPromise((callback) => {
        db.get(sql, params, callback);
    });
}

/**
 * Begin a database transaction
 */
function beginTransaction(db) {
    return executeSingleQuery(db, 'BEGIN TRANSACTION');
}

/**
 * Commit a database transaction
 */
function commitTransaction(db) {
    return executeSingleQuery(db, 'COMMIT');
}

/**
 * Rollback a database transaction
 */
function rollbackTransaction(db) {
    return executeSingleQuery(db, 'ROLLBACK');
}

/**
 * Execute multiple queries in a transaction
 */
async function executeInTransaction(db, queries) {
    try {
        await beginTransaction(db);
        
        for (const query of queries) {
            if (query.type === 'all') {
                await executeQuery(db, query.sql, query.params || []);
            } else if (query.type === 'run') {
                await executeSingleQuery(db, query.sql, query.params || []);
            } else if (query.type === 'get') {
                await executeQueryFirst(db, query.sql, query.params || []);
            }
        }
        
        await commitTransaction(db);
        return true;
    } catch (error) {
        await rollbackTransaction(db);
        throw error;
    }
}

// Validation functions removed - use inline validation like original database-manager.js

/**
 * Build WHERE clause for filtering
 */
function buildWhereClause(filters, allowedFields) {
    const conditions = [];
    const params = [];
    
    for (const [field, value] of Object.entries(filters)) {
        if (allowedFields.includes(field) && value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                const placeholders = value.map(() => '?').join(',');
                conditions.push(`${field} IN (${placeholders})`);
                params.push(...value);
            } else {
                conditions.push(`${field} = ?`);
                params.push(value);
            }
        }
    }
    
    return {
        whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
        params
    };
}

/**
 * Build ORDER BY clause
 */
function buildOrderByClause(sortBy, sortOrder, allowedFields = []) {
    if (!sortBy) {
        return '';
    }
    // Enforce whitelist if provided
    if (Array.isArray(allowedFields) && allowedFields.length > 0) {
        if (!allowedFields.includes(sortBy)) {
            return '';
        }
    }
    const order = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    return `ORDER BY ${sortBy} ${order}`;
}

/**
 * Build LIMIT clause for pagination with parameters
 * Returns an object with clause and parameters for safe SQL execution
 */
function buildLimitClause(page, limit, maxLimit = 100) {
    const validPage = Math.max(parseInt(page) || 1, 1);
    const validLimit = Math.min(Math.max(parseInt(limit) || 20, 1), maxLimit);
    const offset = (validPage - 1) * validLimit;
    
    return {
        clause: 'LIMIT ? OFFSET ?',
        params: [validLimit, offset]
    };
}



// Encryption functions removed - use EncryptionUtil from ../../utils/encryption.js

/**
 * Check if table exists
 */
function tableExists(db, tableName) {
    return executeQueryFirst(db, 
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?", 
        [tableName]
    ).then(result => !!result);
}

/**
 * Get table schema
 */
function getTableSchema(db, tableName) {
    return executeQuery(db, `PRAGMA table_info(${tableName})`);
}

/**
 * Create index if it doesn't exist
 */
function createIndexIfNotExists(db, indexName, tableName, columns) {
    const sql = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName} (${columns})`;
    return executeSingleQuery(db, sql);
}

/**
 * Convert snake_case string to camelCase
 */
function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
function camelToSnake(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Validate field name to prevent SQL injection
 * @param {string} fieldName - Field name to validate
 * @returns {boolean} True if valid
 */
function isValidFieldName(fieldName) {
    if (!fieldName || typeof fieldName !== 'string') {
        return false;
    }
    
    // Allow only alphanumeric characters, underscores, and dots
    const validFieldPattern = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;
    return validFieldPattern.test(fieldName);
}

/**
 * Validate table name to prevent SQL injection
 * @param {string} tableName - Table name to validate
 * @returns {boolean} True if valid
 */
function isValidTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
        return false;
    }
    
    // Allow only alphanumeric characters and underscores
    const validTablePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    return validTablePattern.test(tableName);
}

/**
 * Convert database row object from snake_case to camelCase
 */
function convertRowToCamelCase(row) {
    if (!row || typeof row !== 'object') {
        return row;
    }
    
    const camelCaseRow = {};
    for (const [key, value] of Object.entries(row)) {
        const camelKey = snakeToCamel(key);
        camelCaseRow[camelKey] = value;
    }
    
    return camelCaseRow;
}

/**
 * Convert array of database rows from snake_case to camelCase
 */
function convertRowsToCamelCase(rows) {
    if (!Array.isArray(rows)) {
        return rows;
    }
    
    return rows.map(row => convertRowToCamelCase(row));
}

/**
 * Execute a database query and return results in camelCase
 */
function executeQueryCamelCase(db, sql, params = []) {
    return executeQuery(db, sql, params).then(rows => convertRowsToCamelCase(rows));
}

/**
 * Execute a database query and get the first result in camelCase
 */
function executeQueryFirstCamelCase(db, sql, params = []) {
    return executeQueryFirst(db, sql, params).then(row => convertRowToCamelCase(row));
}

function toSnakeCase(obj) {
    // Convert camelCase to snake_case
}

function toCamelCase(obj) {
    // Convert snake_case to camelCase
}

module.exports = {
    generateId,
    getCurrentTimestamp,
    formatDateForDB,
    parseDateFromDB,
    createDBPromise,
    executeQuery,
    executeSingleQuery,
    executeQueryFirst,
    executeQueryCamelCase,
    executeQueryFirstCamelCase,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    executeInTransaction,
    buildWhereClause,
    buildOrderByClause,
    buildLimitClause,
    tableExists,
    getTableSchema,
    createIndexIfNotExists,
    snakeToCamel,
    camelToSnake,
    convertRowToCamelCase,
    convertRowsToCamelCase,
    isValidFieldName,
    isValidTableName
};

