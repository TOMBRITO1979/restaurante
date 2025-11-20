// ✅ SECURITY & PERFORMANCE: Paginação para prevenir DoS e melhorar UX

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
export function parsePaginationParams(
  query: any,
  options: PaginationOptions = {}
): Required<PaginationParams> {
  const {
    defaultLimit = 20,
    maxLimit = 100,
  } = options;

  // Parse page (default: 1)
  let page = parseInt(query.page as string, 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }

  // Parse limit (default: 20, max: 100)
  let limit = parseInt(query.limit as string, 10);
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
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Cria resposta paginada padronizada
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
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
export function parseSortParams(
  query: any,
  allowedFields: string[],
  defaultField: string = 'createdAt',
  defaultOrder: 'ASC' | 'DESC' = 'DESC'
): { field: string; order: 'ASC' | 'DESC' } {
  let field = query.sortBy as string || defaultField;
  let order = (query.order as string)?.toUpperCase() as 'ASC' | 'DESC' || defaultOrder;

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
export function getLimitOffsetClause(page: number, limit: number): string {
  return `LIMIT ${limit} OFFSET ${calculateOffset(page, limit)}`;
}
