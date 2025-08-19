const {
    generateId,
    getCurrentTimestamp,
    executeSingleQuery,
    executeQuery,
    executeQueryFirst,
    executeQueryCamelCase,
    executeQueryFirstCamelCase,
    executeInTransaction,
    beginTransaction,
    commitTransaction,
    rollbackTransaction,
    buildWhereClause,
    buildOrderByClause,
    buildLimitClause
} = require('../utils/db-helpers');

/**
 * Base class for database managers to reduce boilerplate
 */
class BaseManager {
    constructor(db) {
        if (!db) {
            throw new Error('Database connection is required');
        }
        this.db = db;
    }

    /**
     * Execute a query with error handling
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @param {boolean} camelCase - Whether to convert to camelCase
     * @param {boolean} first - Return first result only
     */
    async execute(query, params = [], { camelCase = false, first = false } = {}) {
        try {
            if (camelCase) {
                return first 
                    ? await executeQueryFirstCamelCase(this.db, query, params)
                    : await executeQueryCamelCase(this.db, query, params);
            }
            return first 
                ? await executeQueryFirst(this.db, query, params)
                : await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Database query error:', error);
            throw new Error(`Failed to execute query: ${error.message}`);
        }
    }

    /**
     * Execute a single query (INSERT/UPDATE/DELETE) with error handling
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<Object>} Result with changes, lastID, etc.
     */
    async executeSingle(query, params = []) {
        try {
            return await executeSingleQuery(this.db, query, params);
        } catch (error) {
            console.error('Database single query error:', error);
            throw new Error(`Failed to execute single query: ${error.message}`);
        }
    }

    /**
     * Execute in transaction with error handling
     * @param {Function} transactionFn - Function to execute in transaction
     */
    async transact(transactionFn) {
        try {
            await beginTransaction(this.db);
            const result = await transactionFn(this.db);
            await commitTransaction(this.db);
            return result;
        } catch (error) {
            await rollbackTransaction(this.db);
            console.error('Transaction error:', error);
            throw new Error(`Transaction failed: ${error.message}`);
        }
    }

    /**
     * Build common query parts
     * @param {Object} filters - Filters for WHERE
     * @param {Object} options - sort, limit, offset
     */
    buildQueryParts(filters, { sort = {}, limit, offset, allowedOrderFields, allowedFields = [] } = {}) {
        const { whereClause, params: whereParams } = buildWhereClause(filters, allowedFields);
        
        // Handle sort object - extract first sort field and order
        let sortBy = null;
        let sortOrder = 'ASC';
        if (sort && typeof sort === 'object' && Object.keys(sort).length > 0) {
            sortBy = Object.keys(sort)[0];
            sortOrder = sort[sortBy] || 'ASC';
        }
        
        const orderBy = buildOrderByClause(sortBy, sortOrder, allowedOrderFields);
        const limitClause = buildLimitClause(limit, offset);
        return { whereClause, whereParams, orderBy, limitClause };
    }

    /**
     * Append common conditions to where clause
     * @param {string} whereClause - Existing where clause
     * @param {Object} options - { activeOnly: true }
     * @returns {string} Updated where clause
     */
    appendCommonConditions(whereClause, { activeOnly = true, alias = null } = {}) {
        let updated = whereClause || '';
        if (activeOnly) {
            const col = alias ? `${alias}.is_active` : 'is_active';
            updated += updated ? ` AND ${col} = 1` : `${col} = 1`;
        }
        return updated;
    }

    /**
     * Generic method to get an entity by ID
     * @param {string} table - Table name
     * @param {string} id - Entity ID
     * @param {string} [fields='*'] - Fields to select
     * @param {Object} [options={}] - Additional options like camelCase
     * @returns {Promise<Object|null>}
     */
    async getEntityById(table, id, fields = '*', options = { camelCase: true }) {
        if (!table || !id) {
            throw new Error('Table and ID are required');
        }
        const query = `SELECT ${fields} FROM ${table} WHERE id = ? AND is_active = 1`;
        return this.execute(query, [id], { ...options, first: true });
    }

    /**
     * Generic method to create an entity
     * @param {string} table - Table name
     * @param {Object} data - Data to insert
     * @returns {Promise<string>} Created entity ID
     */
    async createEntity(table, data) {
        return this.transact(async (tx) => {
            if (!table || !data) {
                throw new Error('Table and data are required');
            }
            const id = generateId(table.toLowerCase().replace(/s$/, ''));
            const fields = ['id', ...Object.keys(data), 'created_at', 'updated_at'];
            const placeholders = fields.map(() => '?').join(', ');
            const values = [id, ...Object.values(data), getCurrentTimestamp(), getCurrentTimestamp()];

            const query = `INSERT INTO ${table} (${fields.join(', ')}) VALUES (${placeholders})`;
            await executeSingleQuery(tx, query, values);
            return id;
        });
    }

    /**
     * Generic method to update an entity
     * @param {string} table - Table name
     * @param {string} id - Entity ID
     * @param {Object} updates - Fields to update
     * @returns {Promise<Object>} Update result
     */
    async updateEntity(table, id, updates) {
        return this.transact(async (tx) => {
            if (!table || !id || !updates || Object.keys(updates).length === 0) {
                throw new Error('Table, ID, and updates are required');
            }

            const fields = Object.keys(updates).map(field => `${field} = ?`).join(', ');
            const values = [...Object.values(updates), getCurrentTimestamp(), id];

            const query = `UPDATE ${table} SET ${fields}, updated_at = ? WHERE id = ? AND is_active = 1`;
            const result = await executeSingleQuery(tx, query, values);

            if (result.changes === 0) {
                throw new Error('Entity not found or not active');
            }

            return { success: true, changes: result.changes };
        });
    }

    /**
     * Generic method to delete an entity (soft or hard)
     * @param {string} table - Table name
     * @param {string} id - Entity ID
     * @param {boolean} [soft=true] - If true, set is_active=0; else hard delete
     * @returns {Promise<Object>} Delete result
     */
    async deleteEntity(table, id, soft = true) {
        return this.transact(async (tx) => {
            if (!table || !id) {
                throw new Error('Table and ID are required');
            }

            let query;
            if (soft) {
                query = `UPDATE ${table} SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND is_active = 1`;
            } else {
                query = `DELETE FROM ${table} WHERE id = ?`;
            }

            const result = await executeSingleQuery(tx, query, [id]);

            if (result.changes === 0) {
                throw new Error('Entity not found');
            }

            return { success: true, changes: result.changes, soft };
        });
    }

    // Add more common methods as needed, e.g., basic create/update templates
}

module.exports = BaseManager;
