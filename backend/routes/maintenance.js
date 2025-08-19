const express = require('express');
const { authenticateToken, validateTenant } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { 
    maintenanceManager, 
    companyManager, 
    trailerManager, 
    maintenancePreferencesManager 
} = require('../database/database-manager');
const MaintenanceService = require('../services/maintenance');

const router = express.Router();

// ============================================================================
// INSPECTION MANAGEMENT
// ============================================================================

// Get all inspections for a company
router.get('/inspections', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { companyId, trailerId, status, inspectionType } = req.query;
        
        // Get user's active company if not specified
        let targetCompanyId = companyId;
        if (!targetCompanyId) {
            const company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
            if (company) {
                targetCompanyId = company.id;
            }
        }
        
        if (!targetCompanyId) {
            return res.json({
                success: true,
                data: [],
                message: 'No active company selected'
            });
        }
        
        const inspections = await maintenanceManager.getInspections(targetCompanyId, {
            trailerId,
            status,
            inspectionType
        });
        
        res.json({
            success: true,
            data: inspections,
            totalCount: inspections.length
        });
    } catch (error) {
        console.error('Error fetching inspections:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inspections: ' + error.message
        });
    }
});

// Get inspection by ID
router.get('/inspections/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        const inspection = await maintenanceManager.getInspectionById(id, req.user.id);
        if (!inspection) {
            return res.status(404).json({
                success: false,
                error: 'Inspection not found'
            });
        }
        
        res.json({
            success: true,
            data: inspection
        });
    } catch (error) {
        console.error('Error fetching inspection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch inspection: ' + error.message
        });
    }
});

// Create new inspection
router.post('/inspections', authenticateToken, validateTenant, async (req, res) => {
    try {
        const inspectionData = req.body;
        
        // Get user's active company
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (!activeCompany) {
            return res.status(400).json({
                success: false,
                error: 'No active company selected'
            });
        }
        
        // Validate required fields
        if (!inspectionData.trailer_id || !inspectionData.inspection_type || !inspectionData.inspection_date) {
            return res.status(400).json({
                success: false,
                error: 'Trailer ID, inspection type, and inspection date are required'
            });
        }
        
        // Verify trailer belongs to user's company
        const trailer = await trailerManager.getTrailerById(inspectionData.trailer_id);
        if (!trailer || trailer.companyId !== activeCompany.id) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found or access denied'
            });
        }
        
        // Validate inspection type
        const validTypes = ['annual', 'midtrip', 'pre_trip', 'post_trip'];
        if (!validTypes.includes(inspectionData.inspection_type)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid inspection type'
            });
        }
        
        // Create the inspection
        const inspectionId = await maintenanceManager.createInspection(
            inspectionData.trailer_id,
            {
                ...inspectionData,
                created_by: req.user.id
            }
        );
        
        res.json({
            success: true,
            message: 'Inspection created successfully',
            inspectionId
        });
    } catch (error) {
        console.error('Error creating inspection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create inspection: ' + error.message
        });
    }
});

// Update inspection
router.put('/inspections/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verify inspection exists and user has access
        const existingInspection = await maintenanceManager.getInspectionById(id, req.user.id);
        if (!existingInspection) {
            return res.status(404).json({
                success: false,
                error: 'Inspection not found or access denied'
            });
        }
        
        // Update the inspection
        await maintenanceManager.updateInspection(id, updates);
        
        res.json({
            success: true,
            message: 'Inspection updated successfully'
        });
    } catch (error) {
        console.error('Error updating inspection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update inspection: ' + error.message
        });
    }
});

// Delete inspection
router.delete('/inspections/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify inspection exists and user has access
        const existingInspection = await maintenanceManager.getInspectionById(id, req.user.id);
        if (!existingInspection) {
            return res.status(404).json({
                success: false,
                error: 'Inspection not found or access denied'
            });
        }
        
        // Delete the inspection
        await maintenanceManager.deleteInspection(id);
        
        res.json({
            success: true,
            message: 'Inspection deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting inspection:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete inspection: ' + error.message
        });
    }
});

// ============================================================================
// TIRE RECORDS MANAGEMENT
// ============================================================================

// Get all tire records for a company
router.get('/tires', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { companyId, trailerId, serviceType } = req.query;
        
        // Get user's active company if not specified
        let targetCompanyId = companyId;
        if (!targetCompanyId) {
        const company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
            if (company) {
                targetCompanyId = company.id;
            }
        }
        
        if (!targetCompanyId) {
            return res.json({
                success: true,
                data: [],
                message: 'No active company selected'
            });
        }
        
        const tireRecords = await maintenanceManager.getTireRecords(targetCompanyId, {
            trailerId,
            serviceType
        });
        
        res.json({
            success: true,
            data: tireRecords,
            totalCount: tireRecords.length
        });
    } catch (error) {
        console.error('Error fetching tire records:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tire records: ' + error.message
        });
    }
});

