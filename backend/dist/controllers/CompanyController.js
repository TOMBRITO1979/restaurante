"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyController = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const uuid_1 = require("uuid");
const slugify_1 = __importDefault(require("slugify"));
const database_1 = require("../utils/database");
const logger_1 = require("../utils/logger");
class CompanyController {
    /**
     * Generate unique s3Folder name for a company
     * Format: {company-slug}-{4-random-digits}
     */
    async generateUniqueS3Folder(companyName) {
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const slug = (0, slugify_1.default)(companyName, { lower: true, strict: true });
            const randomDigits = Math.floor(1000 + Math.random() * 9000); // 1000-9999
            const s3Folder = `${slug}-${randomDigits}`;
            // Check if this folder already exists
            const existing = await database_1.prisma.company.findFirst({
                where: { s3Folder },
            });
            if (!existing) {
                return s3Folder;
            }
        }
        throw new Error(`Failed to generate unique s3Folder for company: ${companyName}`);
    }
    async list(req, res) {
        try {
            const companies = await database_1.prisma.company.findMany({
                include: {
                    _count: {
                        select: { admins: true },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            res.json(companies);
        }
        catch (error) {
            logger_1.log.error('Erro ao listar empresas', { error });
            res.status(500).json({ error: 'Erro ao listar empresas' });
        }
    }
    async create(req, res) {
        try {
            const { name, slug, plan, adminName, adminEmail, adminPassword } = req.body;
            // Validar campos obrigatórios
            if (!name || !slug) {
                res.status(400).json({ error: 'Nome e slug são obrigatórios' });
                return;
            }
            // Validar dados do admin
            if (!adminName || !adminEmail || !adminPassword) {
                res.status(400).json({ error: 'Dados do administrador são obrigatórios' });
                return;
            }
            // Verificar se já existe empresa com mesmo slug
            const existingCompany = await database_1.prisma.company.findFirst({
                where: { slug },
            });
            if (existingCompany) {
                res.status(400).json({ error: 'Já existe uma empresa com este slug' });
                return;
            }
            // Verificar se já existe usuário com o email
            const existingUser = await database_1.prisma.user.findFirst({
                where: { email: adminEmail },
            });
            if (existingUser) {
                res.status(400).json({ error: 'Já existe um usuário com este email' });
                return;
            }
            const schemaName = `tenant_${(0, uuid_1.v4)().replace(/-/g, '')}`;
            // Generate unique s3Folder
            const s3Folder = await this.generateUniqueS3Folder(name);
            // Criar empresa
            const company = await database_1.prisma.company.create({
                data: {
                    name,
                    slug,
                    plan: plan || 'FREE',
                    schemaName,
                    s3Folder,
                    isActive: true,
                },
            });
            // Criar schema do tenant
            await (0, database_1.createTenantSchema)(schemaName);
            // Hash da senha
            const hashedPassword = await bcryptjs_1.default.hash(adminPassword, 12);
            // Criar usuário admin
            const admin = await database_1.prisma.user.create({
                data: {
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN',
                    companyId: company.id,
                    isActive: true,
                },
            });
            res.status(201).json({
                company,
                admin: {
                    id: admin.id,
                    name: admin.name,
                    email: admin.email,
                    role: admin.role,
                },
            });
        }
        catch (error) {
            logger_1.log.error('Erro ao criar empresa', { error });
            res.status(500).json({ error: 'Erro ao criar empresa' });
        }
    }
    async update(req, res) {
        try {
            const { id } = req.params;
            const { name, slug, plan, isActive } = req.body;
            const updateData = {};
            if (name !== undefined)
                updateData.name = name;
            if (slug !== undefined)
                updateData.slug = slug;
            if (plan !== undefined)
                updateData.plan = plan;
            if (isActive !== undefined)
                updateData.isActive = isActive;
            const company = await database_1.prisma.company.update({
                where: { id },
                data: updateData,
            });
            res.json(company);
        }
        catch (error) {
            logger_1.log.error('Erro ao atualizar empresa', { error });
            res.status(500).json({ error: 'Erro ao atualizar empresa' });
        }
    }
    async delete(req, res) {
        try {
            const { id } = req.params;
            const company = await database_1.prisma.company.findUnique({ where: { id } });
            if (!company) {
                res.status(404).json({ error: 'Empresa não encontrada' });
                return;
            }
            // Deletar schema do tenant
            await (0, database_1.deleteTenantSchema)(company.schemaName);
            // Deletar empresa (cascade vai deletar usuários)
            await database_1.prisma.company.delete({ where: { id } });
            res.json({ message: 'Empresa deletada com sucesso' });
        }
        catch (error) {
            logger_1.log.error('Erro ao deletar empresa', { error });
            res.status(500).json({ error: 'Erro ao deletar empresa' });
        }
    }
    async toggleActive(req, res) {
        try {
            const { id } = req.params;
            const company = await database_1.prisma.company.findUnique({ where: { id } });
            if (!company) {
                res.status(404).json({ error: 'Empresa não encontrada' });
                return;
            }
            const updated = await database_1.prisma.company.update({
                where: { id },
                data: { isActive: !company.isActive },
            });
            res.json(updated);
        }
        catch (error) {
            logger_1.log.error('Erro ao alterar status da empresa', { error });
            res.status(500).json({ error: 'Erro ao alterar status da empresa' });
        }
    }
}
exports.CompanyController = CompanyController;
//# sourceMappingURL=CompanyController.js.map