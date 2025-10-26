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
      const { name, email, phone, address, plan, maxUsers, adminName, adminEmail, adminPassword } = req.body;

      const existingCompany = await prisma.company.findFirst({
        where: {
          OR: [{ email }, { slug: name.toLowerCase().replace(/\s+/g, '-') }],
        },
      });

      if (existingCompany) {
        res.status(400).json({ error: 'Empresa ou email já cadastrado' });
        return;
      }

      const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
      if (existingAdmin) {
        res.status(400).json({ error: 'Email do administrador já cadastrado' });
        return;
      }

      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const schemaName = `tenant_${uuidv4().replace(/-/g, '')}`;

      // Criar empresa
      const company = await prisma.company.create({
        data: {
          name,
          slug,
          email,
          phone,
          address,
          plan: plan || 'basic',
          maxUsers: maxUsers || 5,
          schemaName,
        },
      });

      // Criar schema do tenant
      await createTenantSchema(schemaName);

      // Criar admin da empresa
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const admin = await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: adminName,
          role: 'ADMIN',
          companyId: company.id,
        },
      });

      res.status(201).json({
        company,
        admin: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
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
      const { name, email, phone, address, plan, maxUsers, isActive } = req.body;

      const company = await prisma.company.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          address,
          plan,
          maxUsers,
          isActive,
        },
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