// Get tire record by ID
router.get('/tires/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        const tireRecord = await maintenanceManager.getTireRecordById(id, req.user.id);
        if (!tireRecord) {
            return res.status(404).json({
                success: false,
                error: 'Tire record not found'
            });
        }
        
        res.json({
            success: true,
            data: tireRecord
        });
    } catch (error) {
        console.error('Error fetching tire record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tire record: ' + error.message
        });
    }
});

// Create new tire record
router.post('/tires', authenticateToken, validateTenant, async (req, res) => {
    try {
        const tireData = req.body;
        
        // Get user's active company
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (!activeCompany) {
            return res.status(400).json({
                success: false,
                error: 'No active company selected'
            });
        }
        
        // Validate required fields
        if (!tireData.trailer_id || !tireData.tire_position || !tireData.service_date) {
            return res.status(400).json({
                success: false,
                error: 'Trailer ID, tire position, and service date are required'
            });
        }
        
        // Verify trailer belongs to user's company
        const trailer = await trailerManager.getTrailerById(tireData.trailer_id);
        if (!trailer || trailer.companyId !== activeCompany.id) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found or access denied'
            });
        }
        
        // Validate tire position
        const validPositions = ['front_left', 'front_right', 'rear_left', 'rear_right'];
        if (!validPositions.includes(tireData.tire_position)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid tire position'
            });
        }
        
        // Validate service type if provided
        if (tireData.service_type) {
            const validServiceTypes = ['new', 'repair', 'rotation', 'removal'];
            if (!validServiceTypes.includes(tireData.service_type)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid service type'
                });
            }
        }
        
        // Create the tire record
        const tireRecordId = await maintenanceManager.createTireRecord(
            tireData.trailer_id,
            {
                ...tireData,
                created_by: req.user.id
            }
        );
        
        res.json({
            success: true,
            message: 'Tire record created successfully',
            tireRecordId
        });
    } catch (error) {
        console.error('Error creating tire record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create tire record: ' + error.message
        });
    }
});

// Update tire record
router.put('/tires/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verify tire record exists and user has access
        const existingTireRecord = await maintenanceManager.getTireRecordById(id, req.user.id);
        if (!existingTireRecord) {
            return res.status(404).json({
                success: false,
                error: 'Tire record not found or access denied'
            });
        }
        
        // Update the tire record
        await maintenanceManager.updateTireRecord(id, updates);
        
        res.json({
            success: true,
            message: 'Tire record updated successfully'
        });
    } catch (error) {
        console.error('Error updating tire record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update tire record: ' + error.message
        });
    }
});

// Delete tire record
router.delete('/tires/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify tire record exists and user has access
        const existingTireRecord = await maintenanceManager.getTireRecordById(id, req.user.id);
        if (!existingTireRecord) {
            return res.status(404).json({
                success: false,
                error: 'Tire record not found or access denied'
            });
        }
        
        // Delete the tire record
        await maintenanceManager.deleteTireRecord(id);
        
        res.json({
            success: true,
            message: 'Tire record deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tire record:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete tire record: ' + error.message
        });
    }
});

// ============================================================================
// MAINTENANCE ALERTS MANAGEMENT
// ============================================================================

// Manually trigger maintenance alert checking for all trailers
router.post('/check-alerts', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { companyId } = req.body;
        
        // Get user's active company if not specified
        let targetCompanyId = companyId;
        if (!targetCompanyId) {
            const company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
            if (company) {
                targetCompanyId = company.id;
            }
        }
        
        if (!targetCompanyId) {
            return res.status(400).json({
                success: false,
                error: 'No active company selected'
            });
        }
        
        // Get all trailers for the company
        const trailers = await trailerManager.getAllTrailersForCompany(targetCompanyId, { limit: 100 });
        let totalAlerts = 0;
        
        // Check maintenance for each trailer
        for (const trailer of trailers) {
            try {
                const alertCount = await maintenanceManager.checkAndCreateAlerts(trailer.id);
                totalAlerts += alertCount || 0;
            } catch (error) {
                console.error(`Error checking maintenance for trailer ${trailer.id}:`, error);
            }
        }
        
        res.json({
            success: true,
            message: `Maintenance alert check completed. Created ${totalAlerts} new alerts.`,
            totalAlerts,
            trailersChecked: trailers.length
        });
    } catch (error) {
        console.error('Error checking maintenance alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check maintenance alerts: ' + error.message
        });
    }
});

