import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '@/types';
import { prisma } from '@/utils/database';
import { sendWelcomeEmail } from '@/utils/email';

export class UserController {
  async list(req: AuthRequest, res: Response): Promise<void> {
    try {
      const companyId = req.user!.role === 'SUPER_ADMIN' ? req.query.companyId as string : req.user!.companyId;

      if (!companyId) {
        res.status(400).json({ error: 'ID da empresa é obrigatório' });
        return;
      }

      const users = await prisma.user.findMany({
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
      });

      res.json(users);
    } catch (error) {
      console.error('Erro ao listar usuários:', error);
      res.status(500).json({ error: 'Erro ao listar usuários' });
    }
  }

  async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, password, name, permissions } = req.body;
      const companyId = req.user!.companyId;

      if (!companyId) {
        res.status(400).json({ error: 'Admin deve estar associado a uma empresa' });
        return;
      }

      // Verificar limite de usuários
      const company = await prisma.company.findUnique({
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

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'Email já cadastrado' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
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
        await sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }

      res.status(201).json(user);
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  async update(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, permissions, isActive } = req.body;
      const companyId = req.user!.companyId;

      // Verificar se o usuário pertence à mesma empresa
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.companyId !== companyId) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      const user = await prisma.user.update({
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
    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      res.status(500).json({ error: 'Erro ao atualizar usuário' });
    }
  }

  async delete(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const companyId = req.user!.companyId;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser || existingUser.companyId !== companyId) {
        res.status(404).json({ error: 'Usuário não encontrado' });
        return;
      }

      if (existingUser.role === 'ADMIN') {
        res.status(400).json({ error: 'Não é possível deletar um administrador' });
        return;
      }

      await prisma.user.delete({ where: { id } });

      res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      res.status(500).json({ error: 'Erro ao deletar usuário' });
    }
  }
}
