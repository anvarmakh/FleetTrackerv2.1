/**
 * Utility functions for string manipulation
 */

/**
 * Normalize tenant ID: lowercase, replace non-alphanum with '-', remove duplicates, trim ends
 * @param {string} tenantId - Raw tenant ID
 * @returns {string} Normalized tenant ID
 */
function normalizeTenantId(tenantId) {
    if (!tenantId || typeof tenantId !== 'string') {
        return '';
    }
    return tenantId.toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

module.exports = { normalizeTenantId };