// Simple endpoint to check maintenance alerts for a specific trailer
router.post('/check-trailer-alerts/:trailerId', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        if (!trailerId) {
            return res.status(400).json({
                success: false,
                error: 'Trailer ID is required'
            });
        }
        
        // Check and create maintenance alerts for the specific trailer
        const alertCount = await maintenanceManager.checkAndCreateAlerts(trailerId);
        
        res.json({
            success: true,
            message: `Maintenance alert check completed for trailer ${trailerId}. Created ${alertCount || 0} new alerts.`,
            totalAlerts: alertCount || 0,
            trailerId
        });
    } catch (error) {
        console.error('Error checking maintenance alerts for trailer:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to check maintenance alerts: ' + error.message
        });
    }
});

// Get all maintenance alerts for a company
router.get('/alerts', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { companyId, severity, isResolved } = req.query;
        
        // Get user's active company if not specified
        let targetCompanyId = companyId;
        if (!targetCompanyId) {
        const company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
            if (company) {
                targetCompanyId = company.id;
            }
        }
        
        if (!targetCompanyId) {
            return res.json({
                success: true,
                data: [],
                message: 'No active company selected'
            });
        }
        
        const alerts = await maintenanceManager.getMaintenanceAlerts(req.user.id, {
            companyId: targetCompanyId,
            severity,
            isResolved: isResolved === 'true'
        });
        
        res.json({
            success: true,
            data: alerts,
            totalCount: alerts.length
        });
    } catch (error) {
        console.error('Error fetching maintenance alerts:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch maintenance alerts: ' + error.message
        });
    }
});

// Get maintenance alert by ID
router.get('/alerts/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        const alert = await maintenanceManager.getMaintenanceAlertById(id, req.user.id);
        if (!alert) {
            return res.status(404).json({
                success: false,
                error: 'Maintenance alert not found'
            });
        }
        
        res.json({
            success: true,
            data: alert
        });
    } catch (error) {
        console.error('Error fetching maintenance alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch maintenance alert: ' + error.message
        });
    }
});

// Create new maintenance alert
router.post('/alerts', authenticateToken, validateTenant, async (req, res) => {
    try {
        const alertData = req.body;
        
        // Get user's active company
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (!activeCompany) {
            return res.status(400).json({
                success: false,
                error: 'No active company selected'
            });
        }
        
        // Validate required fields
        if (!alertData.trailer_id || !alertData.alert_type || !alertData.title) {
            return res.status(400).json({
                success: false,
                error: 'Trailer ID, alert type, and title are required'
            });
        }
        
        // Verify trailer belongs to user's company
        const trailer = await trailerManager.getTrailerById(alertData.trailer_id);
        if (!trailer || trailer.companyId !== activeCompany.id) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found or access denied'
            });
        }
        
        // Validate severity if provided
        if (alertData.severity) {
            const validSeverities = ['critical', 'warning', 'info'];
            if (!validSeverities.includes(alertData.severity)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid severity level'
                });
            }
        }
        
        // Create the maintenance alert
        const alertId = await maintenanceManager.createMaintenanceAlert(
            alertData.trailer_id,
            {
                ...alertData,
                created_by: req.user.id
            }
        );
        
        res.json({
            success: true,
            message: 'Maintenance alert created successfully',
            alertId
        });
    } catch (error) {
        console.error('Error creating maintenance alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create maintenance alert: ' + error.message
        });
    }
});

// Update maintenance alert
router.put('/alerts/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        // Verify alert exists and user has access
        const existingAlert = await maintenanceManager.getMaintenanceAlertById(id, req.user.id);
        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Maintenance alert not found or access denied'
            });
        }
        
        // Update the maintenance alert
        await maintenanceManager.updateMaintenanceAlert(id, updates);
        
        res.json({
            success: true,
            message: 'Maintenance alert updated successfully'
        });
    } catch (error) {
        console.error('Error updating maintenance alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update maintenance alert: ' + error.message
        });
    }
});

// Resolve maintenance alert
router.patch('/alerts/:id/resolve', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        const { resolution_notes } = req.body;
        
        // Verify alert exists and user has access
        const existingAlert = await maintenanceManager.getMaintenanceAlertById(id, req.user.id);
        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Maintenance alert not found or access denied'
            });
        }
        
        // Resolve the maintenance alert
        await maintenanceManager.resolveMaintenanceAlert(id, resolution_notes);
        
        res.json({
            success: true,
            message: 'Maintenance alert resolved successfully'
        });
    } catch (error) {
        console.error('Error resolving maintenance alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to resolve maintenance alert: ' + error.message
        });
    }
});

