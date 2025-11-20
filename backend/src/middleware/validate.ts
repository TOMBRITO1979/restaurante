import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { log } from '@/utils/logger';

// ✅ SECURITY: Middleware de validação com Zod

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Valida o body da requisição
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        log.warn('Validação de input falhou', {
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

      log.error('Erro na validação', { error });
      res.status(500).json({ error: 'Erro ao validar dados' });
    }
  };
};
