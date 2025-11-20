"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.csrfExemptPaths = exports.cookieParserMiddleware = exports.csrfProtection = void 0;
const csurf_1 = __importDefault(require("csurf"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
// ✅ SECURITY: Proteção CSRF para prevenir ataques cross-site
exports.csrfProtection = (0, csurf_1.default)({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hora
    },
});
// Middleware para parse de cookies (necessário para CSRF)
exports.cookieParserMiddleware = (0, cookie_parser_1.default)();
// Lista de rotas que não precisam de CSRF (GET, HEAD, OPTIONS)
// E webhooks externos (Stripe)
exports.csrfExemptPaths = [
    '/api/webhooks/stripe',
    '/api/payments/config', // Endpoint público
];
//# sourceMappingURL=csrf.js.map