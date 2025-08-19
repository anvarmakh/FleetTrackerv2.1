const { maintenanceManager, trailerManager, maintenancePreferencesManager } = require('../database/database-manager');
const { TIME_CONSTANTS } = require('../utils/constants');

/**
 * Maintenance service for handling maintenance calculations and alerts
 */
class MaintenanceService {
    
    /**
     * Calculate maintenance alerts for a user
     */
    static async calculateMaintenanceAlerts(userId) {
        try {
            const alerts = await maintenanceManager.getMaintenanceAlerts(userId);
            
            return {
                total_alerts: alerts.length,
                critical_alerts: alerts.filter(a => a.severity === 'critical').length,
                warning_alerts: alerts.filter(a => a.severity === 'warning').length,
                overdue_inspections: alerts.filter(a => a.is_overdue).length,
                due_soon_inspections: alerts.filter(a => a.days_until_due <= 30 && a.days_until_due > 0).length,
                alerts: alerts
            };
        } catch (error) {
            console.error('Error calculating maintenance alerts:', error);
            throw error;
        }
    }

    /**
     * Calculate maintenance alerts for trailers based on inspection dates
     */
    static async calculateTrailerMaintenanceAlerts(trailerData, tenant_id) {
        const alerts = [];
        const now = new Date();

        // Validate tenant_id is provided
        if (!tenant_id) {
            throw new Error('Tenant ID is required for maintenance alert calculation');
        }

        // Get user preferences for alert thresholds
        const preferences = await maintenancePreferencesManager.getPreferences(tenant_id);

        // Annual inspection alerts
        if (trailerData.next_annual_inspection_due) {
            const dueDate = new Date(trailerData.next_annual_inspection_due);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue < 0) {
                alerts.push({
                    severity: 'critical',
                    message: `Annual inspection overdue by ${Math.abs(daysUntilDue)} days`,
                    type: 'annual_inspection',
                    due_date: trailerData.next_annual_inspection_due
                });
            } else if (daysUntilDue <= preferences.annual_alert_threshold) {
                alerts.push({
                    severity: 'warning',
                    message: `Annual inspection due in ${daysUntilDue} days`,
                    type: 'annual_inspection',
                    due_date: trailerData.next_annual_inspection_due
                });
            }
        }

