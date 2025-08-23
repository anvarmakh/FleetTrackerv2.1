/**
 * Trailer Manager
 * Handles all trailer-related database operations including GPS data, maintenance, and location management
 */

const {
    generateId, getCurrentTimestamp, formatDateForDB, parseDateFromDB,
    executeQuery, executeSingleQuery, executeQueryFirst, executeInTransaction,
    executeQueryCamelCase, executeQueryFirstCamelCase,
    buildWhereClause, buildOrderByClause, buildLimitClause
} = require('../utils/db-helpers');

const { TRAILER_STATUS, GPS_STATUS, CACHE_KEYS } = require('../../utils/constants');
const BaseManager = require('./baseManager');
const { normalizePagination, buildPaginationClause, createPaginatedResponse, getDefaultPaginationForType } = require('../../utils/pagination');
const cacheService = require('../../services/cache-service');
const logger = require('../../utils/logger');

class TrailerManager extends BaseManager {
    constructor(db) {
        super(db);
    }

    /**
     * Get enhanced trailer data with maintenance information (unified method)
     * @param {string} filterType - 'company' or 'tenant'
     * @param {string} filterValue - company ID or tenant ID
     * @param {object} filters - additional filters
     * @param {string} tenantId - tenant ID for maintenance calculations
     */
    async getEnhancedTrailerData(filterType, filterValue, filters = {}, tenantId = null) {
        try {
            if (!filterType || !filterValue) {
                throw new Error('Filter type and value are required');
            }
            
            if (!['company', 'tenant'].includes(filterType)) {
                throw new Error('Filter type must be either "company" or "tenant"');
            }
            
            // Validate and sanitize inputs
            if (typeof filterValue !== 'string') {
                throw new Error('Valid filter value is required');
            }
            
            // Sanitize filters object to prevent injection
            const sanitizedFilters = this.sanitizeFilters(filters);
            const sanitizedTenantId = tenantId && typeof tenantId === 'string' ? tenantId.trim() : null;

            let query = `
                SELECT 
                    pt.*,
                    COALESCE(c.name, cc.name) as company_name,
                    COALESCE(c.color, '#6b7280') as company_color,
                    CASE WHEN cc.id IS NOT NULL THEN 1 ELSE 0 END as is_custom_company,
                    pt.last_gps_update,
                    pt.last_sync,
                    -- Maintenance data
                    (SELECT json_group_array(
                        json_object(
                            'id', ti.id,
                            'type', ti.inspection_type,
                            'date', ti.inspection_date,
                            'expiry_date', ti.expiry_date,
                            'inspector', ti.inspector,
                            'status', ti.status
                        )
                    ) FROM trailer_inspections ti WHERE ti.trailer_id = pt.id) as inspections,
                    (SELECT json_group_array(
                        json_object(
                            'id', tr.id,
                            'position', tr.tire_position,
                            'service_date', tr.service_date,
                            'service_type', tr.service_type
                        )
                    ) FROM tire_records tr WHERE tr.trailer_id = pt.id) as tire_records,
                    (SELECT json_group_array(
                        json_object(
                            'id', sn.id,
                            'content', sn.content,
                            'category', sn.category,
                            'created_at', sn.created_at
                        )
                    ) FROM system_notes sn WHERE sn.entity_type = 'trailer' AND sn.entity_id = pt.id ORDER BY sn.created_at DESC LIMIT 5) as recent_notes,
                    (SELECT COUNT(*) FROM maintenance_alerts ma WHERE ma.trailer_id = pt.id AND ma.is_resolved = 0) as alert_count
                FROM persistent_trailers pt
                LEFT JOIN companies c ON pt.company_id = c.id
                LEFT JOIN trailer_custom_companies cc ON pt.company_id = cc.id
                WHERE pt.${filterType === 'company' ? 'company_id' : 'tenant_id'} = ?
            `;

            const params = [filterValue];

            // Add tenant filter if provided and filtering by company
            if (filterType === 'company' && sanitizedTenantId) {
                query += ` AND pt.tenant_id = ?`;
                params.push(sanitizedTenantId);
            }

            // Apply filters
            if (sanitizedFilters.search) {
                query += ` AND (pt.unit_number LIKE ? OR pt.make LIKE ? OR pt.model LIKE ?)`;
                params.push(`%${sanitizedFilters.search}%`, `%${sanitizedFilters.search}%`, `%${sanitizedFilters.search}%`);
            }

            if (sanitizedFilters.status) {
                query += ` AND pt.status = ?`;
                params.push(sanitizedFilters.status);
            }

            if (sanitizedFilters.company) {
                query += ` AND pt.company_id = ?`;
                params.push(sanitizedFilters.company);
            }

            if (sanitizedFilters.gpsStatus) {
                query += ` AND pt.gps_status = ?`;
                params.push(sanitizedFilters.gpsStatus);
            }

            // Add sorting with allowed fields whitelist
            const allowedSortFields = [
                'unit_number','make','model','year','status','gps_status','last_gps_update','created_at','updated_at'
            ];
            query += buildOrderByClause(sanitizedFilters.sortBy, sanitizedFilters.sortOrder, allowedSortFields);
            
            // Add pagination with proper validation
            const paginationOptions = {
                limit: sanitizedFilters.limit,
                offset: sanitizedFilters.offset,
                page: sanitizedFilters.page
            };
            
            // Get default pagination settings for trailers
            const defaultSettings = getDefaultPaginationForType('trailers');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...paginationOptions });
            
