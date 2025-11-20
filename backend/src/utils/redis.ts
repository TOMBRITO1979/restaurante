import Redis from 'ioredis';

// ✅ CACHE: Configuração do Redis Client com Fallback Seguro
// Se Redis falhar, sistema continua funcionando normalmente

let redis: Redis | null = null;
let redisAvailable = false;

// Configuração do Redis
const REDIS_HOST = process.env.REDIS_HOST || 'chefwell_redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Função para inicializar Redis
export const initRedis = async (): Promise<void> => {
  try {
    redis = new Redis({
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

  } catch (error: any) {
    console.warn('⚠️  Redis: Não disponível. Sistema continuará sem cache.');
    console.warn('⚠️  Erro:', error.message);
    redisAvailable = false;
    redis = null;
  }
};

// ✅ SEGURANÇA: Função para obter do cache com fallback
export const getCache = async <T>(key: string): Promise<T | null> => {
  // Se Redis não está disponível, retorna null (usa banco)
  if (!redis || !redisAvailable) {
    return null;
  }

  try {
    const cached = await redis.get(key);
    if (cached) {
      return JSON.parse(cached) as T;
    }
    return null;
  } catch (error: any) {
    console.warn(`⚠️  Redis: Erro ao buscar cache "${key}":`, error.message);
    return null; // Fallback: usa banco
  }
};

// ✅ SEGURANÇA: Função para salvar no cache
export const setCache = async (
  key: string,
  value: any,
  ttlSeconds: number = 300 // 5 minutos padrão
): Promise<void> => {
  // Se Redis não está disponível, não faz nada (silenciosamente)
  if (!redis || !redisAvailable) {
    return;
  }

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  } catch (error: any) {
    console.warn(`⚠️  Redis: Erro ao salvar cache "${key}":`, error.message);
    // Não lança erro - sistema continua funcionando
  }
};

// ✅ SEGURANÇA: Função para invalidar cache
export const invalidateCache = async (pattern: string): Promise<void> => {
  if (!redis || !redisAvailable) {
    return;
  }

  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`🗑️  Cache: ${keys.length} chave(s) invalidada(s) para "${pattern}"`);
    }
  } catch (error: any) {
    console.warn(`⚠️  Redis: Erro ao invalidar cache "${pattern}":`, error.message);
  }
};

// Função para verificar se Redis está disponível
export const isRedisAvailable = (): boolean => {
  return redisAvailable;
};

// Função para desconectar Redis (graceful shutdown)
export const disconnectRedis = async (): Promise<void> => {
  if (redis) {
    try {
      await redis.quit();
      console.log('✅ Redis: Desconectado');
    } catch (error: any) {
      console.warn('⚠️  Redis: Erro ao desconectar:', error.message);
    }
  }
};

// Helper: Gerar chave de cache para tenant
export const getCacheKey = (tenant: string, resource: string, id?: string): string => {
  if (id) {
    return `${tenant}:${resource}:${id}`;
  }
  return `${tenant}:${resource}`;
};

export default {
  initRedis,
  getCache,
  setCache,
  invalidateCache,
  isRedisAvailable,
  disconnectRedis,
  getCacheKey,
};
