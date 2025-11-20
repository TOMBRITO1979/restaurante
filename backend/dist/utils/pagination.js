"use strict";
// ✅ SECURITY & PERFORMANCE: Paginação para prevenir DoS e melhorar UX
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePaginationParams = parsePaginationParams;
exports.calculateOffset = calculateOffset;
exports.createPaginatedResponse = createPaginatedResponse;
exports.parseSortParams = parseSortParams;
exports.getLimitOffsetClause = getLimitOffsetClause;
/**
 * Extrai e valida parâmetros de paginação de query string
 */
function parsePaginationParams(query, options = {}) {
    const { defaultLimit = 20, maxLimit = 100, } = options;
    // Parse page (default: 1)
    let page = parseInt(query.page, 10);
    if (isNaN(page) || page < 1) {
        page = 1;
    }
    // Parse limit (default: 20, max: 100)
    let limit = parseInt(query.limit, 10);
    if (isNaN(limit) || limit < 1) {
        limit = defaultLimit;
    }
    if (limit > maxLimit) {
        limit = maxLimit;
    }
    return { page, limit };
}
/**
 * Calcula offset para SQL queries
 */
function calculateOffset(page, limit) {
    return (page - 1) * limit;
}
/**
 * Cria resposta paginada padronizada
 */
function createPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
}
/**
 * Valida e sanitiza parâmetros de ordenação
 */
function parseSortParams(query, allowedFields, defaultField = 'createdAt', defaultOrder = 'DESC') {
    let field = query.sortBy || defaultField;
    let order = query.order?.toUpperCase() || defaultOrder;
    // ✅ SECURITY: Validar field para prevenir SQL injection
    if (!allowedFields.includes(field)) {
        field = defaultField;
    }
    // ✅ SECURITY: Validar order
    if (order !== 'ASC' && order !== 'DESC') {
        order = defaultOrder;
    }
    return { field, order };
}
/**
 * Gera cláusula SQL LIMIT/OFFSET com validação
 */
function getLimitOffsetClause(page, limit) {
    return `LIMIT ${limit} OFFSET ${calculateOffset(page, limit)}`;
}
//# sourceMappingURL=pagination.js.map