"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyEmailSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.loginSchema = exports.registerSchema = void 0;
const zod_1 = require("zod");
// ✅ SECURITY: Validação de inputs para autenticação
exports.registerSchema = zod_1.z.object({
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
    companyName: zod_1.z
        .string()
        .min(2, 'Nome da empresa deve ter no mínimo 2 caracteres')
        .max(100, 'Nome da empresa muito longo')
        .optional(),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
    password: zod_1.z.string().min(1, 'Senha é obrigatória'),
});
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email('Email inválido'),
});
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().uuid('Token inválido'),
    password: zod_1.z
        .string()
        .min(8, 'Senha deve ter no mínimo 8 caracteres')
        .max(100, 'Senha muito longa')
        .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
        .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
        .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
});
exports.verifyEmailSchema = zod_1.z.object({
    token: zod_1.z.string().uuid('Token inválido'),
});
//# sourceMappingURL=auth.validator.js.map