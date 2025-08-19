/**
 * Maintenance Manager
 * Handles maintenance alerts, inspections, tire records, and maintenance analytics
 * Extracted from database-manager.js
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');

const { MAINTENANCE_SEVERITY } = require('../../utils/constants');
const BaseManager = require('./baseManager');

class MaintenanceManager extends BaseManager {
    constructor(db) {
        super(db); // Call the parent constructor
        this.db = db;
    }

    // ============================================================================
    // MAINTENANCE ALERTS MANAGEMENT
    // ============================================================================
    
    async getMaintenanceAlerts(userId, filters = {}) {
        try {
            let query = `
                SELECT ma.*, pt.unit_number, 
                       COALESCE(c.name, cc.name) as company_name,
                       CASE WHEN cc.id IS NOT NULL THEN 1 ELSE 0 END as is_custom_company
                FROM maintenance_alerts ma
                JOIN persistent_trailers pt ON ma.trailer_id = pt.id
                LEFT JOIN companies c ON pt.company_id = c.id
                LEFT JOIN trailer_custom_companies cc ON pt.company_id = cc.id
                WHERE (c.user_id = ? OR cc.tenant_id = (SELECT tenant_id FROM users WHERE id = ?))
            `;
            let params = [userId, userId];
            
            if (filters.companyId) {
                query += ` AND c.id = ?`;
                params.push(filters.companyId);
            }
            
            if (filters.severity) {
                query += ` AND ma.severity = ?`;
                params.push(filters.severity);
            }
            
            if (filters.isResolved !== undefined) {
                query += ` AND ma.is_resolved = ?`;
                params.push(filters.isResolved ? 1 : 0);
            } else {
                // Default to unresolved alerts
                query += ` AND ma.is_resolved = 0`;
            }
            
            query += ` ORDER BY ma.severity DESC, ma.due_date ASC`;
            
            return await this.execute(query, params);
        } catch (error) {
            console.error('Error getting maintenance alerts:', error);
            throw new Error('Failed to retrieve maintenance alerts');
        }
    }

    async createMaintenanceAlert(trailerId, alertData) {
        try {
            const { alert_type, severity = 'info', title, description, due_date } = alertData;
            
            if (!alert_type || !title) {
                throw new Error('Alert type and title are required');
            }
            
            if (severity && !Object.values(MAINTENANCE_SEVERITY).includes(severity)) {
                throw new Error('Invalid severity level');
            }
            
            const alertId = generateId('alert');
            const timestamp = getCurrentTimestamp();

            const result = await this.executeSingle(
                `INSERT INTO maintenance_alerts (
                    id, trailer_id, alert_type, severity, title, description, due_date, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [alertId, trailerId, alert_type, severity, title, description, due_date, timestamp]
            );
            
            return { id: alertId, changes: result.changes };
        } catch (error) {
            console.error('Error creating maintenance alert:', error);
            throw new Error('Failed to create maintenance alert');
        }
    }

    async getMaintenanceAlertById(alertId, userId) {
        try {
            if (!alertId) {
                throw new Error('Alert ID is required');
            }
            
            return await this.execute(
                `SELECT ma.*, pt.unit_number, c.name as company_name
                FROM maintenance_alerts ma
                JOIN persistent_trailers pt ON ma.trailer_id = pt.id
                JOIN companies c ON pt.company_id = c.id
                WHERE ma.id = ? AND c.user_id = ?`,
                [alertId, userId],
                { first: true }
            );
        } catch (error) {
            console.error('Error getting maintenance alert by ID:', error);
            throw new Error('Failed to retrieve maintenance alert');
        }
    }

    async updateMaintenanceAlert(alertId, updates) {
        try {
            if (!alertId) {
                throw new Error('Alert ID is required');
            }
            
            const { title, description, severity, due_date, is_resolved } = updates;
            
            if (severity && !Object.values(MAINTENANCE_SEVERITY).includes(severity)) {
                throw new Error('Invalid severity level');
            }
            
            let query = `UPDATE maintenance_alerts SET `;
            let params = [];
            let setClauses = [];
            
            if (title !== undefined) {
                setClauses.push('title = ?');
                params.push(title);
            }
            if (description !== undefined) {
                setClauses.push('description = ?');
                params.push(description);
            }
            if (severity !== undefined) {
                setClauses.push('severity = ?');
                params.push(severity);
            }
            if (due_date !== undefined) {
                setClauses.push('due_date = ?');
                params.push(due_date);
            }
            if (is_resolved !== undefined) {
                setClauses.push('is_resolved = ?');
                params.push(is_resolved ? 1 : 0);
                if (is_resolved) {
                    setClauses.push('resolved_at = CURRENT_TIMESTAMP');
                }
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            query += setClauses.join(', ');
            query += ` WHERE id = ?`;
            params.push(alertId);
            
            const result = await this.executeSingleQuery(query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating maintenance alert:', error);
            throw new Error('Failed to update maintenance alert');
        }
    }

    async resolveMaintenanceAlert(alertId, resolutionNotes = null) {
        try {
            if (!alertId) {
                throw new Error('Alert ID is required');
            }
            
            const timestamp = getCurrentTimestamp();
            let query = `
                UPDATE maintenance_alerts 
                SET is_resolved = 1, resolved_at = ?
            `;
            let params = [timestamp];
            
            if (resolutionNotes) {
                query += `, resolution_notes = ?`;
                params.push(resolutionNotes);
            }
            
            query += ` WHERE id = ?`;
            params.push(alertId);
            
            const result = await this.executeSingleQuery(query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error resolving maintenance alert:', error);
            throw new Error('Failed to resolve maintenance alert');
        }
    }

    async checkAndCreateAlerts(trailerId) {
        try {
            // Get trailer maintenance data
            const trailer = await this.execute(
                `SELECT 
                    id, unit_number,
                    last_annual_inspection,
                    next_annual_inspection_due,
                    last_midtrip_inspection,
                    next_midtrip_inspection_due,
                    tire_status,
                    last_tire_service
                FROM persistent_trailers 
                WHERE id = ?`,
                [trailerId],
                { first: true }
            );

            if (!trailer) {
                console.log(`Trailer ${trailerId} not found`);
                return;
            }

            const now = new Date();
            const alerts = [];

            // Check annual inspection
            if (trailer.next_annual_inspection_due) {
                const dueDate = new Date(trailer.next_annual_inspection_due);
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue < 0) {
                    alerts.push({
                        type: 'annual_inspection',
                        severity: 'critical',
                        title: 'Annual Inspection Overdue',
                        description: `Annual inspection is overdue by ${Math.abs(daysUntilDue)} days`,
                        due_date: trailer.next_annual_inspection_due
                    });
                } else if (daysUntilDue <= 30) {
                    alerts.push({
                        type: 'annual_inspection',
                        severity: 'warning',
                        title: 'Annual Inspection Due Soon',
                        description: `Annual inspection is due in ${daysUntilDue} days`,
                        due_date: trailer.next_annual_inspection_due
                    });
                }
            } else if (trailer.last_annual_inspection) {
                // Fallback: check if last inspection was more than 365 days ago
                const lastInspection = new Date(trailer.last_annual_inspection);
                const daysSince = Math.floor((now.getTime() - lastInspection.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysSince > 365) {
                    alerts.push({
                        type: 'annual_inspection',
                        severity: 'critical',
                        title: 'Annual Inspection Overdue',
                        description: `Annual inspection is overdue by ${daysSince - 365} days`,
                        due_date: null
                    });
                }
            }

            // Check midtrip inspection
            if (trailer.next_midtrip_inspection_due) {
                const dueDate = new Date(trailer.next_midtrip_inspection_due);
                const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (daysUntilDue < 0) {
                    alerts.push({
                        type: 'midtrip_inspection',
                        severity: 'critical',
                        title: 'Midtrip Inspection Overdue',
                        description: `Midtrip inspection is overdue by ${Math.abs(daysUntilDue)} days`,
                        due_date: trailer.next_midtrip_inspection_due
                    });
                } else if (daysUntilDue <= 7) {
                    alerts.push({
                        type: 'midtrip_inspection',
                        severity: 'warning',
                        title: 'Midtrip Inspection Due Soon',
                        description: `Midtrip inspection is due in ${daysUntilDue} days`,
                        due_date: trailer.next_midtrip_inspection_due
                    });
                }
            }

            // Check tire status
            if (trailer.tire_status === 'poor') {
                alerts.push({
                    type: 'tire_status',
                    severity: 'critical',
                    title: 'Tire Status Alert',
                    description: 'Tires need immediate attention',
                    due_date: null
                });
            } else if (trailer.tire_status === 'fair') {
                alerts.push({
                    type: 'tire_status',
                    severity: 'warning',
                    title: 'Tire Status Warning',
                    description: 'Tires should be inspected soon',
                    due_date: null
                });
            }

            // Create alerts in database
            for (const alert of alerts) {
                try {
                    await this.createMaintenanceAlert(trailerId, {
                        ...alert,
                        created_by: 'system'
                    });
                } catch (error) {
                    console.error(`Error creating maintenance alert for trailer ${trailerId}:`, error);
                }
            }

            console.log(`Created ${alerts.length} maintenance alerts for trailer ${trailer.unit_number}`);
            return alerts.length;
        } catch (error) {
            console.error('Error checking and creating maintenance alerts:', error);
            throw error;
        }
    }

    async deleteMaintenanceAlert(alertId) {
        try {
            if (!alertId) {
                throw new Error('Alert ID is required');
            }
            
            const result = await this.executeSingleQuery(
                `DELETE FROM maintenance_alerts WHERE id = ?`, 
                [alertId]
            );
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting maintenance alert:', error);
            throw new Error('Failed to delete maintenance alert');
        }
    }

    // ============================================================================
    // INSPECTION MANAGEMENT
    // ============================================================================
    
    async getInspections(companyId, filters = {}) {
        try {
            let query = `
                SELECT ti.*, pt.unit_number, c.name as company_name
                FROM trailer_inspections ti
                JOIN persistent_trailers pt ON ti.trailer_id = pt.id
                JOIN companies c ON pt.company_id = c.id
                WHERE c.id = ?
            `;
            let params = [companyId];
            
            if (filters.trailerId) {
                query += ` AND ti.trailer_id = ?`;
                params.push(filters.trailerId);
            }
            
            if (filters.status) {
                query += ` AND ti.status = ?`;
                params.push(filters.status);
            }
            
            if (filters.inspectionType) {
                query += ` AND ti.inspection_type = ?`;
                params.push(filters.inspectionType);
            }
            
            query += ` ORDER BY ti.inspection_date DESC`;
            
            return await this.execute(query, params);
        } catch (error) {
            console.error('Error getting inspections:', error);
            throw new Error('Failed to retrieve inspections');
        }
    }

    async getInspectionById(inspectionId, userId) {
        try {
            if (!inspectionId) {
                throw new Error('Inspection ID is required');
            }
            
            return await this.execute(
                `SELECT ti.*, pt.unit_number, c.name as company_name
                FROM trailer_inspections ti
                JOIN persistent_trailers pt ON ti.trailer_id = pt.id
                JOIN companies c ON pt.company_id = c.id
                WHERE ti.id = ? AND c.user_id = ?`,
                [inspectionId, userId],
                { first: true }
            );
        } catch (error) {
            console.error('Error getting inspection by ID:', error);
            throw new Error('Failed to retrieve inspection');
        }
    }

    async createInspection(trailerId, inspectionData) {
        try {
            const { 
                inspection_type, 
                inspection_date, 
                expiry_date, 
                inspector, 
                status = 'current', 
                notes 
            } = inspectionData;
            
            if (!inspection_type || !inspection_date) {
                throw new Error('Inspection type and date are required');
            }
            
            const inspectionId = generateId('inspection');
            const timestamp = getCurrentTimestamp();

            const result = await this.executeSingle(
                `INSERT INTO trailer_inspections (
                    id, trailer_id, inspection_type, inspection_date, expiry_date, 
                    inspector, status, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [inspectionId, trailerId, inspection_type, inspection_date, expiry_date, inspector, status, notes, timestamp]
            );
            
            return { id: inspectionId, changes: result.changes };
        } catch (error) {
            console.error('Error creating inspection:', error);
            throw new Error('Failed to create inspection');
        }
    }

    async updateInspection(inspectionId, updates) {
        try {
            if (!inspectionId) {
                throw new Error('Inspection ID is required');
            }
            
            const { 
                inspection_type, 
                inspection_date, 
                expiry_date, 
                inspector, 
                status, 
                notes 
            } = updates;
            
            let query = `UPDATE trailer_inspections SET `;
            let params = [];
            let setClauses = [];
            
            if (inspection_type !== undefined) {
                setClauses.push('inspection_type = ?');
                params.push(inspection_type);
            }
            if (inspection_date !== undefined) {
                setClauses.push('inspection_date = ?');
                params.push(inspection_date);
            }
            if (expiry_date !== undefined) {
                setClauses.push('expiry_date = ?');
                params.push(expiry_date);
            }
            if (inspector !== undefined) {
                setClauses.push('inspector = ?');
                params.push(inspector);
            }
            if (status !== undefined) {
                setClauses.push('status = ?');
                params.push(status);
            }
            if (notes !== undefined) {
                setClauses.push('notes = ?');
                params.push(notes);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            query += setClauses.join(', ');
            query += ` WHERE id = ?`;
            params.push(inspectionId);
            
            const result = await this.executeSingleQuery(query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating inspection:', error);
            throw new Error('Failed to update inspection');
        }
    }

    async deleteInspection(inspectionId) {
        try {
            if (!inspectionId) {
                throw new Error('Inspection ID is required');
            }
            
            const result = await this.executeSingleQuery(
                `DELETE FROM trailer_inspections WHERE id = ?`, 
                [inspectionId]
            );
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting inspection:', error);
            throw new Error('Failed to delete inspection');
        }
    }

    // ============================================================================
    // TIRE RECORDS MANAGEMENT
    // ============================================================================
    
    async getTireRecords(companyId, filters = {}) {
        try {
            let query = `
                SELECT tr.*, pt.unit_number, c.name as company_name
                FROM tire_records tr
                JOIN persistent_trailers pt ON tr.trailer_id = pt.id
                JOIN companies c ON pt.company_id = c.id
                WHERE c.id = ?
            `;
            let params = [companyId];
            
            if (filters.trailerId) {
                query += ` AND tr.trailer_id = ?`;
                params.push(filters.trailerId);
            }
            
            if (filters.serviceType) {
                query += ` AND tr.service_type = ?`;
                params.push(filters.serviceType);
            }
            
            query += ` ORDER BY tr.service_date DESC`;
            
            return await this.execute(query, params);
        } catch (error) {
            console.error('Error getting tire records:', error);
            throw new Error('Failed to retrieve tire records');
        }
    }

    async getTireRecordById(tireRecordId, userId) {
        try {
            if (!tireRecordId) {
                throw new Error('Tire record ID is required');
            }
            
            return await this.execute(
                `SELECT tr.*, pt.unit_number, c.name as company_name
                FROM tire_records tr
                JOIN persistent_trailers pt ON tr.trailer_id = pt.id
                JOIN companies c ON pt.company_id = c.id
                WHERE tr.id = ? AND c.user_id = ?`,
                [tireRecordId, userId],
                { first: true }
            );
        } catch (error) {
            console.error('Error getting tire record by ID:', error);
            throw new Error('Failed to retrieve tire record');
        }
    }

    async createTireRecord(trailerId, tireData) {
        try {
            const { 
                tire_position, 
                service_date, 
                service_type, 
                tire_brand, 
                tire_model, 
                notes 
            } = tireData;
            
            if (!tire_position || !service_date || !service_type) {
                throw new Error('Tire position, service date, and service type are required');
            }
            
            const tireRecordId = generateId('tire');
            const timestamp = getCurrentTimestamp();

            const result = await this.executeSingle(
                `INSERT INTO tire_records (
                    id, trailer_id, tire_position, service_date, service_type, 
                    tire_brand, tire_model, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tireRecordId, trailerId, tire_position, service_date, service_type, tire_brand, tire_model, notes, timestamp]
            );
            
            return { id: tireRecordId, changes: result.changes };
        } catch (error) {
            console.error('Error creating tire record:', error);
            throw new Error('Failed to create tire record');
        }
    }

    async updateTireRecord(tireRecordId, updates) {
        try {
            if (!tireRecordId) {
                throw new Error('Tire record ID is required');
            }
            
            const { 
                tire_position, 
                service_date, 
                service_type, 
                tire_brand, 
                tire_model, 
                notes 
            } = updates;
            
            let query = `UPDATE tire_records SET `;
            let params = [];
            let setClauses = [];
            
            if (tire_position !== undefined) {
                setClauses.push('tire_position = ?');
                params.push(tire_position);
            }
            if (service_date !== undefined) {
                setClauses.push('service_date = ?');
                params.push(service_date);
            }
            if (service_type !== undefined) {
                setClauses.push('service_type = ?');
                params.push(service_type);
            }
            if (tire_brand !== undefined) {
                setClauses.push('tire_brand = ?');
                params.push(tire_brand);
            }
            if (tire_model !== undefined) {
                setClauses.push('tire_model = ?');
                params.push(tire_model);
            }
            if (notes !== undefined) {
                setClauses.push('notes = ?');
                params.push(notes);
            }
            
            if (setClauses.length === 0) {
                throw new Error('No valid updates provided');
            }
            
            query += setClauses.join(', ');
            query += ` WHERE id = ?`;
            params.push(tireRecordId);
            
            const result = await this.executeSingleQuery(query, params);
            return { changes: result.changes };
        } catch (error) {
            console.error('Error updating tire record:', error);
            throw new Error('Failed to update tire record');
        }
    }

    async deleteTireRecord(tireRecordId) {
        try {
            if (!tireRecordId) {
                throw new Error('Tire record ID is required');
            }
            
            const result = await this.executeSingleQuery(
                `DELETE FROM tire_records WHERE id = ?`, 
                [tireRecordId]
            );
            return { changes: result.changes };
        } catch (error) {
            console.error('Error deleting tire record:', error);
            throw new Error('Failed to delete tire record');
        }
    }

    // ============================================================================
    // MAINTENANCE SUMMARY & ANALYTICS
    // ============================================================================
    
    async getMaintenanceSummary(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }
            
            return await this.execute(
                `SELECT 
                    (SELECT COUNT(*) FROM trailer_inspections ti 
                     JOIN persistent_trailers pt ON ti.trailer_id = pt.id 
                     WHERE pt.company_id = ?) as total_inspections,
                    (SELECT COUNT(*) FROM tire_records tr 
                     JOIN persistent_trailers pt ON tr.trailer_id = pt.id 
                     WHERE pt.company_id = ?) as total_tire_records,
                    (SELECT COUNT(*) FROM maintenance_alerts ma 
                     JOIN persistent_trailers pt ON ma.trailer_id = pt.id 
                     WHERE pt.company_id = ? AND ma.is_resolved = 0) as total_alerts,
                    (SELECT COUNT(*) FROM trailer_inspections ti 
                     JOIN persistent_trailers pt ON ti.trailer_id = pt.id 
                     WHERE pt.company_id = ? AND ti.status = 'overdue') as overdue_inspections,
                    (SELECT COUNT(*) FROM maintenance_alerts ma 
                     JOIN persistent_trailers pt ON ma.trailer_id = pt.id 
                     WHERE pt.company_id = ? AND ma.severity = 'critical' AND ma.is_resolved = 0) as critical_alerts
            `, [companyId, companyId, companyId, companyId, companyId], { first: true });
        } catch (error) {
            console.error('Error getting maintenance summary:', error);
            throw new Error('Failed to retrieve maintenance summary');
        }
    }

    async getTrailerMaintenanceHistory(trailerId) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }
            
            return await this.execute(
                `SELECT 
                    'inspection' as type,
                    id,
                    inspection_date as date,
                    inspection_type as description,
                    status,
                    notes,
                    created_at
                FROM trailer_inspections 
                WHERE trailer_id = ?
                
                UNION ALL
                
                SELECT 
                    'tire' as type,
                    id,
                    service_date as date,
                    service_type as description,
                    tire_position as status,
                    notes,
                    created_at
                FROM tire_records 
                WHERE trailer_id = ?
                
                UNION ALL
                
                SELECT 
                    'alert' as type,
                    id,
                    created_at as date,
                    title as description,
                    severity as status,
                    description as notes,
                    created_at
                FROM maintenance_alerts 
                WHERE trailer_id = ?
                
                ORDER BY date DESC`,
                [trailerId, trailerId, trailerId]
            );
        } catch (error) {
            console.error('Error getting trailer maintenance history:', error);
            throw new Error('Failed to retrieve trailer maintenance history');
        }
    }
}

module.exports = MaintenanceManager;

