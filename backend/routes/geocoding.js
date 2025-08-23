const express = require('express');
const router = express.Router();
const geocodingService = require('../services/geocoding');
const { authenticateToken } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { asyncHandler } = require('../middleware/error-handling');
const logger = require('../utils/logger');

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * Validate address parameter
 */
function validateAddress(address) {
    if (!address || typeof address !== 'string' || !address.trim()) {
        return { isValid: false, error: 'Address is required and must be a non-empty string' };
    }
    
    return { isValid: true, address: address.trim() };
}

/**
 * Validate coordinate parameters
 */
function validateCoordinates(lat, lng) {
    if (lat === undefined || lng === undefined) {
        return { isValid: false, error: 'Latitude and longitude are required' };
    }
    
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    
    if (isNaN(latNum) || isNaN(lngNum)) {
        return { isValid: false, error: 'Latitude and longitude must be valid numbers' };
    }
    
    if (latNum < -90 || latNum > 90) {
        return { isValid: false, error: 'Latitude must be between -90 and 90' };
    }
    
    if (lngNum < -180 || lngNum > 180) {
        return { isValid: false, error: 'Longitude must be between -180 and 180' };
    }
    
    return { isValid: true, lat: latNum, lng: lngNum };
}

// GET /api/geocode - Geocode an address
router.get('/', requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    const { address } = req.query;
    
    const validation = validateAddress(address);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    const geocodeResult = await geocodingService.geocodeAddress(validation.address);
    
    res.json({
        success: true,
        data: geocodeResult
    });
}));

// POST /api/geocode/reverse - Reverse geocode coordinates
router.post('/reverse', requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    const reverseGeocodeResult = await geocodingService.reverseGeocode(validation.lat, validation.lng);
    
    res.json({
        success: true,
        data: reverseGeocodeResult
    });
}));

// POST /api/geocode/validate - Validate an address
router.post('/validate', requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    const { address } = req.body;
    
    const validation = validateAddress(address);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    const isValid = await geocodingService.validateAddress(validation.address);
    
    res.json({
        success: true,
        data: { isValid }
    });
}));

// POST /api/geocode/standardized - Get standardized address from coordinates
router.post('/standardized', requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    const standardizedAddress = await geocodingService.getAddressFromCoordinates(validation.lat, validation.lng, 'full');
    
    res.json({
        success: true,
        data: { address: standardizedAddress }
    });
}));

// POST /api/geocode/components - Get address components from coordinates
router.post('/components', requirePermission('fleet_view'), asyncHandler(async (req, res) => {
    const { lat, lng } = req.body;
    
    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }

    const components = await geocodingService.getAddressFromCoordinates(validation.lat, validation.lng, 'components');
    
    res.json({
        success: true,
        data: components
    });
}));

module.exports = router; 
