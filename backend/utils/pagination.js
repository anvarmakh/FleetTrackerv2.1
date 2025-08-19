/**
 * Pagination Utility
 * Provides consistent pagination handling across all database queries
 */

/**
 * Default pagination settings
 */
const DEFAULT_PAGINATION = {
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 1000,
    MIN_LIMIT: 1,
    DEFAULT_OFFSET: 0,
    MIN_OFFSET: 0
};

/**
 * Validate and normalize pagination parameters
 * @param {Object} options - Pagination options
 * @param {number} options.limit - Number of items per page
 * @param {number} options.offset - Number of items to skip
 * @param {number} options.page - Page number (alternative to offset)
 * @param {number} options.maxLimit - Maximum allowed limit (overrides default)
 * @returns {Object} Normalized pagination object
 */
function normalizePagination(options = {}) {
    const {
        limit = DEFAULT_PAGINATION.DEFAULT_LIMIT,
        offset = DEFAULT_PAGINATION.DEFAULT_OFFSET,
        page,
        maxLimit = DEFAULT_PAGINATION.MAX_LIMIT
    } = options;

    // Calculate offset from page if provided
    let finalOffset = offset;
    if (page !== undefined && page !== null) {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new Error('Page number must be a positive integer');
        }
        finalOffset = (pageNum - 1) * limit;
    }

    // Validate and normalize limit
    let finalLimit = parseInt(limit);
    if (isNaN(finalLimit) || finalLimit < DEFAULT_PAGINATION.MIN_LIMIT) {
        finalLimit = DEFAULT_PAGINATION.DEFAULT_LIMIT;
    }
    if (finalLimit > maxLimit) {
        finalLimit = maxLimit;
    }

    // Validate offset
    finalOffset = parseInt(finalOffset);
    if (isNaN(finalOffset) || finalOffset < DEFAULT_PAGINATION.MIN_OFFSET) {
        finalOffset = DEFAULT_PAGINATION.DEFAULT_OFFSET;
    }

    return {
        limit: finalLimit,
        offset: finalOffset,
        page: Math.floor(finalOffset / finalLimit) + 1
    };
}

/**
 * Build LIMIT and OFFSET clause for SQL queries
 * @param {Object} pagination - Normalized pagination object
 * @returns {Object} SQL clause and parameters
 */
function buildPaginationClause(pagination) {
    const { limit, offset } = normalizePagination(pagination);
    
    return {
        clause: 'LIMIT ? OFFSET ?',
        params: [limit, offset],
        limit,
        offset
    };
}

/**
 * Create paginated response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination parameters used
 * @param {number} totalCount - Total number of items (before pagination)
 * @returns {Object} Paginated response object
 */
function createPaginatedResponse(data, pagination, totalCount) {
    const { limit, offset, page } = normalizePagination(pagination);
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
        data,
        pagination: {
            page,
            limit,
            offset,
            totalCount,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
            nextPage: page < totalPages ? page + 1 : null,
            previousPage: page > 1 ? page - 1 : null
        }
    };
}

/**
 * Get pagination metadata for a query
 * @param {Object} pagination - Pagination parameters
 * @param {number} totalCount - Total count of items
 * @returns {Object} Pagination metadata
 */
function getPaginationMetadata(pagination, totalCount) {
    const { limit, page } = normalizePagination(pagination);
    const totalPages = Math.ceil(totalCount / limit);
    
    return {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
        startItem: (page - 1) * limit + 1,
        endItem: Math.min(page * limit, totalCount)
    };
}

/**
 * Validate pagination parameters and throw errors for invalid values
 * @param {Object} options - Pagination options to validate
 * @throws {Error} If validation fails
 */
function validatePagination(options) {
    const { limit, offset, page, maxLimit = DEFAULT_PAGINATION.MAX_LIMIT } = options;

    // Validate limit
    if (limit !== undefined && limit !== null) {
        const limitNum = parseInt(limit);
        if (isNaN(limitNum) || limitNum < DEFAULT_PAGINATION.MIN_LIMIT) {
            throw new Error(`Limit must be a positive integer (minimum: ${DEFAULT_PAGINATION.MIN_LIMIT})`);
        }
        if (limitNum > maxLimit) {
            throw new Error(`Limit cannot exceed ${maxLimit}`);
        }
    }

    // Validate offset
    if (offset !== undefined && offset !== null) {
        const offsetNum = parseInt(offset);
        if (isNaN(offsetNum) || offsetNum < DEFAULT_PAGINATION.MIN_OFFSET) {
            throw new Error(`Offset must be a non-negative integer`);
        }
    }

    // Validate page
    if (page !== undefined && page !== null) {
        const pageNum = parseInt(page);
        if (isNaN(pageNum) || pageNum < 1) {
            throw new Error('Page number must be a positive integer');
        }
    }
}

/**
 * Get default pagination settings for different query types
 * @param {string} queryType - Type of query (e.g., 'users', 'trailers', 'companies')
 * @returns {Object} Default pagination settings
 */
function getDefaultPaginationForType(queryType) {
    const defaults = {
        users: { limit: 50, maxLimit: 500 },
        trailers: { limit: 1000, maxLimit: 5000 },
        companies: { limit: 50, maxLimit: 500 },
        providers: { limit: 50, maxLimit: 500 },
        maintenance: { limit: 100, maxLimit: 1000 },
        notes: { limit: 100, maxLimit: 1000 },
        stats: { limit: 50, maxLimit: 500 }
    };

    return defaults[queryType] || { limit: DEFAULT_PAGINATION.DEFAULT_LIMIT, maxLimit: DEFAULT_PAGINATION.MAX_LIMIT };
}

module.exports = {
    DEFAULT_PAGINATION,
    normalizePagination,
    buildPaginationClause,
    createPaginatedResponse,
    getPaginationMetadata,
    validatePagination,
    getDefaultPaginationForType
};
