import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '@/types';
import { prisma, createTenantSchema, deleteTenantSchema } from '@/utils/database';

export class CompanyController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companies = await prisma.company.findMany({
        include: {
          _count: {
            select: { admins: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(companies);
    } catch (error) {
      console.error('Erro ao listar empresas:', error);
      res.status(500).json({ error: 'Erro ao listar empresas' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
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
      const existingCompany = await prisma.company.findFirst({
        where: { slug },
      });

      if (existingCompany) {
        res.status(400).json({ error: 'Já existe uma empresa com este slug' });
        return;
      }

      // Verificar se já existe usuário com o email
      const existingUser = await prisma.user.findFirst({
        where: { email: adminEmail },
      });

      if (existingUser) {
        res.status(400).json({ error: 'Já existe um usuário com este email' });
        return;
      }

      const schemaName = `tenant_${uuidv4().replace(/-/g, '')}`;

      // Criar empresa
      const company = await prisma.company.create({
        data: {
          name,
          slug,
          plan: plan || 'FREE',
          schemaName,
          isActive: true,
        },
      });

      // Criar schema do tenant
      await createTenantSchema(schemaName);

      // Hash da senha
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Criar usuário admin
      const admin = await prisma.user.create({
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
    } catch (error) {
      console.error('Erro ao criar empresa:', error);
      res.status(500).json({ error: 'Erro ao criar empresa' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, slug, plan, isActive } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name;
      if (slug !== undefined) updateData.slug = slug;
      if (plan !== undefined) updateData.plan = plan;
      if (isActive !== undefined) updateData.isActive = isActive;

      const company = await prisma.company.update({
        where: { id },
        data: updateData,
      });

      res.json(company);
    } catch (error) {
      console.error('Erro ao atualizar empresa:', error);
      res.status(500).json({ error: 'Erro ao atualizar empresa' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) {
        res.status(404).json({ error: 'Empresa não encontrada' });
        return;
      }

      // Deletar schema do tenant
      await deleteTenantSchema(company.schemaName);

      // Deletar empresa (cascade vai deletar usuários)
      await prisma.company.delete({ where: { id } });

      res.json({ message: 'Empresa deletada com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar empresa:', error);
      res.status(500).json({ error: 'Erro ao deletar empresa' });
    }
  }

  async toggleActive(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const company = await prisma.company.findUnique({ where: { id } });
      if (!company) {
        res.status(404).json({ error: 'Empresa não encontrada' });
        return;
      }

      const updated = await prisma.company.update({
        where: { id },
        data: { isActive: !company.isActive },
      });

      res.json(updated);
    } catch (error) {
      console.error('Erro ao alterar status da empresa:', error);
      res.status(500).json({ error: 'Erro ao alterar status da empresa' });
    }
  }
}
