const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { systemNotesManager, trailerManager, companyManager, trailerCustomCompanyManager, userManager } = require('../database/database-manager');
const { asyncHandler } = require('../middleware/error-handling');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================================================
// UNIVERSAL NOTES SYSTEM (consolidated and enhanced)
// ============================================================================

// Valid entity types for notes
const VALID_ENTITY_TYPES = ['trailer', 'driver', 'load', 'company', 'user'];

/**
 * Validate entity access based on entity type
 */
async function validateEntityAccess(entityType, entityId, userId, tenantId, userRole) {
    switch (entityType) {
        case 'trailer':
            return await validateTrailerAccess(entityId, userId, tenantId, userRole);
        case 'company':
            return await validateCompanyAccess(entityId, userId, tenantId, userRole);
        case 'user':
            return await validateUserAccess(entityId, userId, tenantId);
        case 'driver':
        case 'load':
            // TODO: Implement validation for driver and load entities
            return { hasAccess: true, entity: null };
        default:
            return { hasAccess: false, entity: null };
    }
}

/**
 * Validate trailer access
 */
async function validateTrailerAccess(trailerId, userId, tenantId, userRole) {
    const trailer = await trailerManager.getTrailerById(trailerId);
    if (!trailer) {
        return { hasAccess: false, entity: null };
    }

    // Check if it's a custom company trailer
    if (trailer.companyId && trailer.companyId.startsWith('trailer_custom_comp_')) {
        const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, tenantId);
        return { hasAccess: !!customCompany, entity: trailer };
    }

    // Check regular company access
    const company = await companyManager.verifyCompanyOwnership(trailer.companyId, userId, tenantId, userRole);
    return { hasAccess: !!company, entity: trailer };
}

/**
 * Validate company access
 */
async function validateCompanyAccess(companyId, userId, tenantId, userRole) {
    const company = await companyManager.verifyCompanyOwnership(companyId, userId, tenantId, userRole);
    return { hasAccess: !!company, entity: company };
}

/**
 * Validate user access (users can only access their own notes or notes they created)
 */
async function validateUserAccess(userId, currentUserId, tenantId) {
    // Users can access their own notes or notes they created
    return { hasAccess: userId === currentUserId, entity: null };
}

// ============================================================================
// NOTE CRUD OPERATIONS
// ============================================================================

// Get all notes for any entity type
router.get('/:entityType/:entityId', authenticateToken, validateTenant, requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        
        // Validate entity type
        if (!VALID_ENTITY_TYPES.includes(entityType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid entity type. Valid types: ' + VALID_ENTITY_TYPES.join(', ')
            });
        }
        
        // Validate entity access
        const { hasAccess, entity } = await validateEntityAccess(entityType, entityId, req.user.id, req.user.tenantId, req.user.organizationRole);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to entity'
            });
        }
        
        const notes = await systemNotesManager.getNotes(entityType, entityId);
        
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        logger.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notes'
        });
    }
}));

// Create a new note for any entity type
router.post('/:entityType/:entityId', authenticateToken, validateTenant, requirePermission('fleet_create'), asyncHandler(async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const noteData = req.body;
        
        // Validate entity type
        if (!VALID_ENTITY_TYPES.includes(entityType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid entity type. Valid types: ' + VALID_ENTITY_TYPES.join(', ')
            });
        }
        
        // Validate entity access
        const { hasAccess, entity } = await validateEntityAccess(entityType, entityId, req.user.id, req.user.tenantId, req.user.organizationRole);
        if (!hasAccess) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to entity'
            });
        }
        
        const result = await systemNotesManager.createNote(entityType, entityId, req.user.id, noteData, req.user.tenantId);
        
        logger.info('Note created', { 
            entityType, 
            entityId, 
            noteId: result.id,
            userEmail: req.user.email 
        });
        
        res.json({
            success: true,
            message: 'Note created successfully',
            data: { id: result.id }
        });
    } catch (error) {
        logger.error('Error creating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create note'
        });
    }
}));

// Update a note
router.put('/:noteId', authenticateToken, validateTenant, requirePermission('fleet_edit'), asyncHandler(async (req, res) => {
    try {
        const { noteId } = req.params;
        const updates = req.body;
        
        // Validate note ownership (users can only edit their own notes)
        const note = await systemNotesManager.getNoteById(noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                error: 'Note not found'
            });
        }
        
        if (note.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only edit your own notes'
            });
        }
        
        const result = await systemNotesManager.updateNote(noteId, req.user.id, updates);
        
        logger.info('Note updated', { noteId, userEmail: req.user.email });
        
        res.json({
            success: true,
            message: 'Note updated successfully'
        });
    } catch (error) {
        logger.error('Error updating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update note'
        });
    }
}));

// Delete a note
router.delete('/:noteId', authenticateToken, validateTenant, requirePermission('fleet_edit'), asyncHandler(async (req, res) => {
    try {
        const { noteId } = req.params;
        
        // Validate note ownership (users can only delete their own notes)
        const note = await systemNotesManager.getNoteById(noteId);
        if (!note) {
            return res.status(404).json({
                success: false,
                error: 'Note not found'
            });
        }
        
        if (note.created_by !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only delete your own notes'
            });
        }
        
        const result = await systemNotesManager.deleteNote(noteId, req.user.id);
        
        logger.info('Note deleted', { noteId, userEmail: req.user.email });
        
        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        logger.error('Error deleting note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete note'
        });
    }
}));

// ============================================================================
// UTILITY ROUTES
// ============================================================================

// Get recent notes across all entities (for dashboard)
router.get('/recent/:limit?', authenticateToken, validateTenant, requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    try {
        const limit = parseInt(req.params.limit) || 10;
        const { entityType, category } = req.query;
        
        const filters = {};
        if (entityType) filters.entityType = entityType;
        if (category) filters.category = category;
        
        const notes = await systemNotesManager.getRecentNotes(limit, filters);
        
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        logger.error('Error fetching recent notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent notes'
        });
    }
}));

// Get notes by user
router.get('/user/:userId', authenticateToken, validateTenant, requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { entityType, category, limit } = req.query;
        
        // Users can only view their own notes or notes they have permission to see
        if (userId !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'You can only view your own notes'
            });
        }
        
        const filters = {};
        if (entityType) filters.entityType = entityType;
        if (category) filters.category = category;
        if (limit) filters.limit = parseInt(limit);
        
        const notes = await systemNotesManager.getNotesByUser(userId, filters);
        
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        logger.error('Error fetching user notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user notes'
        });
    }
}));

module.exports = router;
