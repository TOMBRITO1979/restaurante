export declare const initRedis: () => Promise<void>;
export declare const getCache: <T>(key: string) => Promise<T | null>;
export declare const setCache: (key: string, value: any, ttlSeconds?: number) => Promise<void>;
export declare const invalidateCache: (pattern: string) => Promise<void>;
export declare const isRedisAvailable: () => boolean;
export declare const disconnectRedis: () => Promise<void>;
export declare const getCacheKey: (tenant: string, resource: string, id?: string) => string;
declare const _default: {
    initRedis: () => Promise<void>;
    getCache: <T>(key: string) => Promise<T | null>;
    setCache: (key: string, value: any, ttlSeconds?: number) => Promise<void>;
    invalidateCache: (pattern: string) => Promise<void>;
    isRedisAvailable: () => boolean;
    disconnectRedis: () => Promise<void>;
    getCacheKey: (tenant: string, resource: string, id?: string) => string;
};
export default _default;
//# sourceMappingURL=redis.d.ts.map