"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
// ✅ SECURITY: Validação de inputs para gerenciamento de usuários
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z
        .string()
        .email('Email inválido')
        .min(5, 'Email deve ter no mínimo 5 caracteres')
        .max(100, 'Email muito longo'),
    password: zod_1.z
        .string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .max(100, 'Senha muito longa')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
    name: zod_1.z
        .string()
        .min(2, 'Nome deve ter no mínimo 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços'),
    permissions: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.updateUserSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(2, 'Nome deve ter no mínimo 2 caracteres')
        .max(100, 'Nome muito longo')
        .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Nome deve conter apenas letras e espaços')
        .optional(),
    permissions: zod_1.z.record(zod_1.z.any()).optional(),
    isActive: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=user.validator.js.map