// Delete maintenance alert
router.delete('/alerts/:id', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Verify alert exists and user has access
        const existingAlert = await maintenanceManager.getMaintenanceAlertById(id, req.user.id);
        if (!existingAlert) {
            return res.status(404).json({
                success: false,
                error: 'Maintenance alert not found or access denied'
            });
        }
        
        // Delete the maintenance alert
        await maintenanceManager.deleteMaintenanceAlert(id);
        
        res.json({
            success: true,
            message: 'Maintenance alert deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting maintenance alert:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete maintenance alert: ' + error.message
        });
    }
});

// ============================================================================
// MAINTENANCE SUMMARY & ANALYTICS
// ============================================================================

// Get maintenance summary for a company
router.get('/summary', authenticateToken, validateTenant, async (req, res) => {
    try {
        const company = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        
        if (!company) {
            return res.status(400).json({
                success: false,
                error: 'No active company found'
            });
        }

        const summary = await maintenanceManager.getMaintenanceSummary(company.id);
        
        res.json({
            success: true,
            data: summary
        });
    } catch (error) {
        console.error('Error fetching maintenance summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch maintenance summary'
        });
    }
});

// Get maintenance preferences
router.get('/preferences', authenticateToken, validateTenant, requirePermission('settings_view'), async (req, res) => {
    try {
        const tenant_id = req.user.tenantId;
        
        const preferences = await maintenancePreferencesManager.getPreferences(tenant_id);
        
        res.json({
            success: true,
            data: preferences
        });
    } catch (error) {
        console.error('Error getting maintenance preferences:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to get maintenance preferences: ' + error.message 
        });
    }
});

// Save maintenance preferences
router.post('/preferences', authenticateToken, validateTenant, async (req, res) => {
    try {
        const tenant_id = req.user.tenantId;
        const preferences = req.body;
        
        // Validate required fields
        const requiredFields = [
            'annual_inspection_interval',
            'midtrip_inspection_interval', 
            'brake_inspection_interval',
            'annual_alert_threshold',
            'midtrip_alert_threshold',
            'brake_alert_threshold'
        ];
        
        for (const field of requiredFields) {
            if (preferences[field] === undefined || preferences[field] === null) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        // Validate intervals are positive numbers
        const intervals = [
            'annual_inspection_interval',
            'midtrip_inspection_interval',
            'brake_inspection_interval'
        ];
        
        for (const interval of intervals) {
            if (preferences[interval] <= 0) {
                return res.status(400).json({
                    success: false,
                    error: `${interval} must be a positive number`
                });
            }
        }
        
        // Validate thresholds are non-negative numbers
        const thresholds = [
            'annual_alert_threshold',
            'midtrip_alert_threshold',
            'brake_alert_threshold'
        ];
        
        for (const threshold of thresholds) {
            if (preferences[threshold] < 0) {
                return res.status(400).json({
                    success: false,
                    error: `${threshold} must be a non-negative number`
                });
            }
        }
        
        const result = await maintenancePreferencesManager.savePreferences(tenant_id, preferences);
        
        res.json({
            success: true,
            message: 'Maintenance preferences saved successfully',
            data: { id: result.id }
        });
    } catch (error) {
        console.error('Error saving maintenance preferences:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save maintenance preferences: ' + error.message 
        });
    }
});

