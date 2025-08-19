/**
 * System Notes Manager
 * Handles system-wide notes functionality for all entities (trailers, drivers, loads, companies, users, etc.)
 * Extracted from trailer-notes-manager.js and enhanced for system-wide use
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');

const { NOTE_CATEGORIES } = require('../../utils/constants');
const BaseManager = require('./baseManager');

// Supported entity types for system-wide notes
const ENTITY_TYPES = {
    TRAILER: 'trailer',
    DRIVER: 'driver',
    LOAD: 'load',
    COMPANY: 'company',
    USER: 'user',
    MAINTENANCE: 'maintenance',
    DISPATCH: 'dispatch',
    SAFETY: 'safety'
};

class SystemNotesManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // SYSTEM NOTES MANAGEMENT
    // ============================================================================
    
    /**
     * Create a note for any entity type
     */
    async createNote(entityType, entityId, userId, noteData, tenantId = null) {
        try {
            // Debug: Log the parameters
            console.log('🔍 createNote called with:', { entityType, entityId, userId, noteData, tenantId });
            
            const { content, category = 'general' } = noteData;
            
            if (!content || content.trim().length === 0) {
                throw new Error('Note content is required');
            }
            
            if (!entityType || !Object.values(ENTITY_TYPES).includes(entityType)) {
                throw new Error('Invalid entity type');
            }
            
            if (!entityId) {
                throw new Error('Entity ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            if (category && !Object.values(NOTE_CATEGORIES).includes(category)) {
                throw new Error('Invalid note category');
            }
            
            const noteId = generateId('note');
            const timestamp = getCurrentTimestamp();

            // Generate a title from the content (first 50 characters)
            const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
            
            const result = await executeSingleQuery(this.db, `
                INSERT INTO system_notes (
                    id, entity_type, entity_id, title, content, category, tenant_id, created_by, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [noteId, entityType, entityId, title, content, category, tenantId, userId, timestamp]);
            
            return { id: noteId, changes: result.changes };
        } catch (error) {
            console.error('Error creating system note:', error);
            throw new Error('Failed to create note');
        }
    }

    /**
     * Get all notes for a specific entity
     */
    async getNotes(entityType, entityId) {
        try {
            if (!entityType || !Object.values(ENTITY_TYPES).includes(entityType)) {
                throw new Error('Invalid entity type');
            }
            
            if (!entityId) {
                throw new Error('Entity ID is required');
            }
            
            return await executeQuery(this.db, `
                SELECT sn.*, u.first_name, u.last_name, u.email
                FROM system_notes sn
                LEFT JOIN users u ON sn.created_by = u.id
                WHERE sn.entity_type = ? AND sn.entity_id = ?
                ORDER BY sn.created_at DESC
            `, [entityType, entityId]);
        } catch (error) {
            console.error('Error fetching system notes:', error);
            throw new Error('Failed to retrieve notes');
        }
    }

    /**
     * Update a note
     */
    async updateNote(noteId, userId, updates) {
        try {
            if (!noteId) {
                throw new Error('Note ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const { content, category } = updates;
            
            if (content !== undefined && content.trim().length === 0) {
                throw new Error('Note content cannot be empty');
            }
            
            if (category && !Object.values(NOTE_CATEGORIES).includes(category)) {
                throw new Error('Invalid note category');
            }
            
            let query = `UPDATE system_notes SET `;
            let params = [];
            let setClauses = [];
            
            if (content !== undefined) {
                setClauses.push('content = ?');
                params.push(content);
            }
            if (category !== undefined) {
                setClauses.push('category = ?');
                params.push(category);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            setClauses.push('updated_at = ?');
            params.push(getCurrentTimestamp());
            
            query += setClauses.join(', ');
            query += ` WHERE id = ? AND created_by = ?`;
            params.push(noteId, userId);
            
            const result = await executeSingleQuery(this.db, query, params);
            
            if (result.changes === 0) {
                throw new Error('Note not found or you do not have permission to update it');
            }
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating system note:', error);
            throw new Error('Failed to update note');
        }
    }

    /**
     * Delete a note
     */
    async deleteNote(noteId, userId) {
        try {
            if (!noteId) {
                throw new Error('Note ID is required');
            }
            
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            const result = await executeSingleQuery(this.db, `
                DELETE FROM system_notes 
                WHERE id = ? AND created_by = ?
            `, [noteId, userId]);
            
            if (result.changes === 0) {
                throw new Error('Note not found or you do not have permission to delete it');
            }
            
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting system note:', error);
            throw new Error('Failed to delete note');
        }
    }

    /**
     * Get a specific note by ID
     */
    async getNoteById(noteId, userId) {
        try {
            if (!noteId) {
                throw new Error('Note ID is required');
            }
            
            const note = await executeQueryFirst(this.db, `
                SELECT sn.*, u.first_name, u.last_name, u.email
                FROM system_notes sn
                LEFT JOIN users u ON sn.created_by = u.id
                WHERE sn.id = ?
            `, [noteId]);
            
            if (!note) {
                return null;
            }
            
            // Check if user has permission to view this note
            if (note.created_by !== userId) {
                // TODO: Add permission checking logic here if needed
                // For now, allow viewing if user has access to the entity
            }
            
            return note;
        } catch (error) {
            console.error('Error getting system note by ID:', error);
            throw new Error('Failed to retrieve note');
        }
    }

    /**
     * Get notes by category for a specific entity
     */
    async getNotesByCategory(entityType, entityId, category) {
        try {
            if (!entityType || !Object.values(ENTITY_TYPES).includes(entityType)) {
                throw new Error('Invalid entity type');
            }
            
            if (!entityId) {
                throw new Error('Entity ID is required');
            }
            
            if (!category || !Object.values(NOTE_CATEGORIES).includes(category)) {
                throw new Error('Invalid note category');
            }
            
            return await executeQuery(this.db, `
                SELECT sn.*, u.first_name, u.last_name, u.email
                FROM system_notes sn
                LEFT JOIN users u ON sn.created_by = u.id
                WHERE sn.entity_type = ? AND sn.entity_id = ? AND sn.category = ?
                ORDER BY sn.created_at DESC
            `, [entityType, entityId, category]);
        } catch (error) {
            console.error('Error fetching system notes by category:', error);
            throw new Error('Failed to retrieve notes by category');
        }
    }

    /**
     * Get all notes created by a specific user
     */
    async getNotesByUser(userId, filters = {}) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            let query = `
                SELECT sn.*, u.first_name, u.last_name, u.email
                FROM system_notes sn
                LEFT JOIN users u ON sn.created_by = u.id
                WHERE sn.created_by = ?
            `;
            let params = [userId];
            
            if (filters.entityType) {
                query += ` AND sn.entity_type = ?`;
                params.push(filters.entityType);
            }
            
            if (filters.category) {
                query += ` AND sn.category = ?`;
                params.push(filters.category);
            }
            
            query += ` ORDER BY sn.created_at DESC`;
            
            if (filters.limit) {
                query += ` LIMIT ?`;
                params.push(filters.limit);
            }
            
            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Error fetching system notes by user:', error);
            throw new Error('Failed to retrieve notes by user');
        }
    }

    /**
     * Get recent notes across all entities (for dashboard)
     */
    async getRecentNotes(limit = 10, filters = {}) {
        try {
            let query = `
                SELECT sn.*, u.first_name, u.last_name, u.email
                FROM system_notes sn
                LEFT JOIN users u ON sn.created_by = u.id
            `;
            let params = [];
            let whereClauses = [];
            
            if (filters.entityType) {
                whereClauses.push('sn.entity_type = ?');
                params.push(filters.entityType);
            }
            
            if (filters.category) {
                whereClauses.push('sn.category = ?');
                params.push(filters.category);
            }
            
            if (whereClauses.length > 0) {
                query += ` WHERE ` + whereClauses.join(' AND ');
            }
            
            query += ` ORDER BY sn.created_at DESC LIMIT ?`;
            params.push(limit);
            
            return await executeQuery(this.db, query, params);
        } catch (error) {
            console.error('Error fetching recent system notes:', error);
            throw new Error('Failed to retrieve recent notes');
        }
    }

    // ============================================================================
    // CONVENIENCE METHODS FOR SPECIFIC ENTITY TYPES
    // ============================================================================
    
    /**
     * Convenience method for trailer notes (backward compatibility)
     */
    async getTrailerNotes(trailerId) {
        return this.getNotes(ENTITY_TYPES.TRAILER, trailerId);
    }

    /**
     * Convenience method for creating trailer notes (backward compatibility)
     */
    async createTrailerNote(trailerId, userId, noteData, tenantId = null) {
        return this.createNote(ENTITY_TYPES.TRAILER, trailerId, userId, noteData, tenantId);
    }

    /**
     * Convenience method for driver notes
     */
    async getDriverNotes(driverId) {
        return this.getNotes(ENTITY_TYPES.DRIVER, driverId);
    }

    /**
     * Convenience method for creating driver notes
     */
    async createDriverNote(driverId, userId, noteData) {
        return this.createNote(ENTITY_TYPES.DRIVER, driverId, userId, noteData);
    }

    /**
     * Convenience method for load notes
     */
    async getLoadNotes(loadId) {
        return this.getNotes(ENTITY_TYPES.LOAD, loadId);
    }

    /**
     * Convenience method for creating load notes
     */
    async createLoadNote(loadId, userId, noteData) {
        return this.createNote(ENTITY_TYPES.LOAD, loadId, userId, noteData);
    }

    /**
     * Convenience method for company notes
     */
    async getCompanyNotes(companyId) {
        return this.getNotes(ENTITY_TYPES.COMPANY, companyId);
    }

    /**
     * Convenience method for creating company notes
     */
    async createCompanyNote(companyId, userId, noteData) {
        return this.createNote(ENTITY_TYPES.COMPANY, companyId, userId, noteData);
    }

    /**
     * Convenience method for user notes
     */
    async getUserNotes(userId) {
        return this.getNotes(ENTITY_TYPES.USER, userId);
    }

    /**
     * Convenience method for creating user notes
     */
    async createUserNote(userId, createdByUserId, noteData) {
        return this.createNote(ENTITY_TYPES.USER, userId, createdByUserId, noteData);
    }
}

module.exports = { SystemNotesManager, ENTITY_TYPES };
