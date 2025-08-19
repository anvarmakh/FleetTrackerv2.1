const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { companyManager } = require('../database/database-manager');
const logger = require('../utils/logger');
const { asyncHandler } = require('../middleware/error-handling');

const router = express.Router();

// Get companies for filtering (available to all users)
router.get('/filter', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        // Validate that user has a tenant ID
        if (!req.user.tenantId) {
            return res.json({
                success: true,
                companies: [],
                message: 'No tenant assigned yet'
            });
        }

        const companiesResponse = await companyManager.getUserCompanies(req.user.id, req.user.tenantId, req.user.organizationRole || 'user', { limit: 100 });
        res.json({ 
            success: true,
            companies: companiesResponse.data || []
        });
    } catch (error) {
        console.error('Error fetching companies for filtering:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch companies' 
        });
    }
}));

// Get all companies for user (requires companies_view permission)
router.get('/', authenticateToken, validateTenant, requirePermission('companies_view'), asyncHandler(async (req, res) => {
    try {
        // Validate that user has a tenant ID
        if (!req.user.tenantId) {
            return res.json({
                success: true,
                companies: [],
                message: 'No tenant assigned yet'
            });
        }

        const companiesResponse = await companyManager.getUserCompanies(req.user.id, req.user.tenantId, req.user.organizationRole || 'user', { limit: 100 });
        res.json({ 
            success: true,
            companies: companiesResponse.data || []
        });
    } catch (error) {
        console.error('Error fetching companies:', error);
        res.status(500).json({ 
            success: false,
            error: 'Failed to fetch companies' 
        });
    }
}));

// Create new company
router.post('/', authenticateToken, validateTenant, requirePermission('companies_create'), asyncHandler(async (req, res) => {
    try {
        // Validate that user has a tenant ID
        if (!req.user.tenantId) {
            return res.status(400).json({
                success: false,
                error: 'User tenant ID not found'
            });
        }

        if (!req.body.name || !req.body.name.trim()) {
            return res.status(400).json({
                success: false,
                error: 'Company name is required'
            });
        }

        const result = await companyManager.createCompany(req.user.id, { ...req.body, tenantId: req.user.tenantId });

        logger.info(`Company created: ${result.name}`, { userId: req.user.id });

        res.json({
            success: true,
            message: 'Company created successfully',
            data: result
        });
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({
                success: false,
                error: 'Company name already exists'
            });
        }
        console.error('Create company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create company'
        });
    }
}));

// Update company
router.put('/:id', authenticateToken, validateTenant, requirePermission('companies_edit'), asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        
        
        const company = await companyManager.verifyCompanyOwnership(id, req.user.id, req.user.tenantId);
        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        const result = await companyManager.updateCompany(id, req.user.id, req.body);



        res.json({
            success: true,
            message: 'Company updated successfully',
            data: result
        });
    } catch (error) {
        console.error('❌ Update company error:', error);
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return res.status(400).json({
                success: false,
                error: 'Company name already exists'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to update company'
        });
    }
}));

// Delete company
router.delete('/:id', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;

        
        const company = await companyManager.verifyCompanyOwnership(id, req.user.id, req.user.tenantId);
        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }

        await companyManager.deleteCompany(id, req.user.id);

        logger.warn(`Company deleted: ${company.name}`, { userId: req.user.id, companyId: id });

        res.json({
            success: true,
            message: 'Company deleted successfully'
        });
    } catch (error) {
        console.error('Delete company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete company'
        });
    }
}));

// Get active company
router.get('/active', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        res.json({
            success: true,
            data: activeCompany
        });
    } catch (error) {
        console.error('Get active company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get active company'
        });
    }
}));

// Set active company
router.post('/:id/activate', authenticateToken, validateTenant, asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        
        
        const company = await companyManager.verifyCompanyOwnership(id, req.user.id, req.user.tenantId);
        if (!company) {
            return res.status(404).json({
                success: false,
                error: 'Company not found'
            });
        }
        
        await companyManager.setActiveCompany(req.user.id, id);
        

        
        res.json({
            success: true,
            message: 'Active company updated'
        });
    } catch (error) {
        console.error('Set active company error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to set active company'
        });
    }
}));

module.exports = router; 
