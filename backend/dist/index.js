"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const routes_1 = __importDefault(require("./routes"));
const database_1 = require("./utils/database");
const recurringExpensesCron_1 = require("./jobs/recurringExpensesCron");
const redis_1 = require("./utils/redis");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ✅ SECURITY: Trust proxy - Required for rate limiting behind reverse proxy (Traefik)
app.set('trust proxy', 1);
// ✅ SECURITY: Helmet - Complete security headers configuration
app.use((0, helmet_1.default)({
    // Content Security Policy - Previne XSS attacks
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: "cross-origin" },
    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disable for API compatibility
    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: "same-origin" },
    // DNS Prefetch Control - Previne DNS leakage
    dnsPrefetchControl: { allow: false },
    // Frameguard - Previne clickjacking
    frameguard: { action: "deny" },
    // Hide Powered By - Oculta tecnologia do servidor
    hidePoweredBy: true,
    // HSTS - Force HTTPS (180 dias)
    hsts: {
        maxAge: 15552000, // 180 days
        includeSubDomains: true,
        preload: true,
    },
    // IE No Open - Previne IE de executar downloads
    ieNoOpen: true,
    // No Sniff - Previne MIME type sniffing
    noSniff: true,
    // Origin Agent Cluster
    originAgentCluster: true,
    // Permitted Cross Domain Policies
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    // Referrer Policy - Controla informações do referrer
    referrerPolicy: { policy: "no-referrer" },
    // XSS Filter (legacy browsers)
    xssFilter: true,
}));
// ✅ SECURITY: CORS - NUNCA permitir '*' em produção
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [];
if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.error('🚨 ERRO CRÍTICO: FRONTEND_URL não configurado em PRODUÇÃO!');
    process.exit(1);
}
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Permitir requisições sem origin (Postman, mobile apps)
        if (!origin)
            return callback(null, true);
        // Em desenvolvimento, permitir qualquer origin
        if (process.env.NODE_ENV !== 'production') {
            return callback(null, true);
        }
        // Em produção, validar origin na whitelist
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Origin não permitido pelo CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Stripe webhook needs raw body for signature verification
// Must be BEFORE express.json() middleware
app.use('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }));
// Regular JSON parsing for all other routes
app.use((0, cookie_parser_1.default)()); // ✅ SECURITY: Cookie parser (necessário para CSRF)
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite de 100 requisições por IP
});
app.use(limiter);
// Serve static files for local storage
if (process.env.STORAGE_PROVIDER === 'local') {
    const uploadsPath = process.env.LOCAL_STORAGE_PATH || './uploads';
    app.use('/uploads', express_1.default.static(path_1.default.resolve(uploadsPath)));
    console.log(`Serving static files from: ${uploadsPath}`);
}
// Rotas
app.use('/api', routes_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Rota não encontrada
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Erro interno do servidor',
    });
});
// Iniciar servidor
const server = app.listen(PORT, async () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
    // Inicializar Redis (com fallback seguro)
    await (0, redis_1.initRedis)();
    // Iniciar cron jobs
    (0, recurringExpensesCron_1.startRecurringExpensesCron)();
});
// Graceful shutdown
const shutdown = async () => {
    console.log('\nIniciando shutdown gracioso...');
    server.close(async () => {
        console.log('Servidor HTTP fechado');
        await (0, redis_1.disconnectRedis)();
        await (0, database_1.disconnectAll)();
        console.log('Conexões com banco de dados e Redis fechadas');
        process.exit(0);
    });
    // Forçar shutdown após 10 segundos
    setTimeout(() => {
        console.error('Forçando shutdown após timeout');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
exports.default = app;
//# sourceMappingURL=index.js.map