            query += ` LIMIT ? OFFSET ?`;
            params.push(normalizedPagination.limit, normalizedPagination.offset);

            const rows = await this.execute(query, params, { camelCase: true });
            
            const trailers = await Promise.all(rows.map(async row => {
                // Parse maintenance data
                let inspections = [];
                let tireRecords = [];
                let recentNotes = [];

                try {
                    inspections = row.inspections ? JSON.parse(row.inspections) : [];
                    tireRecords = row.tireRecords ? JSON.parse(row.tireRecords) : [];
                    recentNotes = row.recentNotes ? JSON.parse(row.recentNotes) : [];
                } catch (parseError) {
                    console.error('JSON parse error for trailer:', row.id, parseError);
                }

                // Calculate maintenance status
                const maintenanceData = this.calculateMaintenanceStatus(inspections, tireRecords);
                
                // Calculate maintenance alerts based on inspection dates
                let maintenanceAlerts = [];
                try {
                    const MaintenanceService = require('../../services/maintenance');
                    maintenanceAlerts = await MaintenanceService.calculateTrailerMaintenanceAlerts(row, tenantId);
                } catch (error) {
                    console.warn('Could not load maintenance service:', error.message);
                }

                return {
                    ...row,
                    maintenance: {
                        ...maintenanceData,
                        alertCount: row.alertCount || 0,
                        alerts: maintenanceAlerts,
                        tireRecords: tireRecords,
                        recentNotes: recentNotes
                    }
                };
            }));
            