// Update maintenance preferences (PUT endpoint for frontend compatibility)
router.put('/preferences', authenticateToken, validateTenant, requirePermission('settings_edit'), async (req, res) => {
    try {
        const tenant_id = req.user.tenantId;
        const preferences = req.body;
        
        // Convert camelCase to snake_case for database compatibility
        const dbPreferences = {
            annual_inspection_interval: preferences.annualInspectionInterval,
            midtrip_inspection_interval: preferences.midtripInspectionInterval,
            brake_inspection_interval: preferences.brakeInspectionInterval,
            annual_alert_threshold: preferences.annualAlertThreshold,
            midtrip_alert_threshold: preferences.midtripAlertThreshold,
            brake_alert_threshold: preferences.brakeAlertThreshold,
            enable_maintenance_alerts: preferences.enableMaintenanceAlerts,
            enable_email_notifications: preferences.enableEmailNotifications,
            enable_push_notifications: preferences.enablePushNotifications
        };
        
        // Validate required fields
        const requiredFields = [
            'annual_inspection_interval',
            'midtrip_inspection_interval', 
            'brake_inspection_interval',
            'annual_alert_threshold',
            'midtrip_alert_threshold',
            'brake_alert_threshold'
        ];
        
        for (const field of requiredFields) {
            if (dbPreferences[field] === undefined || dbPreferences[field] === null) {
                return res.status(400).json({
                    success: false,
                    error: `Missing required field: ${field}`
                });
            }
        }
        
        // Validate intervals are positive numbers
        const intervals = [
            'annual_inspection_interval',
            'midtrip_inspection_interval',
            'brake_inspection_interval'
        ];
        
        for (const interval of intervals) {
            if (dbPreferences[interval] <= 0) {
                return res.status(400).json({
                    success: false,
                    error: `${interval} must be a positive number`
                });
            }
        }
        
        // Validate thresholds are non-negative numbers
        const thresholds = [
            'annual_alert_threshold',
            'midtrip_alert_threshold',
            'brake_alert_threshold'
        ];
        
        for (const threshold of thresholds) {
            if (dbPreferences[threshold] < 0) {
                return res.status(400).json({
                    success: false,
                    error: `${threshold} must be a non-negative number`
                });
            }
        }
        
        const result = await maintenancePreferencesManager.savePreferences(tenant_id, dbPreferences);
        
        res.json({
            success: true,
            message: 'Maintenance preferences updated successfully',
            data: { id: result.id }
        });
    } catch (error) {
        console.error('Error updating maintenance preferences:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update maintenance preferences: ' + error.message 
        });
    }
});

// Update trailer maintenance dates with intelligent calculations (replaces legacy endpoint)
router.put('/trailers/:trailerId/maintenance-dates', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { trailerId } = req.params;
        const { updateData } = req.body;
        const tenant_id = req.user.tenantId;
        
        if (!updateData) {
            return res.status(400).json({
                success: false,
                error: 'Update data is required'
            });
        }
        
        const result = await MaintenanceService.intelligentDateCalculation(
            trailerId, 
            updateData, 
            tenant_id
        );
        
        res.json({
            success: true,
            message: 'Trailer maintenance dates updated with intelligent calculations',
            data: result
        });
    } catch (error) {
        console.error('Error updating trailer maintenance dates:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to update trailer maintenance dates: ' + error.message 
        });
    }
});

// Calculate next due dates for a trailer (preview only) - Updated to use intelligent calculation
router.post('/trailers/:trailerId/calculate-dates', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { trailerId } = req.params;
        const { options } = req.body;
        const tenant_id = req.user.tenantId;
        
        // Get current trailer data
        const trailerData = await trailerManager.getTrailerById(trailerId);
        
        if (!trailerData) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found'
            });
        }
        
        // Convert options to updateData format for intelligent calculation
        const updateData = {
            last_annual_inspection: options?.lastAnnualInspection || null,
            last_midtrip_inspection: options?.lastMidtripInspection || null,
            last_brake_inspection: options?.lastBrakeInspection || null,
            next_annual_inspection_due: options?.nextAnnualInspectionDue || null,
            next_midtrip_inspection_due: options?.nextMidtripInspectionDue || null,
            next_brake_inspection_due: options?.nextBrakeInspectionDue || null
        };
        
        const result = await MaintenanceService.previewIntelligentDateCalculation(
            trailerData, 
            updateData, 
            tenant_id
        );
        
        res.json({
            success: true,
            data: result.calculatedDates
        });
    } catch (error) {
        console.error('Error calculating maintenance dates:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to calculate maintenance dates: ' + error.message 
        });
    }
});



// Get trailer maintenance history
router.get('/trailers/:trailerId/history', authenticateToken, validateTenant, async (req, res) => {
    try {
        const { trailerId } = req.params;
        
        // Verify trailer belongs to user's company
        const trailer = await trailerManager.getTrailerById(trailerId);
        if (!trailer) {
            return res.status(404).json({
                success: false,
                error: 'Trailer not found'
            });
        }
        
        const activeCompany = await companyManager.getActiveCompany(req.user.id, req.user.tenantId);
        if (!activeCompany || trailer.companyId !== activeCompany.id) {
            return res.status(403).json({
                success: false,
                error: 'Access denied to this trailer'
            });
        }
        
        const history = await maintenanceManager.getTrailerMaintenanceHistory(trailerId);
        
        res.json({
            success: true,
            data: history
        });
    } catch (error) {
        console.error('Error fetching trailer maintenance history:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch trailer maintenance history: ' + error.message
        });
    }
});

module.exports = router; 
