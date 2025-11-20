"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const zod_1 = require("zod");
const logger_1 = require("../utils/logger");
// ✅ SECURITY: Middleware de validação com Zod
const validate = (schema) => {
    return (req, res, next) => {
        try {
            // Valida o body da requisição
            schema.parse(req.body);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errors = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                logger_1.log.warn('Validação de input falhou', {
                    path: req.path,
                    errors,
                    ip: req.ip,
                });
                res.status(400).json({
                    error: 'Dados inválidos',
                    details: errors,
                });
                return;
            }
            logger_1.log.error('Erro na validação', { error });
            res.status(500).json({ error: 'Erro ao validar dados' });
        }
    };
};
exports.validate = validate;
//# sourceMappingURL=validate.js.map