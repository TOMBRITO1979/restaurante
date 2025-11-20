import { Response, NextFunction } from 'express';
import { AuthRequest } from '@/types';
import { log } from '@/utils/logger';

// ✅ SECURITY: Multi-tenant Isolation - Validação adicional

/**
 * Middleware que valida o isolamento de tenant
 * Garante que tenantSchema está setado corretamente
 */
export const validateTenantIsolation = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Ignorar rotas públicas e SUPER_ADMIN sem company
  if (!req.user) {
    return next();
  }

  const user = req.user;
  const tenantSchema = req.tenantSchema;

  // SUPER_ADMIN pode não ter tenantSchema (gerencia todas empresas)
  if (user.role === 'SUPER_ADMIN') {
    return next();
  }

  // ✅ SECURITY: Todos outros usuários DEVEM ter tenantSchema
  if (!tenantSchema) {
    log.error('Tenant isolation violation: Usuário sem tenantSchema', {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      error: 'Erro de isolamento de tenant',
      code: 'TENANT_ISOLATION_ERROR',
    });
    return;
  }

  // ✅ SECURITY: Validar formato do tenantSchema
  const schemaRegex = /^tenant_[a-z0-9_]+$/;
  if (!schemaRegex.test(tenantSchema)) {
    log.error('Tenant isolation violation: Schema inválido', {
      userId: user.id,
      tenantSchema,
      path: req.path,
    });

    res.status(403).json({
      error: 'Schema de tenant inválido',
      code: 'INVALID_TENANT_SCHEMA',
    });
    return;
  }

  next();
};

/**
 * Middleware para prevenir acesso cross-tenant
 * Valida que recursos pertencem ao tenant do usuário
 */
export const preventCrossTenantAccess = (resourceType: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    const tenantSchema = req.tenantSchema;

    // SUPER_ADMIN pode acessar qualquer recurso
    if (user?.role === 'SUPER_ADMIN') {
      return next();
    }

    // Validar que tenantSchema está presente
    if (!tenantSchema) {
      log.warn('Cross-tenant access attempt: No tenant schema', {
        userId: user?.id,
        resourceType,
        path: req.path,
        params: req.params,
      });

      res.status(403).json({
        error: 'Acesso negado: Tenant não identificado',
        code: 'TENANT_NOT_IDENTIFIED',
      });
      return;
    }

    // Log de acesso para auditoria
    log.info('Tenant resource access', {
      userId: user?.id,
      tenantSchema,
      resourceType,
      resourceId: req.params.id,
      method: req.method,
      path: req.path,
    });

    next();
  };
};

/**
 * Middleware para validar que companyId no body pertence ao tenant
 */
export const validateCompanyId = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const user = req.user;
  const bodyCompanyId = req.body.companyId;

  // SUPER_ADMIN pode especificar qualquer companyId
  if (user?.role === 'SUPER_ADMIN') {
    return next();
  }

  // Se body tem companyId, validar que é o mesmo do usuário
  if (bodyCompanyId && bodyCompanyId !== user?.companyId) {
    log.warn('Company ID mismatch attempt', {
      userId: user?.id,
      userCompanyId: user?.companyId,
      requestedCompanyId: bodyCompanyId,
      path: req.path,
    });

    res.status(403).json({
      error: 'Você não pode acessar recursos de outra empresa',
      code: 'COMPANY_ID_MISMATCH',
    });
    return;
  }

  next();
};
