/**
 * Registration Workflow Validator
 * Centralized validation for all registration and user creation processes
 */

const { userManager } = require('../database/database-manager');
const { isValidEmail, isValidDOTNumber, isValidPassword } = require('./validation');

class RegistrationValidator {
    
    /**
     * Validate user registration data
     */
    static validateRegistrationData(data) {
        const errors = [];
        
        // Required fields
        if (!data.firstName || !data.firstName.trim()) {
            errors.push('First name is required');
        }
        
        if (!data.lastName || !data.lastName.trim()) {
            errors.push('Last name is required');
        }
        
        if (!data.email || !data.email.trim()) {
            errors.push('Email is required');
        } else if (!isValidEmail(data.email)) {
            errors.push('Invalid email format');
        }
        
        if (!data.password) {
            errors.push('Password is required');
        } else if (!isValidPassword(data.password)) {
            errors.push('Password must be at least 8 characters long');
        }
        
        // Optional DOT number validation
        if (data.dotNumber && !isValidDOTNumber(data.dotNumber)) {
            errors.push('DOT number must be in format DOT123456');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Validate tenant creation data
     */
    static validateTenantData(data) {
        const errors = [];
        
        if (!data.tenantId || !data.tenantId.trim()) {
            errors.push('Tenant ID is required');
        }
        
        if (!data.companyName || !data.companyName.trim()) {
            errors.push('Company name is required');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }
    
    /**
     * Check for existing user conflicts
     */
    static async checkUserConflicts(email, dotNumber = null) {
        const conflicts = [];
        
        try {
            // Check email
            const emailExists = await userManager.emailExists(email);
            if (emailExists) {
                conflicts.push('Email already registered');
            }
            
            // Check DOT number if provided
            if (dotNumber) {
                const dotExists = await userManager.checkDOTNumberExists(dotNumber);
                if (dotExists) {
                    conflicts.push('DOT number already registered');
                }
            }
            
        } catch (error) {
            conflicts.push('Error checking conflicts: ' + error.message);
        }
        
        return {
            hasConflicts: conflicts.length > 0,
            conflicts
        };
    }
    
    /**
     * Normalize user data for consistent processing
     */
    static normalizeUserData(data) {
        return {
            firstName: data.firstName ? data.firstName.trim() : null,
            lastName: data.lastName ? data.lastName.trim() : null,
            email: data.email ? data.email.toLowerCase().trim() : null,
            dotNumber: data.dotNumber ? data.dotNumber.toUpperCase().trim() : null,
            companyName: data.companyName ? data.companyName.trim() : null,
            tenantId: data.tenantId ? data.tenantId.trim() : null,
            phone: data.phone ? data.phone.trim() : null,
            organizationRole: data.organizationRole || 'owner'
        };
    }
    
    /**
     * Generate tenant ID from DOT number
     */
    static generateTenantId(dotNumber) {
        if (!dotNumber) return process.env.DEFAULT_TENANT_ID || 'default';
        return dotNumber.toUpperCase();
    }
    
    /**
     * Comprehensive registration validation
     */
    static async validateCompleteRegistration(data) {
        // Normalize data
        const normalizedData = this.normalizeUserData(data);
        
        // Validate basic data
        const basicValidation = this.validateRegistrationData(normalizedData);
        if (!basicValidation.isValid) {
            return {
                isValid: false,
                errors: basicValidation.errors
            };
        }
        
        // Check conflicts
        const conflictCheck = await this.checkUserConflicts(
            normalizedData.email, 
            normalizedData.dotNumber
        );
        
        if (conflictCheck.hasConflicts) {
            return {
                isValid: false,
                errors: conflictCheck.conflicts
            };
        }
        
        // Generate tenant ID if not provided
        if (!normalizedData.tenantId && normalizedData.dotNumber) {
            normalizedData.tenantId = this.generateTenantId(normalizedData.dotNumber);
        }
        
        return {
            isValid: true,
            normalizedData
        };
    }
}

module.exports = RegistrationValidator; 
