const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocoding');
const { authenticateToken } = require('../middleware/auth');

// GET /api/geocode - Geocode an address
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { address } = req.query;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address parameter is required'
            });
        }

        const geocodeResult = await geocodingService.geocodeAddress(address);
        
        res.json({
            success: true,
            data: geocodeResult
        });
    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to geocode address'
        });
    }
});

// POST /api/geocode/reverse - Reverse geocode coordinates
router.post('/reverse', authenticateToken, async (req, res) => {
    try {
        const { lat, lng } = req.body;
        
        if (lat === undefined || lng === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Latitude and longitude are required'
            });
        }

        const reverseGeocodeResult = await geocodingService.reverseGeocode(lat, lng);
        
        res.json({
            success: true,
            data: reverseGeocodeResult
        });
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to reverse geocode coordinates'
        });
    }
});

// POST /api/geocode/validate - Validate an address
router.post('/validate', authenticateToken, async (req, res) => {
    try {
        const { address } = req.body;
        
        if (!address) {
            return res.status(400).json({
                success: false,
                error: 'Address is required'
            });
        }

        const isValid = await geocodingService.validateAddress(address);
        
        res.json({
            success: true,
            data: { isValid }
        });
    } catch (error) {
        console.error('Address validation error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to validate address'
        });
    }
});

module.exports = router; 
