import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
/**
 * Middleware que valida o isolamento de tenant
 * Garante que tenantSchema está setado corretamente
 */
export declare const validateTenantIsolation: (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware para prevenir acesso cross-tenant
 * Valida que recursos pertencem ao tenant do usuário
 */
export declare const preventCrossTenantAccess: (resourceType: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
/**
 * Middleware para validar que companyId no body pertence ao tenant
 */
export declare const validateCompanyId: (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=tenantIsolation.d.ts.map