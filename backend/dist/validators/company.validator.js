"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateCompanySchema = exports.createCompanySchema = void 0;
const zod_1 = require("zod");
// ✅ SECURITY: Validação de inputs para gerenciamento de empresas
exports.createCompanySchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, 'Nome deve ter no mínimo 2 caracteres')
        .max(100, 'Nome muito longo'),
    slug: zod_1.z
        .string()
        .min(2, 'Slug deve ter no mínimo 2 caracteres')
        .max(50, 'Slug muito longo')
        .regex(/^[a-z0-9-_]+$/, 'Slug deve conter apenas letras minúsculas, números, hífens e underscores'),
    plan: zod_1.z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
    adminName: zod_1.z
        .string()
        .min(2, 'Nome do administrador deve ter no mínimo 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
    adminEmail: zod_1.z
        .string()
        .email('Email inválido')
        .min(5, 'Email deve ter no mínimo 5 caracteres')
        .max(100, 'Email muito longo'),
    adminPassword: zod_1.z
        .string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .max(100, 'Senha muito longa')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
});
exports.updateCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    slug: zod_1.z
        .string()
        .min(2)
        .max(50)
        .regex(/^[a-z0-9-_]+$/, 'Slug deve conter apenas letras minúsculas, números, hífens e underscores')
        .optional(),
    plan: zod_1.z.enum(['FREE', 'BASIC', 'PREMIUM', 'ENTERPRISE']).optional(),
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=company.validator.js.map