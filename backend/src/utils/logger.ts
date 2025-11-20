import winston from 'winston';
import path from 'path';

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
function sanitize(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitize);
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      lowerKey.includes(field.toLowerCase())
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitize(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * ✅ SECURITY: Formato customizado que sanitiza dados sensíveis
 */
const sanitizeFormat = winston.format((info) => {
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
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    sanitizeFormat,
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'chefwell-backend' },
  transports: [
    // Logs de erro em arquivo separado
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Todos os logs em combined.log
    new winston.transports.File({
      filename: path.join(__dirname, '../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// ✅ Em desenvolvimento, também exibe logs no console
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// ✅ Funções auxiliares para facilitar uso
export const log = {
  error: (message: string, meta?: any) => {
    logger.error(message, meta ? { meta } : undefined);
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, meta ? { meta } : undefined);
  },
  info: (message: string, meta?: any) => {
    logger.info(message, meta ? { meta } : undefined);
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, meta ? { meta } : undefined);
  },
};

export default logger;
