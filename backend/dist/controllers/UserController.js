"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../utils/database");
const email_1 = require("../utils/email");
const logger_1 = require("../utils/logger");
const pagination_1 = require("../utils/pagination");
class UserController {
    async list(req, res) {
        try {
            const companyId = req.user.role === 'SUPER_ADMIN' ? req.query.companyId : req.user.companyId;
            if (!companyId) {
                res.status(400).json({ error: 'ID da empresa é obrigatório' });
                return;
            }
            // ✅ SECURITY & PERFORMANCE: Paginação
            const { page, limit } = (0, pagination_1.parsePaginationParams)(req.query, {
                defaultLimit: 20,
                maxLimit: 100
            });
            const skip = (page - 1) * limit;
            // Buscar usuários com paginação
            const [users, total] = await Promise.all([
                database_1.prisma.user.findMany({
                    where: { companyId },
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                        isActive: true,
                        permissions: true,
                        createdAt: true,
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take: limit,
                }),
                database_1.prisma.user.count({
                    where: { companyId },
                }),
            ]);
            res.json({
                data: users,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page < Math.ceil(total / limit),
                    hasPrev: page > 1,
                },
            });
        }
        catch (error) {
            logger_1.log.error('Erro ao listar usuários', { error });
            res.status(500).json({ error: 'Erro ao listar usuários' });
        }
    }
    async create(req, res) {
        try {
            const { email, password, name, permissions } = req.body;
            const companyId = req.user.companyId;
            if (!companyId) {
                res.status(400).json({ error: 'Admin deve estar associado a uma empresa' });
                return;
            }
            // Verificar limite de usuários
            const company = await database_1.prisma.company.findUnique({
                where: { id: companyId },
                include: { _count: { select: { admins: true } } },
            });
            if (!company) {
                res.status(404).json({ error: 'Empresa não encontrada' });
                return;
            }
            if (company._count.admins >= company.maxUsers) {
                res.status(400).json({ error: 'Limite de usuários atingido para esta empresa' });
                return;
            }
            const existingUser = await database_1.prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                res.status(400).json({ error: 'Email já cadastrado' });
                return;
            }
            const hashedPassword = await bcryptjs_1.default.hash(password, 12);
            const user = await database_1.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name,
                    role: 'USER',
                    companyId,
                    permissions: permissions || {},
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                },
            });
            // Enviar email de boas-vindas
            try {
                await (0, email_1.sendWelcomeEmail)(user.email, user.name);
            }
            catch (emailError) {
                logger_1.log.warn('Erro ao enviar email de boas-vindas', { error: emailError, email: user.email });
            }
            res.status(201).json(user);
        }
        catch (error) {
            logger_1.log.error('Erro ao criar usuário', { error });
            res.status(500).json({ error: 'Erro ao criar usuário' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, permissions, isActive } = req.body;
            const companyId = req.user.companyId;
            // Verificar se o usuário pertence à mesma empresa
            const existingUser = await database_1.prisma.user.findUnique({ where: { id } });
            if (!existingUser || existingUser.companyId !== companyId) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            const user = await database_1.prisma.user.update({
                where: { id },
                data: { name, permissions, isActive },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                },
            });
            res.json(user);
        }
        catch (error) {
            logger_1.log.error('Erro ao atualizar usuário', { error });
            res.status(500).json({ error: 'Erro ao atualizar usuário' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            // SUPER_ADMIN pode deletar qualquer usuário
            // ADMIN pode deletar apenas usuários da própria empresa (exceto outros ADMINs)
            let existingUser;
            if (req.user.role === 'SUPER_ADMIN') {
                existingUser = await database_1.prisma.user.findUnique({ where: { id } });
            }
            else {
                const companyId = req.user.companyId;
                existingUser = await database_1.prisma.user.findFirst({
                    where: { id, companyId },
                });
            }
            if (!existingUser) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            // Impedir que SUPER_ADMIN delete outros SUPER_ADMINs
            if (existingUser.role === 'SUPER_ADMIN' && req.user.id !== existingUser.id) {
                res.status(403).json({ error: 'Não é possível deletar outro Super Admin' });
                return;
            }
            // ADMIN não pode deletar outros ADMINs
            if (existingUser.role === 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
                res.status(403).json({ error: 'Não é possível deletar um administrador' });
                return;
            }
            // Impedir auto-deleção
            if (existingUser.id === req.user.id) {
                res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
                return;
            }
            await database_1.prisma.user.delete({ where: { id } });
            res.json({ message: 'Usuário deletado com sucesso' });
        }
        catch (error) {
            logger_1.log.error('Erro ao deletar usuário', { error });
            res.status(500).json({ error: 'Erro ao deletar usuário' });
        }
    }
    async activate(req, res) {
        try {
            const { id } = req.params;
            // SUPER_ADMIN pode ativar qualquer usuário
            // ADMIN pode ativar apenas usuários da própria empresa
            let existingUser;
            if (req.user.role === 'SUPER_ADMIN') {
                existingUser = await database_1.prisma.user.findUnique({ where: { id } });
            }
            else {
                const companyId = req.user.companyId;
                existingUser = await database_1.prisma.user.findFirst({
                    where: { id, companyId },
                });
            }
            if (!existingUser) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            if (existingUser.isActive) {
                res.status(400).json({ error: 'Usuário já está ativo' });
                return;
            }
            const updated = await database_1.prisma.user.update({
                where: { id },
                data: { isActive: true },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                    companyId: true,
                },
            });
            res.json(updated);
        }
        catch (error) {
            logger_1.log.error('Erro ao ativar usuário', { error });
            res.status(500).json({ error: 'Erro ao ativar usuário' });
        }
    }
    async suspend(req, res) {
        try {
            const { id } = req.params;
            // SUPER_ADMIN pode suspender qualquer usuário
            // ADMIN pode suspender apenas usuários da própria empresa
            let existingUser;
            if (req.user.role === 'SUPER_ADMIN') {
                existingUser = await database_1.prisma.user.findUnique({ where: { id } });
            }
            else {
                const companyId = req.user.companyId;
                existingUser = await database_1.prisma.user.findFirst({
                    where: { id, companyId },
                });
            }
            if (!existingUser) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            if (!existingUser.isActive) {
                res.status(400).json({ error: 'Usuário já está suspenso' });
                return;
            }
            // Impedir que SUPER_ADMIN suspenda outros SUPER_ADMINs (exceto a si mesmo)
            if (existingUser.role === 'SUPER_ADMIN' && req.user.id !== existingUser.id) {
                res.status(403).json({ error: 'Não é possível suspender outro Super Admin' });
                return;
            }
            // Impedir auto-suspensão
            if (existingUser.id === req.user.id) {
                res.status(400).json({ error: 'Você não pode suspender sua própria conta' });
                return;
            }
            const updated = await database_1.prisma.user.update({
                where: { id },
                data: { isActive: false },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                    companyId: true,
                },
            });
            res.json(updated);
        }
        catch (error) {
            logger_1.log.error('Erro ao suspender usuário', { error });
            res.status(500).json({ error: 'Erro ao suspender usuário' });
        }
    }
    async toggleActive(req, res) {
        try {
            const { id } = req.params;
            // SUPER_ADMIN pode ativar/desativar qualquer usuário
            // ADMIN pode ativar/desativar apenas usuários da própria empresa
            let existingUser;
            if (req.user.role === 'SUPER_ADMIN') {
                existingUser = await database_1.prisma.user.findUnique({ where: { id } });
            }
            else {
                const companyId = req.user.companyId;
                existingUser = await database_1.prisma.user.findFirst({
                    where: { id, companyId },
                });
            }
            if (!existingUser) {
                res.status(404).json({ error: 'Usuário não encontrado' });
                return;
            }
            if (existingUser.role === 'SUPER_ADMIN' && req.user.role !== 'SUPER_ADMIN') {
                res.status(403).json({ error: 'Sem permissão para alterar super admins' });
                return;
            }
            const updated = await database_1.prisma.user.update({
                where: { id },
                data: { isActive: !existingUser.isActive },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                    companyId: true,
                },
            });
            res.json(updated);
        }
        catch (error) {
            logger_1.log.error('Erro ao alterar status do usuário', { error });
            res.status(500).json({ error: 'Erro ao alterar status do usuário' });
        }
    }
    async listAll(req, res) {
        try {
            // Apenas SUPER_ADMIN pode listar todos os usuários
            const users = await database_1.prisma.user.findMany({
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isActive: true,
                    permissions: true,
                    companyId: true,
                    createdAt: true,
                    company: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(users);
        }
        catch (error) {
            logger_1.log.error('Erro ao listar todos os usuários', { error });
            res.status(500).json({ error: 'Erro ao listar todos os usuários' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map