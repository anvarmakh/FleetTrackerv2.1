const RefreshService = require('../services/auto-refresh');

const router = require('express').Router();

// Manual refresh endpoint
router.post('/manual', async (req, res) => {
    try {
        const { user } = req;
        
        const result = await RefreshService.refreshLocations(user.id);
        res.json(result);
    } catch (error) {
        console.error('Manual refresh setup error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start manual refresh: ' + error.message
        });
    }
});

// Get refresh status
router.get('/status', async (req, res) => {
    try {
        const status = RefreshService.getRefreshStatus(req.user.id);
        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        console.error('Error getting refresh status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get refresh status: ' + error.message
        });
    }
});

module.exports = router; 