        // Midtrip inspection alerts
        if (trailerData.next_midtrip_inspection_due) {
            const dueDate = new Date(trailerData.next_midtrip_inspection_due);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue < 0) {
                alerts.push({
                    severity: 'critical',
                    message: `Midtrip inspection overdue by ${Math.abs(daysUntilDue)} days`,
                    type: 'midtrip_inspection',
                    due_date: trailerData.next_midtrip_inspection_due
                });
            } else if (daysUntilDue <= preferences.midtrip_alert_threshold) {
                alerts.push({
                    severity: 'warning',
                    message: `Midtrip inspection due in ${daysUntilDue} days`,
                    type: 'midtrip_inspection',
                    due_date: trailerData.next_midtrip_inspection_due
                });
            }
        }

        // Brake inspection alerts
        if (trailerData.next_brake_inspection_due) {
            const dueDate = new Date(trailerData.next_brake_inspection_due);
            const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
            
            if (daysUntilDue < 0) {
                alerts.push({
                    severity: 'critical',
                    message: `Brake inspection overdue by ${Math.abs(daysUntilDue)} days`,
                    type: 'brake_inspection',
                    due_date: trailerData.next_brake_inspection_due
                });
            } else if (daysUntilDue <= preferences.brake_alert_threshold) {
                alerts.push({
                    severity: 'warning',
                    message: `Brake inspection due in ${daysUntilDue} days`,
                    type: 'brake_inspection',
                    due_date: trailerData.next_brake_inspection_due
                });
            }
        }

        return alerts;
    }

    /**
     * Get maintenance summary for a trailer
     */
    static async getTrailerMaintenanceSummary(trailerId) {
        try {
            const maintenanceRecords = await maintenanceManager.getTrailerMaintenanceRecords(trailerId);
            
            const summary = {
                total_records: maintenanceRecords.length,
                last_inspection: null,
                next_inspection: null,
                overdue_items: 0,
                due_soon_items: 0,
                critical_items: 0
            };

            if (maintenanceRecords.length > 0) {
                // Find last inspection
                const inspections = maintenanceRecords.filter(r => r.type === 'inspection');
                if (inspections.length > 0) {
                    summary.last_inspection = inspections.sort((a, b) => 
                        new Date(b.date) - new Date(a.date)
                    )[0];
                }

                // Calculate overdue and due soon items
                const now = new Date();
                maintenanceRecords.forEach(record => {
                    if (record.due_date) {
                        const dueDate = new Date(record.due_date);
                        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
                        
                        if (daysUntilDue < 0) {
                            summary.overdue_items++;
                        } else if (daysUntilDue <= 30) {
                            summary.due_soon_items++;
                        }
                    }
                    
                    if (record.severity === 'critical') {
                        summary.critical_items++;
                    }
                });
            }

            return summary;
        } catch (error) {
            console.error('Error getting trailer maintenance summary:', error);
            throw error;
        }
    }



    /**
     * Intelligently calculate and update maintenance dates based on user preferences and manual entries
     * @param {string} trailerId - Trailer ID
     * @param {Object} updateData - Update data containing last inspection dates
     * @param {string} tenant_id - Tenant ID for preferences
     * @returns {Object} - Updated trailer data with calculated next due dates
     */
    static async intelligentDateCalculation(trailerId, updateData, tenant_id) {
        try {
            // Get current trailer data
            const currentTrailer = await trailerManager.getTrailerById(trailerId);
            
            if (!currentTrailer) {
                throw new Error('Trailer not found');
            }

            // Get maintenance preferences
            let preferences = null;
            try {
                preferences = await maintenancePreferencesManager.getPreferences(tenant_id);
            } catch (error) {
                console.warn('Could not load maintenance preferences:', error.message);
                // If no preferences, don't do automatic calculations
                return {
                    success: true,
                    updatedData: updateData,
                    calculatedDates: {},
                    message: 'No maintenance preferences found. Manual entry required.'
                };
            }

            // Merge current data with updates
            const mergedData = {
                ...currentTrailer,
                ...updateData
            };

            const calculatedDates = {};
            const calculationLog = [];

            // Check each maintenance type
            const maintenanceTypes = [
                {
                    lastField: 'last_annual_inspection',
                    nextField: 'next_annual_inspection_due',
                    intervalField: 'annual_inspection_interval',
                    name: 'Annual Inspection'
                },
                {
                    lastField: 'last_midtrip_inspection',
                    nextField: 'next_midtrip_inspection_due',
                    intervalField: 'midtrip_inspection_interval',
                    name: 'Midtrip Inspection'
                },
                {
                    lastField: 'last_brake_inspection',
                    nextField: 'next_brake_inspection_due',
                    intervalField: 'brake_inspection_interval',
                    name: 'Brake Inspection'
                }
            ];

            for (const maintenanceType of maintenanceTypes) {
                const lastDate = mergedData[maintenanceType.lastField];
                const nextDate = mergedData[maintenanceType.nextField];
                const interval = preferences[maintenanceType.intervalField];

                // Case 1: Both last and next dates are provided
                if (lastDate && nextDate) {
                    calculationLog.push(`${maintenanceType.name}: Both dates provided - no calculation needed`);
                    continue;
                }

                // Case 2: Only next date is provided (manual entry)
                if (!lastDate && nextDate) {
                    calculationLog.push(`${maintenanceType.name}: Only next date provided - respecting manual entry`);
                    continue;
                }

                // Case 3: Only last date is provided - calculate next date
                if (lastDate && !nextDate) {
                    const lastDateObj = new Date(lastDate);
                    const nextDateObj = new Date(lastDateObj.getTime() + interval * 24 * 60 * 60 * 1000);
                    calculatedDates[maintenanceType.nextField] = nextDateObj.toISOString().split('T')[0];
                    calculationLog.push(`${maintenanceType.name}: Calculated next date from last date + ${interval} days`);
                }

                // Case 4: Neither date is provided
                if (!lastDate && !nextDate) {
                    calculationLog.push(`${maintenanceType.name}: No dates provided - waiting for user input`);
                }
            }

            // Prepare final update data
            const finalUpdateData = {
                ...updateData,
                ...calculatedDates
            };

            // Update the trailer
            await trailerManager.updateTrailerInfo(trailerId, finalUpdateData);

            return {
                success: true,
                updatedData: finalUpdateData,
                calculatedDates: calculatedDates,
                calculationLog: calculationLog,
                preferencesUsed: preferences ? {
                    annual_interval: preferences.annual_inspection_interval,
                    midtrip_interval: preferences.midtrip_inspection_interval,
                    brake_interval: preferences.brake_inspection_interval
                } : null
            };
        } catch (error) {
            console.error('Error in intelligent date calculation:', error);
            throw error;
        }
    }

    /**
     * Preview intelligent date calculations without updating the database
     * @param {Object} trailerData - Current trailer data
     * @param {Object} updateData - Proposed update data
     * @param {string} tenant_id - Tenant ID for preferences
     * @returns {Object} - Preview of calculated dates
     */
    static async previewIntelligentDateCalculation(trailerData, updateData, tenant_id) {
        try {
            // Get maintenance preferences
            let preferences = null;
            try {
                preferences = await maintenancePreferencesManager.getPreferences(tenant_id);
            } catch (error) {
                console.warn('Could not load maintenance preferences:', error.message);
                return {
                    success: true,
                    calculatedDates: {},
                    message: 'No maintenance preferences found. Manual entry required.',
                    calculationLog: ['No preferences available for automatic calculation']
                };
            }

            // Merge current data with updates
            const mergedData = {
                ...trailerData,
                ...updateData
            };

            const calculatedDates = {};
            const calculationLog = [];

            // Check each maintenance type
            const maintenanceTypes = [
                {
                    lastField: 'last_annual_inspection',
                    nextField: 'next_annual_inspection_due',
                    intervalField: 'annual_inspection_interval',
                    name: 'Annual Inspection'
                },
                {
                    lastField: 'last_midtrip_inspection',
                    nextField: 'next_midtrip_inspection_due',
                    intervalField: 'midtrip_inspection_interval',
                    name: 'Midtrip Inspection'
                },
                {
                    lastField: 'last_brake_inspection',
                    nextField: 'next_brake_inspection_due',
                    intervalField: 'brake_inspection_interval',
                    name: 'Brake Inspection'
                }
            ];

            for (const maintenanceType of maintenanceTypes) {
                const lastDate = mergedData[maintenanceType.lastField];
                const nextDate = mergedData[maintenanceType.nextField];
                const interval = preferences[maintenanceType.intervalField];

                // Case 1: Both last and next dates are provided
                if (lastDate && nextDate) {
                    calculationLog.push(`${maintenanceType.name}: Both dates provided - no calculation needed`);
                    continue;
                }

                // Case 2: Only next date is provided (manual entry)
                if (!lastDate && nextDate) {
                    calculationLog.push(`${maintenanceType.name}: Only next date provided - respecting manual entry`);
                    continue;
                }

                // Case 3: Only last date is provided - calculate next date
                if (lastDate && !nextDate) {
                    const lastDateObj = new Date(lastDate);
                    const nextDateObj = new Date(lastDateObj.getTime() + interval * 24 * 60 * 60 * 1000);
                    calculatedDates[maintenanceType.nextField] = nextDateObj.toISOString().split('T')[0];
                    calculationLog.push(`${maintenanceType.name}: Would calculate next date from last date + ${interval} days`);
                }

                // Case 4: Neither date is provided
                if (!lastDate && !nextDate) {
                    calculationLog.push(`${maintenanceType.name}: No dates provided - waiting for user input`);
                }
            }

            return {
                success: true,
                calculatedDates: calculatedDates,
                calculationLog: calculationLog,
                preferencesUsed: preferences ? {
                    annual_interval: preferences.annual_inspection_interval,
                    midtrip_interval: preferences.midtrip_inspection_interval,
                    brake_interval: preferences.brake_inspection_interval
                } : null
            };
        } catch (error) {
            console.error('Error in preview intelligent date calculation:', error);
            throw error;
        }
    }

    /**
     * Calculate tire age from tire records
     */
    static calculateTireAge(tireRecords) {
        if (!tireRecords || tireRecords.length === 0) return 0;
        
        const oldestTire = tireRecords.reduce((oldest, current) => {
            const currentDate = new Date(current.installation_date || current.created_at);
            const oldestDate = new Date(oldest.installation_date || oldest.created_at);
            return currentDate < oldestDate ? current : oldest;
        });

        const installationDate = new Date(oldestTire.installation_date || oldestTire.created_at);
        const currentDate = new Date();
        return Math.floor((currentDate - installationDate) / (1000 * 60 * 60 * 24 * 365));
    }

    /**
     * Validate maintenance record data
     */
    static validateMaintenanceRecord(record) {
        const errors = [];

        if (!record.type) {
            errors.push('Maintenance type is required');
        }

        if (!record.description) {
            errors.push('Description is required');
        }

        if (record.due_date) {
            const dueDate = new Date(record.due_date);
            if (isNaN(dueDate.getTime())) {
                errors.push('Invalid due date format');
            }
        }

        if (record.cost && isNaN(parseFloat(record.cost))) {
            errors.push('Cost must be a valid number');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}

module.exports = MaintenanceService; 
