"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfProtection = exports.csrfExemptPaths = exports.validateCsrfToken = exports.setCsrfToken = void 0;
const crypto_1 = __importDefault(require("crypto"));
const logger_1 = require("../utils/logger");
// ✅ SECURITY: CSRF Protection - Double Submit Cookie Pattern
const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';
/**
 * Gera token CSRF aleatório
 */
function generateCsrfToken() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
/**
 * Middleware para gerar e setar CSRF token
 * Chamado após autenticação bem-sucedida
 */
const setCsrfToken = (req, res, next) => {
    const token = generateCsrfToken();
    // Set cookie que o frontend pode ler (httpOnly: false)
    res.cookie(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Frontend precisa ler
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 * 24, // 24 horas
    });
    // Também envia no response body para compatibilidade
    res.csrfToken = token;
    next();
};
exports.setCsrfToken = setCsrfToken;
/**
 * Middleware para validar CSRF token
 * Aplica apenas em métodos mutáveis (POST, PUT, DELETE, PATCH)
 */
const validateCsrfToken = (req, res, next) => {
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
    const headerToken = req.headers[CSRF_HEADER_NAME];
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
        logger_1.log.warn('CSRF token inválido', error);
        // Modo permissivo: apenas avisa, não bloqueia
        if (csrfMode === 'permissive') {
            logger_1.log.warn('CSRF validation failed (permissive mode - allowing request)', error);
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
exports.validateCsrfToken = validateCsrfToken;
/**
 * Lista de rotas que não precisam de CSRF
 * Webhooks externos, rotas públicas, etc.
 */
exports.csrfExemptPaths = [
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
const csrfProtection = (req, res, next) => {
    // Verificar se rota está isenta
    const isExempt = exports.csrfExemptPaths.some(path => req.path.startsWith(path));
    if (isExempt) {
        return next();
    }
    // Aplicar validação CSRF
    (0, exports.validateCsrfToken)(req, res, next);
};
exports.csrfProtection = csrfProtection;
//# sourceMappingURL=csrfProtection.js.map