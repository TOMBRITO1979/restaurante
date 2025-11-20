"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = void 0;
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// ✅ SECURITY: Lista de campos sensíveis que devem ser sanitizados
const SENSITIVE_FIELDS = [
    'password',
    'token',
    'secret',
    'authorization',
    'cardNumber',
    'cvv',
    'cvc',
    'resetToken',
    'emailVerificationToken',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'SMTP_PASS',
    'DATABASE_URL',
];
/**
 * ✅ SECURITY: Sanitiza objetos removendo campos sensíveis
 */
function sanitize(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = SENSITIVE_FIELDS.some((field) => lowerKey.includes(field.toLowerCase()));
        if (isSensitive) {
            sanitized[key] = '[REDACTED]';
        }
        else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitize(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
/**
 * ✅ SECURITY: Formato customizado que sanitiza dados sensíveis
 */
const sanitizeFormat = winston_1.default.format((info) => {
    // Sanitiza mensagens
    if (typeof info.message === 'object') {
        info.message = sanitize(info.message);
    }
    // Sanitiza metadados
    if (info.meta) {
        info.meta = sanitize(info.meta);
    }
    // Sanitiza outros campos
    const sanitized = sanitize(info);
    return sanitized;
})();
// ✅ Configuração do Winston Logger
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), sanitizeFormat, winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'chefwell-backend' },
    transports: [
        // Logs de erro em arquivo separado
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        // Todos os logs em combined.log
        new winston_1.default.transports.File({
            filename: path_1.default.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
    ],
});
// ✅ Em desenvolvimento, também exibe logs no console
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple()),
    }));
}
// ✅ Funções auxiliares para facilitar uso
exports.log = {
    error: (message, meta) => {
        logger.error(message, meta ? { meta } : undefined);
    },
    warn: (message, meta) => {
        logger.warn(message, meta ? { meta } : undefined);
    },
    info: (message, meta) => {
        logger.info(message, meta ? { meta } : undefined);
    },
    debug: (message, meta) => {
        logger.debug(message, meta ? { meta } : undefined);
    },
};
exports.default = logger;
//# sourceMappingURL=logger.js.map