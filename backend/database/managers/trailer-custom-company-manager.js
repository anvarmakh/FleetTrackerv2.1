/**
 * Trailer Custom Company Manager
 * Handles trailer-specific custom company operations for multi-tenant organizations
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');
const BaseManager = require('./baseManager');

class TrailerCustomCompanyManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // TRAILER CUSTOM COMPANY MANAGEMENT
    // ============================================================================
    
    async createCustomCompany(tenant_id, name, createdByUserId) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            if (!name || name.trim().length === 0) {
                throw new Error('Company name is required');
            }
            
            if (!createdByUserId) {
                throw new Error('Created by user ID is required');
            }
            
            const customCompanyId = generateId('trailer_custom_comp');
            const timestamp = getCurrentTimestamp();

            const result = await executeSingleQuery(this.db, `
                INSERT INTO trailer_custom_companies (
                    id, tenant_id, name, created_by_user_id, created_at
                ) VALUES (?, ?, ?, ?, ?)
            `, [customCompanyId, tenant_id, name, createdByUserId, timestamp]);
            
            return {
                id: customCompanyId,
                name: name,
                tenant_id: tenant_id,
                isCustom: true,
                changes: result.changes
            };
        } catch (error) {
            console.error('Error creating custom company:', error);
            throw new Error('Failed to create custom company');
        }
    }

    async getCustomCompaniesByTenant(tenant_id) {
        try {
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const companies = await executeQuery(this.db, `
                SELECT id, name, tenant_id, created_at, created_by_user_id
                FROM trailer_custom_companies 
                WHERE tenant_id = ?
                ORDER BY created_at ASC
            `, [tenant_id]);
            
            return companies.map(row => ({ ...row, isCustom: true }));
        } catch (error) {
            console.error('Error fetching custom companies by tenant:', error);
            throw new Error('Failed to retrieve custom companies');
        }
    }

    async deleteCustomCompany(customCompanyId, tenant_id) {
        try {
            if (!customCompanyId) {
                throw new Error('Custom company ID is required');
            }
            
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            // First, check if there are any trailers associated with this custom company
            const trailers = await executeQuery(this.db, `
                SELECT id, unit_number FROM persistent_trailers 
                WHERE company_id = ?
            `, [customCompanyId]);
            
            if (trailers.length > 0) {
                throw new Error(`Cannot delete custom company: ${trailers.length} trailer(s) are associated with this company. Please delete or reassign the trailers first.`);
            }
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM trailer_custom_companies 
                WHERE id = ? AND tenant_id = ?
            `, [customCompanyId, tenant_id]);
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting custom company:', error);
            throw new Error(error.message || 'Failed to delete custom company');
        }
    }

    async verifyCustomCompanyOwnership(customCompanyId, tenant_id) {
        try {
            if (!customCompanyId) {
                throw new Error('Custom company ID is required');
            }
            
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const company = await executeQueryFirst(this.db, `
                SELECT id, name, tenant_id, created_at, created_by_user_id
                FROM trailer_custom_companies 
                WHERE id = ? AND tenant_id = ?
            `, [customCompanyId, tenant_id]);
            
            return company ? { ...company, isCustom: true } : null;
        } catch (error) {
            console.error('Error verifying custom company ownership:', error);
            throw new Error('Failed to verify custom company ownership');
        }
    }

    async getCustomCompanyById(customCompanyId, tenant_id) {
        try {
            if (!customCompanyId) {
                throw new Error('Custom company ID is required');
            }
            
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const company = await executeQueryFirst(this.db, `
                SELECT id, name, tenant_id, created_at, created_by_user_id
                FROM trailer_custom_companies 
                WHERE id = ? AND tenant_id = ?
            `, [customCompanyId, tenant_id]);
            
            return company ? { ...company, isCustom: true } : null;
        } catch (error) {
            console.error('Error getting custom company by ID:', error);
            throw new Error('Failed to retrieve custom company');
        }
    }

    async updateCustomCompany(customCompanyId, tenant_id, updates) {
        try {
            if (!customCompanyId) {
                throw new Error('Custom company ID is required');
            }
            
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            const { name } = updates;
            
            if (name !== undefined && name.trim().length === 0) {
                throw new Error('Company name cannot be empty');
            }
            
            let query = `UPDATE trailer_custom_companies SET `;
            let params = [];
            let setClauses = [];
            
            if (name !== undefined) {
                setClauses.push('name = ?');
                params.push(name);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            query += setClauses.join(', ');
            query += ` WHERE id = ? AND tenant_id = ?`;
            params.push(customCompanyId, tenant_id);
            
            const result = await executeSingleQuery(this.db, query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating custom company:', error);
            throw new Error('Failed to update custom company');
        }
    }

    async getAllCustomCompanies() {
        try {
            const companies = await executeQuery(this.db, `
                SELECT id, name, tenant_id, created_at, created_by_user_id
                FROM trailer_custom_companies 
                ORDER BY created_at DESC
            `);
            
            return companies.map(row => ({ ...row, isCustom: true }));
        } catch (error) {
            console.error('Error fetching all custom companies:', error);
            throw new Error('Failed to retrieve custom companies');
        }
    }

    async getCustomCompaniesByUser(createdByUserId) {
        try {
            if (!createdByUserId) {
                throw new Error('Created by user ID is required');
            }
            
            const companies = await executeQuery(this.db, `
                SELECT id, name, tenant_id, created_at, created_by_user_id
                FROM trailer_custom_companies 
                WHERE created_by_user_id = ?
                ORDER BY created_at DESC
            `, [createdByUserId]);
            
            return companies.map(row => ({ ...row, isCustom: true }));
        } catch (error) {
            console.error('Error fetching custom companies by user:', error);
            throw new Error('Failed to retrieve custom companies by user');
        }
    }

    async checkCustomCompanyNameExists(name, tenant_id, excludeCompanyId = null) {
        try {
            if (!name) {
                throw new Error('Company name is required');
            }
            
            if (!tenant_id) {
                throw new Error('Tenant ID is required');
            }
            
            let query = `
                SELECT COUNT(*) as count
                FROM trailer_custom_companies 
                WHERE name = ? AND tenant_id = ?
            `;
            let params = [name, tenant_id];
            
            if (excludeCompanyId) {
                query += ` AND id != ?`;
                params.push(excludeCompanyId);
            }
            
            const result = await executeQueryFirst(this.db, query, params);
            return result.count > 0;
        } catch (error) {
            console.error('Error checking custom company name existence:', error);
            throw new Error('Failed to check custom company name existence');
        }
    }
}

module.exports = TrailerCustomCompanyManager;

