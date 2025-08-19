const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { systemNotesManager, trailerManager, companyManager, trailerCustomCompanyManager, userManager } = require('../database/database-manager');
const { asyncHandler } = require('../middleware/error-handling');
const logger = require('../utils/logger');

const router = express.Router();

// ============================================================================
// TRAILER NOTES (for backward compatibility and specific trailer notes)
// ============================================================================

// Get all notes for a trailer
router.get('/trailer/:trailerId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        // Verify trailer ownership (check all companies the user has access to)
        const trailer = await trailerManager.getTrailerById(trailerId);
        if (!trailer) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found'
            });
        }
        
        let hasAccess = false;
        
        // Check active company first
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (activeCompany && trailer.companyId === activeCompany.id) {
            hasAccess = true;
        }
        
        // If not in active company, check all user companies
        if (!hasAccess) {
            const user = await userManager.getUserProfile(req.user.id);
            if (user && user.tenantId) {
                const allCompanies = await companyManager.getUserCompanies(req.user.id, user.tenantId, null, { limit: 100 });
                for (const company of allCompanies.data) {
                    if (trailer.companyId === company.id) {
                        hasAccess = true;
                        break;
                    }
                }
                
                // Also check custom companies
                if (!hasAccess) {
                    const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, user.tenantId);
                    if (customCompany) {
                        hasAccess = true;
                    }
                }
            }
        }
        
        if (!hasAccess) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found or access denied'
            });
        }
        
        const notes = await systemNotesManager.getTrailerNotes(trailerId);
        
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        console.error('Error fetching trailer notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trailer notes'
        });
    }
}));

// Create a new note for a trailer
router.post('/trailer/:trailerId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { trailerId } = req.params;
        const noteData = req.body;
        
        // Debug: Log the request data
        logger.debug('Creating trailer note', { trailerId, noteData, userId: req.user.id });
        
        // Verify trailer ownership (check all companies the user has access to)
        const trailer = await trailerManager.getTrailerById(trailerId);
        if (!trailer) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found'
            });
        }
        
        let hasAccess = false;
        
        // Check active company first
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (activeCompany && trailer.companyId === activeCompany.id) {
            hasAccess = true;
        }
        
        // If not in active company, check all user companies
        if (!hasAccess) {
            const user = await userManager.getUserProfile(req.user.id);
            if (user && user.tenantId) {
                const allCompanies = await companyManager.getUserCompanies(req.user.id, user.tenantId, null, { limit: 100 });
                for (const company of allCompanies.data) {
                    if (trailer.companyId === company.id) {
                        hasAccess = true;
                        break;
                    }
                }
                
                // Also check custom companies
                if (!hasAccess) {
                    const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(trailer.companyId, user.tenantId);
                    if (customCompany) {
                        hasAccess = true;
                    }
                }
            }
        }
        
        if (!hasAccess) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found or access denied'
            });
        }
        
        const note = await systemNotesManager.createTrailerNote(trailerId, req.user.id, noteData, req.user.tenantId);
        
        res.json({
            success: true,
            data: note
        });
    } catch (error) {
        console.error('Error creating trailer note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create trailer note'
        });
    }
}));

// ============================================================================
// UNIVERSAL NOTES (for any entity type)
// ============================================================================

// Get all notes for any entity type
router.get('/:entityType/:entityId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        
        // Validate entity type
        const validEntityTypes = ['trailer', 'driver', 'load', 'company', 'user'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid entity type'
            });
        }
        
        // TODO: Add entity-specific access validation here
        // For now, allow access to all notes (implement proper validation later)
        
        const notes = await systemNotesManager.getNotes(entityType, entityId);
        
        res.json({
            success: true,
            data: notes
        });
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch notes'
        });
    }
}));

// Create a new note for any entity type
router.post('/:entityType/:entityId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const noteData = req.body;
        
        // Validate entity type
        const validEntityTypes = ['trailer', 'driver', 'load', 'company', 'user'];
        if (!validEntityTypes.includes(entityType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid entity type'
            });
        }
        
        // TODO: Add entity-specific access validation here
        // For now, allow creating notes for all entities (implement proper validation later)
        
        const result = await systemNotesManager.createNote(entityType, entityId, req.user.id, noteData, req.user.tenantId);
        
        logger.info('Note created', { entityType, entityId, userEmail: req.user.email });
        
        res.json({
            success: true,
            message: 'Note created successfully',
            data: { id: result.id }
        });
    } catch (error) {
        console.error('Error creating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create note'
        });
    }
}));

// Update a note
router.put('/:noteId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { noteId } = req.params;
        const updates = req.body;
        
        const result = await systemNotesManager.updateNote(noteId, req.user.id, updates);
        
        logger.info('Note updated', { noteId, userEmail: req.user.email });
        
        res.json({
            success: true,
            message: 'Note updated successfully'
        });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update note'
        });
    }
}));

// Delete a note
router.delete('/:noteId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { noteId } = req.params;
        
        const result = await systemNotesManager.deleteNote(noteId, req.user.id);
        
        logger.info('Note deleted', { noteId, userEmail: req.user.email });
        
        res.json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete note'
        });
    }
}));

// Get recent notes across all entities (for dashboard)
router.get('/recent/:limit?', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
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
        console.error('Error fetching recent notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch recent notes'
        });
    }
}));

// Get notes by user
router.get('/user/:userId', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const { entityType, category, limit } = req.query;
        
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
        console.error('Error fetching user notes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch user notes'
        });
    }
}));

module.exports = router;
