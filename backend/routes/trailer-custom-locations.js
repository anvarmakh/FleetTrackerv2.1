const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { trailerCustomLocationManager, companyManager, trailerCustomCompanyManager } = require('../database/database-manager');

const router = express.Router();

// Get all custom locations for the authenticated user
router.get('/', authenticateToken, validateTenant, async (req, res) => {
    try {
        // Get user's active company
        let activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        // If no active regular company, check for custom companies
        if (!activeCompany) {
            const customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(req.user.tenantId);
            if (customCompanies.length > 0) {
                // Use the first custom company as active company
                activeCompany = customCompanies[0];
            }
        }
        
        // If no active company (regular or custom), return empty locations
        if (!activeCompany) {
            return res.json({
                success: true,
                data: [],
                message: 'No active company found. Please create a company first.'
            });
        }
        
        const locations = await trailerCustomLocationManager.getCompanyLocations(req.user.tenantId, req.user.id);
        
        res.json({
            success: true,
            data: locations
        });
    } catch (error) {
        console.error('Error fetching custom locations:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch custom locations' 
        });
    }
});

// Create a new custom location
router.post('/', authenticateToken, validateTenant, async (req, res) => {
    try {
        // Get user's active company
        let activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        // If no active regular company, check for custom companies
        if (!activeCompany) {
            const customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(req.user.tenantId);
            if (customCompanies.length > 0) {
                // Use the first custom company as active company
                activeCompany = customCompanies[0];
            }
        }
        
        if (!activeCompany) {
            return res.status(400).json({ 
                success: false, 
                error: 'No active company found. Please create a company first.' 
            });
        }
        
        const locationData = {
            ...req.body,
            company_id: activeCompany.id
        };
        
        const location = await trailerCustomLocationManager.createLocation(req.user.id, req.user.tenantId, locationData);
        
        res.json({
            success: true,
            data: location
        });
    } catch (error) {
        console.error('Error creating custom location:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to create custom location' 
        });
    }
});

// Update a custom location
router.put('/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user's active company
        let activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        // If no active regular company, check for custom companies
        if (!activeCompany) {
            const customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(req.user.tenantId);
            if (customCompanies.length > 0) {
                // Use the first custom company as active company
                activeCompany = customCompanies[0];
            }
        }
        
        if (!activeCompany) {
            return res.status(400).json({ 
                success: false, 
                error: 'No active company found. Please create a company first.' 
            });
        }
        
        // Verify location ownership
        const location = await trailerCustomLocationManager.getLocationById(id, req.user.id);
        if (!location) {
            return res.status(404).json({
                success: false,
                error: 'Location not found or access denied'
            });
        }
        
        const updatedLocation = await trailerCustomLocationManager.updateLocation(id, req.user.id, req.body);
        
        if (updatedLocation) {
            res.json({
                success: true,
                data: updatedLocation
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Failed to update location'
            });
        }
    } catch (error) {
        console.error('Error updating custom location:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update custom location' 
        });
    }
});

// Delete a custom location
router.delete('/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get user's active company
        let activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        // If no active regular company, check for custom companies
        if (!activeCompany) {
            const customCompanies = await trailerCustomCompanyManager.getCustomCompaniesByTenant(req.user.tenantId);
            if (customCompanies.length > 0) {
                // Use the first custom company as active company
                activeCompany = customCompanies[0];
            }
        }
        
        if (!activeCompany) {
            return res.status(400).json({ 
                success: false, 
                error: 'No active company found. Please create a company first.' 
            });
        }
        
        // Verify location ownership
        const location = await trailerCustomLocationManager.getLocationById(id, req.user.id);
        if (!location) {
            return res.status(404).json({
                success: false,
                error: 'Location not found or access denied'
            });
        }
        
        await trailerCustomLocationManager.deleteLocation(id, req.user.id);
        
        res.json({
            success: true,
            message: 'Custom location deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting custom location:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to delete custom location' 
        });
    }
});

module.exports = router; 
