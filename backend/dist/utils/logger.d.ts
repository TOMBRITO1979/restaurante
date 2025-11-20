import winston from 'winston';
declare const logger: winston.Logger;
export declare const log: {
    error: (message: string, meta?: any) => void;
    warn: (message: string, meta?: any) => void;
    info: (message: string, meta?: any) => void;
    debug: (message: string, meta?: any) => void;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map