            return trailers;
        } catch (error) {
            console.error('❌ Error fetching trailers:', error);
            throw error;
        }
    }



    /**
     * Calculate maintenance status from inspections and tire records
     */
    calculateMaintenanceStatus(inspections, tireRecords) {
        const now = new Date();
        
        // Find latest annual inspection
        const annualInspections = inspections.filter(i => i.type === 'annual').sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastAnnualInspection = annualInspections[0];
        
        // Find latest midtrip inspection
        const midtripInspections = inspections.filter(i => i.type === 'midtrip').sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastMidtripInspection = midtripInspections[0];
        
        let maintenanceStatus = {
            lastAnnualInspection: null,
            lastMidtripInspection: null
        };
        
        if (lastAnnualInspection) {
            const expiryDate = new Date(lastAnnualInspection.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
            
            maintenanceStatus.lastAnnualInspection = {
                date: lastAnnualInspection.date,
                expiryDate: lastAnnualInspection.expiry_date,
                inspector: lastAnnualInspection.inspector,
                daysUntilExpiry: daysUntilExpiry,
                status: daysUntilExpiry < 0 ? 'overdue' : daysUntilExpiry <= 30 ? 'due_soon' : 'current'
            };
        }
        
        if (lastMidtripInspection) {
            maintenanceStatus.lastMidtripInspection = {
                date: lastMidtripInspection.date,
                inspector: lastMidtripInspection.inspector,
                status: lastMidtripInspection.status
            };
        }
        
        return maintenanceStatus;
    }

    // DEPRECATED: updateTrailerLocation() removed - use applyLocationUpdate() directly

    /**
     * Get all trailers for a company with pagination
     * @param {string} companyId - Company ID
     * @param {Object} pagination - Pagination options
     * @param {number} pagination.limit - Number of trailers per page
     * @param {number} pagination.offset - Number of trailers to skip
     * @param {number} pagination.page - Page number (alternative to offset)
     * @returns {Promise<Object>} Paginated response with trailers and pagination metadata
     */
    async getAllTrailersForCompany(companyId, pagination = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Get default pagination settings for trailers
            const defaultSettings = getDefaultPaginationForType('trailers');
            const normalizedPagination = normalizePagination({ ...defaultSettings, ...pagination });

            const filters = { company_id: companyId };
            const { whereClause, whereParams, orderBy } = this.buildQueryParts(filters, { 
                sort: { updated_at: 'DESC' },
                allowedFields: ['company_id', 'status', 'unit_number', 'vin', 'make', 'model', 'year', 'plate']
            });
            // Trailers may not have is_active, so no appendCommonConditions

            // Build count query for total items
            const countQuery = `
                SELECT COUNT(*) as total FROM persistent_trailers 
                ${whereClause}
            `;

            // Build data query with pagination
            const dataQuery = `
                SELECT * FROM persistent_trailers 
                ${whereClause}
                ${orderBy}
                LIMIT ? OFFSET ?
            `;
            
            // Execute both queries
            const [totalResult, trailers] = await Promise.all([
                this.execute(countQuery, whereParams, { first: true }),
                this.execute(dataQuery, [...whereParams, normalizedPagination.limit, normalizedPagination.offset], { camelCase: true })
            ]);
            
            const totalCount = totalResult.total;
            
            const result = createPaginatedResponse(trailers, normalizedPagination, totalCount);
            
            // Cache the result
            cacheService.set(`${CACHE_KEYS.TRAILER_LIST}:${companyId}`, result, null, 300); // 5 minutes cache
            
            return result;
        } catch (error) {
            console.error('❌ Error fetching trailers for company:', error);
            throw error;
        }
    }

    /**
     * Get trailer by device ID (GPS unit number, VIN, or external_id)
     */
    async getTrailerByDeviceId(deviceId, companyId) {
        try {
            if (!deviceId) {
                throw new Error('Device ID is required');
            }
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const query = `
                SELECT * FROM persistent_trailers 
                WHERE (unit_number = ? OR vin = ? OR external_id = ?) AND company_id = ?
            `;
            
            return await this.execute(query, [deviceId, deviceId, deviceId, companyId], { camelCase: true, first: true });
        } catch (error) {
            console.error('❌ Error fetching trailer by device ID:', error);
            throw error;
        }
    }

    /**
     * Get trailer by ID
     */
    async getTrailerById(trailerId) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }
            return await this.getEntityById('persistent_trailers', trailerId);
        } catch (error) {
            console.error('❌ Error fetching trailer by ID:', error);
            throw error;
        }
    }

    /**
     * Update trailer with GPS data
     */
    async updateTrailer(trailerId, trailerData) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }

            const {
                unit_number, make, model, year, vin, plate, status,
                latitude, longitude, address, speed, heading,
                connection_status, signal_strength, battery_level,
                last_latitude, last_longitude, last_address
            } = trailerData;

            // Handle location updates through unified system
            if (last_latitude || last_longitude || last_address || latitude || longitude || address) {
                await this.applyLocationUpdate(trailerId, {
                    latitude: last_latitude || latitude,
                    longitude: last_longitude || longitude,
                    address: last_address || address,
                    source: 'gps',
                    occurredAtUTC: new Date().toISOString()
                });
            }

            // Update non-location fields
            const updateData = {};
            const nonLocationFields = {
                unit_number, make, model, year, vin, plate, status,
                gps_status: connection_status
            };

            for (const [key, value] of Object.entries(nonLocationFields)) {
                if (value !== undefined) {
                    updateData[key] = value;
                }
            }

            if (Object.keys(updateData).length > 0) {
                await this.updateEntity('persistent_trailers', trailerId, updateData);
            }
            
            return { changes: 1 };
        } catch (error) {
            console.error('❌ Error updating trailer:', error);
            throw error;
        }
    }

    // DEPRECATED: updateTrailerAddress() removed - use applyLocationUpdate() directly

    /**
     * Create new trailer
     */
    async createTrailer(trailerData, companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            // Validate trailer data
            if (!trailerData.unit_number && !trailerData.originalId && !trailerData.deviceId) {
                throw new Error('Unit number, original ID, or device ID is required');
            }

            const finalStatus = trailerData.status || TRAILER_STATUS.AVAILABLE;

            // Use GPS store UNIT number (originalId from GPS data) or manual unit number
            const unitNumber = trailerData.originalId || trailerData.unit_number || trailerData.deviceId;

            const entityData = {
                company_id: companyId,
                tenant_id: trailerData.tenant_id,
                external_id: trailerData.deviceId || trailerData.originalId || trailerData.id,
                provider_id: trailerData.provider_id || null,
                unit_number: unitNumber,
                make: trailerData.make,
                model: trailerData.model,
                year: trailerData.year,
                vin: trailerData.vin,
                plate: trailerData.plate || null,
                status: finalStatus,
                gps_enabled: trailerData.gps_enabled || false,
                gps_status: trailerData.gps_status || GPS_STATUS.DISCONNECTED,
                last_latitude: trailerData.latitude,
                last_longitude: trailerData.longitude,
                last_address: trailerData.address,
                last_gps_update: trailerData.lastUpdate ? formatDateForDB(trailerData.lastUpdate) : getCurrentTimestamp(),
                last_sync: getCurrentTimestamp(),
                manual_location_override: trailerData.manual_location_override || false,
                manual_location_notes: trailerData.manual_location_notes || null,
                last_annual_inspection: trailerData.last_annual_inspection || null,
                next_annual_inspection_due: trailerData.next_annual_inspection_due || null,
                last_midtrip_inspection: trailerData.last_midtrip_inspection || null,
                next_midtrip_inspection_due: trailerData.next_midtrip_inspection_due || null,
                last_brake_inspection: trailerData.last_brake_inspection || null,
                next_brake_inspection_due: trailerData.next_brake_inspection_due || null,
                tire_status: trailerData.tire_status || 'unknown',
                last_tire_service: trailerData.last_tire_service || null
            };

            // Debug logging for address issues
            if (trailerData.provider_id === 'Spireon') {
                logger.debug('Creating Spireon trailer', {
                    unitNumber,
                    externalId: trailerData.deviceId || trailerData.originalId || trailerData.id,
                    address: trailerData.address,
                    lastAddress: trailerData.last_address,
                    coordinates: `${trailerData.latitude}, ${trailerData.longitude}`
                });
            }

            const trailerId = await this.createEntity('persistent_trailers', entityData);

            logger.info(`Trailer created: ${trailerId}`);
            return { id: trailerId };
        } catch (error) {
            console.error('❌ Error creating trailer:', error);
            throw error;
        }
    }

    /**
     * Delete trailer
     */
    async deleteTrailer(trailerId) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }
            return await this.deleteEntity('persistent_trailers', trailerId, false); // Hard delete
        } catch (error) {
            console.error('❌ Error deleting trailer:', error);
            throw error;
        }
    }

    /**
     * Update trailer information
     */
    async updateTrailerInfo(trailerId, updateData) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }



            const allowedUpdates = {};
            const allowedFields = [
                'unit_number', 'make', 'model', 'year', 'vin', 'status',
                'last_annual_inspection', 'next_annual_inspection_due',
                'last_midtrip_inspection', 'next_midtrip_inspection_due',
                'last_brake_inspection', 'next_brake_inspection_due',
                'tire_status', 'last_tire_service',
                'manual_location_override', 'manual_location_notes',
                'last_address', 'last_latitude', 'last_longitude'
            ];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    allowedUpdates[field] = updateData[field];
                }
            }

            if (Object.keys(allowedUpdates).length === 0) {
                throw new Error('No valid fields to update');
            }



            const result = await this.updateEntity('persistent_trailers', trailerId, allowedUpdates);
            
            // Invalidate trailer cache for this company
            const trailer = await this.getTrailerById(trailerId);
            if (trailer && trailer.companyId) {
                cacheService.delete(`${CACHE_KEYS.TRAILER_LIST}:${trailer.companyId}`);
            }
            
            // Return the updated trailer data
            return trailer;
        } catch (error) {
            console.error('❌ Error updating trailer info:', error);
            throw error;
        }
    }

    /**
     * Mark trailer as disconnected
     */
    async markTrailerAsDisconnected(trailerId) {
        try {
            if (!trailerId) {
                throw new Error('Trailer ID is required');
            }

            const query = `
                UPDATE persistent_trailers SET
                    gps_status = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;
            
            const result = await this.executeSingle(query, [GPS_STATUS.DISCONNECTED, trailerId]);
            return { changes: result.changes };
        } catch (error) {
            console.error('❌ Error marking trailer as disconnected:', error);
            throw error;
        }
    }

    /**
     * Get trailer by external ID (from GPS provider)
     */
    async getTrailerByExternalId(externalId, companyId = null) {
        try {
            let query = `SELECT * FROM persistent_trailers WHERE external_id = ?`;
            let params = [externalId];
            if (companyId) {
                query += ` AND company_id = ?`;
                params.push(companyId);
            }
            
            const result = await this.execute(query, params, { camelCase: true, first: true });
            return result;
        } catch (error) {
            console.error('Error getting trailer by external ID:', error);
            return null;
        }
    }

    /**
     * Get trailer by unit number (for duplicate prevention)
     */
    async getTrailerByUnitNumber(unitNumber, companyId = null) {
        try {
            let query = `SELECT * FROM persistent_trailers WHERE unit_number = ?`;
            let params = [unitNumber];
            if (companyId) {
                query += ` AND company_id = ?`;
                params.push(companyId);
            }
            
            const result = await this.execute(query, params, { camelCase: true, first: true });
            return result;
        } catch (error) {
            console.error('Error getting trailer by unit number:', error);
            return null;
        }
    }

    /**
     * Check if unit number exists within the same tenant
     * @param {string} unitNumber - The unit number to check
     * @param {string} tenantId - The tenant ID
     * @param {string} excludeTrailerId - Optional trailer ID to exclude from check (for updates)
     * @returns {Promise<Object|null>} - Returns existing trailer if found, null otherwise
     */
    async checkUnitNumberExistsInTenant(unitNumber, tenantId, excludeTrailerId = null) {
        try {
            if (!unitNumber || !tenantId) {
                return null;
            }

            let query = `
                SELECT * FROM persistent_trailers 
                WHERE unit_number = ? AND tenant_id = ?
            `;
            let params = [unitNumber, tenantId];

            if (excludeTrailerId) {
                query += ` AND id != ?`;
                params.push(excludeTrailerId);
            }

            const result = await this.execute(query, params, { camelCase: true, first: true });
            return result;
        } catch (error) {
            console.error('Error checking unit number existence in tenant:', error);
            return null;
        }
    }

    /**
     * Validate trailer data for creation/update
     * @param {Object} trailerData - Trailer data to validate
     * @param {string} tenantId - Tenant ID for duplicate checking
     * @param {string} excludeTrailerId - Optional trailer ID to exclude (for updates)
     * @returns {Promise<Object>} - Validation result with isValid flag and errors array
     */
    async validateTrailerData(trailerData, tenantId, excludeTrailerId = null) {
        const errors = [];
        
        // Basic validation
        if (!trailerData.unit_number && !trailerData.originalId && !trailerData.deviceId) {
            errors.push('Unit number, original ID, or device ID is required');
        }

        if (trailerData.year && (isNaN(trailerData.year) || trailerData.year < 1900 || trailerData.year > new Date().getFullYear() + 1)) {
            errors.push('Invalid year');
        }

        if (trailerData.vin && trailerData.vin.length !== 17) {
            errors.push('VIN must be 17 characters long');
        }

        // Check for duplicate device ID (external_id) within tenant - this is critical
        if (trailerData.external_id && tenantId) {
            const existingTrailer = await this.getTrailerByDeviceId(trailerData.external_id, trailerData.company_id);
            if (existingTrailer && existingTrailer.id !== excludeTrailerId) {
                errors.push(`A trailer with device ID "${trailerData.external_id}" already exists in your fleet`);
            }
        }

        // Check for duplicate unit number within tenant - this is a warning, not an error
        if (trailerData.unit_number && tenantId) {
            const existingTrailer = await this.checkUnitNumberExistsInTenant(
                trailerData.unit_number, 
                tenantId, 
                excludeTrailerId
            );
            
            if (existingTrailer) {
                // This is a warning, not an error - unit numbers can be duplicated intentionally
                console.warn(`Warning: A trailer with unit number "${trailerData.unit_number}" already exists in your fleet`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }



    // DEPRECATED: This duplicate updateTrailer method has been removed
    // Use updateTrailerInfo() for general updates or applyLocationUpdate() for location updates

    /**
     * Sanitize and validate filter inputs to prevent injection attacks
     * @param {Object} filters - Raw filter object
     * @returns {Object} Sanitized filter object
     */
    sanitizeFilters(filters) {
        if (!filters || typeof filters !== 'object') {
            return {};
        }

        const sanitized = {};
        
        // Sanitize search string
        if (filters.search && typeof filters.search === 'string') {
            // Remove potentially dangerous characters and limit length
            sanitized.search = filters.search.trim().substring(0, 100).replace(/[<>'"]/g, '');
        }
        
        // Validate status against allowed values
        if (filters.status && typeof filters.status === 'string') {
            const allowedStatuses = Object.values(TRAILER_STATUS);
            if (allowedStatuses.includes(filters.status)) {
                sanitized.status = filters.status;
            }
        }
        
        // Validate company ID format
        if (filters.company && typeof filters.company === 'string') {
            // Basic UUID format validation
            if (/^[a-f0-9-]{36}$/i.test(filters.company)) {
                sanitized.company = filters.company;
            }
        }
        
        // Validate GPS status against allowed values
        if (filters.gpsStatus && typeof filters.gpsStatus === 'string') {
            const allowedGpsStatuses = Object.values(GPS_STATUS);
            if (allowedGpsStatuses.includes(filters.gpsStatus)) {
                sanitized.gpsStatus = filters.gpsStatus;
            }
        }
        
        // Validate sort parameters
        if (filters.sortBy && typeof filters.sortBy === 'string') {
            const allowedSortFields = [
                'unit_number', 'make', 'model', 'year', 'status', 'gps_status', 
                'last_gps_update', 'created_at', 'updated_at'
            ];
            if (allowedSortFields.includes(filters.sortBy)) {
                sanitized.sortBy = filters.sortBy;
            }
        }
        
        if (filters.sortOrder && typeof filters.sortOrder === 'string') {
            const order = filters.sortOrder.toUpperCase();
            if (order === 'ASC' || order === 'DESC') {
                sanitized.sortOrder = order;
            }
        }
        
        // Validate pagination parameters
        if (filters.limit !== undefined) {
            const limit = parseInt(filters.limit);
            if (!isNaN(limit) && limit > 0) {
                sanitized.limit = limit;
            }
        }
        
        if (filters.offset !== undefined) {
            const offset = parseInt(filters.offset);
            if (!isNaN(offset) && offset >= 0) {
                sanitized.offset = offset;
            }
        }
        
        if (filters.page !== undefined) {
            const page = parseInt(filters.page);
            if (!isNaN(page) && page > 0) {
                sanitized.page = page;
            }
        }
        
        return sanitized;
    }

    /**
     * Unified location update with conflict resolution
     * @param {string} trailerId - Trailer ID
     * @param {Object} locationData - Location data
     * @param {number} locationData.latitude - Latitude
     * @param {number} locationData.longitude - Longitude
     * @param {string} locationData.address - Address
     * @param {string} locationData.source - 'gps' or 'manual'
     * @param {string} locationData.occurredAtUTC - ISO 8601 UTC timestamp
     * @param {string} locationData.notes - Notes (for manual updates)
     * @returns {Promise<Object>} Update result
     */
    async applyLocationUpdate(trailerId, { latitude, longitude, address, source = 'gps', occurredAtUTC, notes = null }) {
        try {
            // Get current trailer data
            const currentTrailer = await this.getTrailerById(trailerId);
            if (!currentTrailer) {
                throw new Error('Trailer not found');
            }

            // 2. System caches locations and ignores if no update
            // Check if coordinates have actually changed (coordinate caching)
            const currentLat = parseFloat(currentTrailer.last_latitude) || 0;
            const currentLng = parseFloat(currentTrailer.last_longitude) || 0;
            const newLat = parseFloat(latitude) || 0;
            const newLng = parseFloat(longitude) || 0;
            
            // Use precision of 5 decimal places (~1 meter accuracy)
            const latChanged = Math.abs(currentLat - newLat) > 0.00001;
            const lngChanged = Math.abs(currentLng - newLng) > 0.00001;
            const coordinatesChanged = latChanged || lngChanged;
            
            // Check if update should proceed based on conflict resolution rules
            const shouldUpdate = this.shouldUpdateLocation(currentTrailer, source, occurredAtUTC);
            
            if (!shouldUpdate) {
                return { 
                    changes: 0,
                    skipped: true,
                    message: 'Location update skipped (conflict resolution)'
                };
            }
            
            // Skip if coordinates haven't changed (caching logic)
            if (!coordinatesChanged && source === 'gps') {
                return { 
                    changes: 0,
                    skipped: true,
                    message: 'Location update skipped (coordinates unchanged)'
                };
            }

            // 3. Geocode updated coordinates (only if coordinates changed)
            let finalAddress = address;
            if (coordinatesChanged && latitude !== null && longitude !== null) {
                try {
                    // Validate coordinates before geocoding
                    const latNum = parseFloat(latitude);
                    const lngNum = parseFloat(longitude);
                    
                    if (!isNaN(latNum) && !isNaN(lngNum) && 
                        latNum >= -90 && latNum <= 90 && 
                        lngNum >= -180 && lngNum <= 180) {
                        
                        const geocodingService = require('../../services/geocoding');
                        const geocodeResult = await geocodingService.getStandardizedAddress(latNum, lngNum);
                        
                        // 4. Send address in correct format - use Google's standardized format
                        if (geocodeResult && geocodeResult !== 'Location unavailable') {
                            finalAddress = geocodeResult;
                        } else {
                            finalAddress = address || 'Location unavailable';
                        }
                    } else {
                        finalAddress = address || 'Location unavailable';
                    }
                } catch (geocodeError) {
                    finalAddress = address || 'Location unavailable';
                }
            }

            // Prepare update data
            const updateData = {
                last_latitude: latitude,
                last_longitude: longitude,
                last_address: finalAddress,
                location_source: source,
                location_updated_at: occurredAtUTC || new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Set source-specific fields
            if (source === 'gps') {
                updateData.last_gps_update = occurredAtUTC || new Date().toISOString();
                updateData.last_sync = new Date().toISOString();
                // Clear manual override if we're replacing a manual location
                if (currentTrailer.location_source === 'manual') {
                    updateData.manual_location_override = 0;
                    updateData.manual_location_notes = null;
                }
            } else if (source === 'manual') {
                updateData.manual_location_override = 1;
                updateData.manual_location_notes = notes || null;
            }

            // Execute update
            const result = await this.updateEntity('persistent_trailers', trailerId, updateData);
            
            // Invalidate cache
            if (currentTrailer.companyId) {
                cacheService.delete(`${CACHE_KEYS.TRAILER_LIST}:${currentTrailer.companyId}`);
            }
            
            return { 
                changes: result.changes,
                message: `Location updated successfully (${source} source)`
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Determine if location update should proceed based on conflict resolution rules
     * @param {Object} currentTrailer - Current trailer data
     * @param {string} newSource - New location source ('gps' or 'manual')
     * @param {string} newTimestamp - New location timestamp (ISO 8601 UTC)
     * @returns {boolean} Whether update should proceed
     */
    shouldUpdateLocation(currentTrailer, newSource, newTimestamp) {
        const currentSource = currentTrailer.location_source || 'gps';
        const currentTimestamp = currentTrailer.location_updated_at;
        
        // Manual overrides always win unless explicitly cleared
        if (currentSource === 'manual' && newSource === 'gps') {
            return false; // GPS cannot override manual
        }
        
        // If both are GPS, compare timestamps
        if (currentSource === 'gps' && newSource === 'gps') {
            if (!newTimestamp || !currentTimestamp) {
                return true; // If we can't compare timestamps, allow update
            }
            return new Date(newTimestamp) > new Date(currentTimestamp);
        }
        
        // Manual can always override GPS
        if (currentSource === 'gps' && newSource === 'manual') {
            return true;
        }
        
        // Manual can override manual (user is updating their manual entry)
        if (currentSource === 'manual' && newSource === 'manual') {
            return true;
        }
        
        return false;
    }
}

module.exports = TrailerManager;
