import { Request, Response, NextFunction } from 'express';
/**
 * Middleware para gerar e setar CSRF token
 * Chamado após autenticação bem-sucedida
 */
export declare const setCsrfToken: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware para validar CSRF token
 * Aplica apenas em métodos mutáveis (POST, PUT, DELETE, PATCH)
 */
export declare const validateCsrfToken: (req: Request, res: Response, next: NextFunction) => void;
/**
 * Lista de rotas que não precisam de CSRF
 * Webhooks externos, rotas públicas, etc.
 */
export declare const csrfExemptPaths: string[];
/**
 * Middleware que aplica CSRF apenas em rotas não isentas
 */
export declare const csrfProtection: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=csrfProtection.d.ts.map