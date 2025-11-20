export interface PaginationParams {
    page?: number;
    limit?: number;
}
export interface PaginationOptions {
    defaultLimit?: number;
    maxLimit?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}
/**
 * Extrai e valida parâmetros de paginação de query string
 */
export declare function parsePaginationParams(query: any, options?: PaginationOptions): Required<PaginationParams>;
/**
 * Calcula offset para SQL queries
 */
export declare function calculateOffset(page: number, limit: number): number;
/**
 * Cria resposta paginada padronizada
 */
export declare function createPaginatedResponse<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T>;
/**
 * Valida e sanitiza parâmetros de ordenação
 */
export declare function parseSortParams(query: any, allowedFields: string[], defaultField?: string, defaultOrder?: 'ASC' | 'DESC'): {
    field: string;
    order: 'ASC' | 'DESC';
};
/**
 * Gera cláusula SQL LIMIT/OFFSET com validação
 */
export declare function getLimitOffsetClause(page: number, limit: number): string;
//# sourceMappingURL=pagination.d.ts.map