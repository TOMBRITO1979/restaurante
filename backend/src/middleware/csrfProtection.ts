import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { log } from '@/utils/logger';

// ✅ SECURITY: CSRF Protection - Double Submit Cookie Pattern

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Gera token CSRF aleatório
 */
function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware para gerar e setar CSRF token
 * Chamado após autenticação bem-sucedida
 */
export const setCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  const token = generateCsrfToken();

  // Set cookie que o frontend pode ler (httpOnly: false)
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend precisa ler
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 * 24, // 24 horas
  });

  // Também envia no response body para compatibilidade
  (res as any).csrfToken = token;

  next();
};

/**
 * Middleware para validar CSRF token
 * Aplica apenas em métodos mutáveis (POST, PUT, DELETE, PATCH)
 */
export const validateCsrfToken = (req: Request, res: Response, next: NextFunction): void => {
  const method = req.method.toUpperCase();

  // Ignorar métodos seguros (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // ✅ SECURITY: Verificar se CSRF está habilitado
  const csrfEnabled = process.env.CSRF_ENABLED !== 'false'; // Default: true
  const csrfMode = process.env.CSRF_MODE || 'enforcing'; // 'permissive' ou 'enforcing'

  if (!csrfEnabled) {
    return next();
  }

  const cookieToken = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;

  // Validar tokens
  const isValid = cookieToken && headerToken && cookieToken === headerToken;

  if (!isValid) {
    const error = {
      method,
      path: req.path,
      hasCookie: !!cookieToken,
      hasHeader: !!headerToken,
      tokensMatch: cookieToken === headerToken,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    };

    log.warn('CSRF token inválido', error);

    // Modo permissivo: apenas avisa, não bloqueia
    if (csrfMode === 'permissive') {
      log.warn('CSRF validation failed (permissive mode - allowing request)', error);
      return next();
    }

    // Modo enforcing: bloqueia requisição
    res.status(403).json({
      error: 'CSRF token inválido',
      code: 'CSRF_INVALID',
    });
    return;
  }

  next();
};

/**
 * Lista de rotas que não precisam de CSRF
 * Webhooks externos, rotas públicas, etc.
 */
export const csrfExemptPaths = [
  '/api/webhooks/stripe',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/verify-email',
  '/api/payments/config', // Endpoint público
  '/health',
];

/**
 * Middleware que aplica CSRF apenas em rotas não isentas
 */
export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  // Verificar se rota está isenta
  const isExempt = csrfExemptPaths.some(path => req.path.startsWith(path));

  if (isExempt) {
    return next();
  }

  // Aplicar validação CSRF
  validateCsrfToken(req, res, next);
};
