import csrf from 'csurf';
import cookieParser from 'cookie-parser';

// ✅ SECURITY: Proteção CSRF para prevenir ataques cross-site
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hora
  },
});

// Middleware para parse de cookies (necessário para CSRF)
export const cookieParserMiddleware = cookieParser();

// Lista de rotas que não precisam de CSRF (GET, HEAD, OPTIONS)
// E webhooks externos (Stripe)
export const csrfExemptPaths = [
  '/api/webhooks/stripe',
  '/api/payments/config', // Endpoint público
];
