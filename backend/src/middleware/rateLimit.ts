import rateLimit from 'express-rate-limit';

// Rate limiter para login - prevenir brute force
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 tentativas por IP
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

// Rate limiter para reset de senha
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 resets por hora
  message: { error: 'Muitas solicitações de reset de senha. Tente novamente em 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para criação de recursos (produtos, vendas, etc)
export const createResourceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 criações por minuto
  message: { error: 'Muitas requisições. Aguarde um momento.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter geral para API
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 100, // 100 requests por minuto
  message: { error: 'Limite de requisições excedido. Tente novamente em breve.' },
  standardHeaders: true,
  legacyHeaders: false,
});
