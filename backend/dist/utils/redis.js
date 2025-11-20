"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCacheKey = exports.disconnectRedis = exports.isRedisAvailable = exports.invalidateCache = exports.setCache = exports.getCache = exports.initRedis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
// ✅ CACHE: Configuração do Redis Client com Fallback Seguro
// Se Redis falhar, sistema continua funcionando normalmente
let redis = null;
let redisAvailable = false;
// Configuração do Redis
const REDIS_HOST = process.env.REDIS_HOST || 'chefwell_redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
// Função para inicializar Redis
const initRedis = async () => {
    try {
        redis = new ioredis_1.default({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                // Retry até 3 vezes, depois desiste
                if (times > 3) {
                    console.warn('⚠️  Redis: Máximo de tentativas atingido. Continuando sem cache.');
                    return null; // Desiste
                }
                // Retry com delay exponencial
                const delay = Math.min(times * 100, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: true, // Conecta apenas quando necessário
        });
        // Tentar conectar
        await redis.connect();
        // Eventos
        redis.on('connect', () => {
            console.log('✅ Redis: Conectado com sucesso');
            redisAvailable = true;
        });
        redis.on('error', (err) => {
            console.warn('⚠️  Redis: Erro de conexão:', err.message);
            redisAvailable = false;
        });
        redis.on('close', () => {
            console.warn('⚠️  Redis: Conexão fechada');
            redisAvailable = false;
        });
        redis.on('reconnecting', () => {
            console.log('🔄 Redis: Tentando reconectar...');
        });
        // Testar conexão
        await redis.ping();
        redisAvailable = true;
        console.log('✅ Redis: Cache habilitado e funcionando');
    }
    catch (error) {
        console.warn('⚠️  Redis: Não disponível. Sistema continuará sem cache.');
        console.warn('⚠️  Erro:', error.message);
        redisAvailable = false;
        redis = null;
    }
};
exports.initRedis = initRedis;
// ✅ SEGURANÇA: Função para obter do cache com fallback
const getCache = async (key) => {
    // Se Redis não está disponível, retorna null (usa banco)
    if (!redis || !redisAvailable) {
        return null;
    }
    try {
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    }
    catch (error) {
        console.warn(`⚠️  Redis: Erro ao buscar cache "${key}":`, error.message);
        return null; // Fallback: usa banco
    }
};
exports.getCache = getCache;
// ✅ SEGURANÇA: Função para salvar no cache
const setCache = async (key, value, ttlSeconds = 300 // 5 minutos padrão
) => {
    // Se Redis não está disponível, não faz nada (silenciosamente)
    if (!redis || !redisAvailable) {
        return;
    }
    try {
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
    }
    catch (error) {
        console.warn(`⚠️  Redis: Erro ao salvar cache "${key}":`, error.message);
        // Não lança erro - sistema continua funcionando
    }
};
exports.setCache = setCache;
// ✅ SEGURANÇA: Função para invalidar cache
const invalidateCache = async (pattern) => {
    if (!redis || !redisAvailable) {
        return;
    }
    try {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await redis.del(...keys);
            console.log(`🗑️  Cache: ${keys.length} chave(s) invalidada(s) para "${pattern}"`);
        }
    }
    catch (error) {
        console.warn(`⚠️  Redis: Erro ao invalidar cache "${pattern}":`, error.message);
    }
};
exports.invalidateCache = invalidateCache;
// Função para verificar se Redis está disponível
const isRedisAvailable = () => {
    return redisAvailable;
};
exports.isRedisAvailable = isRedisAvailable;
// Função para desconectar Redis (graceful shutdown)
const disconnectRedis = async () => {
    if (redis) {
        try {
            await redis.quit();
            console.log('✅ Redis: Desconectado');
        }
        catch (error) {
            console.warn('⚠️  Redis: Erro ao desconectar:', error.message);
        }
    }
};
exports.disconnectRedis = disconnectRedis;
// Helper: Gerar chave de cache para tenant
const getCacheKey = (tenant, resource, id) => {
    if (id) {
        return `${tenant}:${resource}:${id}`;
    }
    return `${tenant}:${resource}`;
};
exports.getCacheKey = getCacheKey;
exports.default = {
    initRedis: exports.initRedis,
    getCache: exports.getCache,
    setCache: exports.setCache,
    invalidateCache: exports.invalidateCache,
    isRedisAvailable: exports.isRedisAvailable,
    disconnectRedis: exports.disconnectRedis,
    getCacheKey: exports.getCacheKey,
};
//# sourceMappingURL=redis.js.map