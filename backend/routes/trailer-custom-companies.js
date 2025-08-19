const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { trailerCustomCompanyManager } = require('../database/database-manager');

const router = express.Router();

// Get all custom companies for the authenticated user
router.get('/', authenticateToken, validateTenant, async (req, res) => {
    try {
        // Use tenantId from JWT token directly
        const customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(req.user.tenantId);
        
        res.json({
            success: true,
            data: customCompanies
        });
    } catch (error) {
        console.error('Error fetching custom companies:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch custom companies'
        });
    }
});

// Create a new custom company
router.post('/', authenticateToken, validateTenant, async (req, res) => {
    try {
        const company = await trailerCustomCompanyManager.createCustomCompany(
            req.user.tenantId,
            req.body.name,
            req.user.id
        );
        
        res.json({
            success: true,
            data: company
        });
    } catch (error) {
        console.error('Error creating custom company:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create custom company'
        });
    }
});

// Delete a custom company
router.delete('/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;

        // Verify ownership
        const customCompany = await trailerCustomCompanyManager.verifyCustomCompanyOwnership(id, req.user.tenantId);
        if (!customCompany) {
            return res.status(404).json({
                success: false,
                error: 'Custom company not found or access denied'
            });
        }

        const result = await trailerCustomCompanyManager.deleteCustomCompany(id, req.user.tenantId);
        
        res.json({
            success: true,
            message: 'Custom company deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting custom company:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete custom company'
        });
    }
});

module.exports = router; 
