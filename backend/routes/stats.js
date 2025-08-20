const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { statsManager, companyManager } = require('../database/database-manager');
const { asyncHandler } = require('../middleware/error-handling');

const router = express.Router();

// Get statistics
router.get('/', authenticateToken, validateTenant, requirePermission('analytics_view'), asyncHandler(async (req, res) => {
    const { companyId } = req.query;
    
    if (companyId) {
        const company = await companyManager.verifyCompanyOwnership(companyId, req.user.id, req.user.tenantId);
        if (!company) {
            return handleError(res, new Error('Company not found'), 'fetch stats');
        }
        
        const stats = await statsManager.getCompanyStats(companyId);
        res.json({
            success: true,
            data: stats
        });
    } else {
        // For new users without companies, return empty stats
        const stats = await statsManager.getUserStats(req.user.id);
        res.json({
            success: true,
            data: stats || {
                totalTrailers: 0,
                activeTrailers: 0,
                inactiveTrailers: 0,
                maintenanceAlerts: 0
            }
        });
    }
}));

module.exports = router; 
