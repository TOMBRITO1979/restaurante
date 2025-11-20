import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { prisma, createTenantSchema } from '@/utils/database';
import { sendPasswordResetEmail, sendEmailVerification } from '@/utils/email';
import { AuthRequest } from '@/types';
import { log } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, companyName } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'Email já cadastrado' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const emailVerificationToken = uuidv4();
      const emailVerificationExpiry = new Date(Date.now() + 24 * 3600000); // 24 horas

      // Criar empresa automaticamente para o novo usuário
      const companySlug = (companyName || name)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^a-z0-9\s-]/g, '') // Remove caracteres especiais
        .trim()
        .replace(/\s+/g, '_') // Substitui espaços por underscores
        + '_' + Date.now(); // Adiciona timestamp para garantir unicidade

      const schemaName = `tenant_${companySlug}`;

      // Criar empresa no banco
      const company = await prisma.company.create({
        data: {
          id: uuidv4(),
          name: companyName || `Empresa de ${name}`,
          slug: companySlug,
          schemaName: schemaName,
          isActive: true,
        },
      });

      // Criar schema do tenant
      await createTenantSchema(schemaName);

      // Criar usuário associado à empresa
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'ADMIN', // ✅ Novo usuário sempre é ADMIN da sua empresa
          companyId: company.id,
          emailVerified: false,
          emailVerificationToken,
          emailVerificationExpiry,
        },
      });

      // Enviar email de confirmação
      await sendEmailVerification(user.email, user.name, emailVerificationToken);

      res.status(201).json({
        message: 'Cadastro realizado com sucesso! Verifique seu email para confirmar sua conta.',
        email: user.email,
      });
    } catch (error) {
      log.error('Erro no registro', { error });
      res.status(500).json({ error: 'Erro ao criar usuário' });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await prisma.user.findUnique({
        where: { email },
        include: { company: true },
      });

      if (!user) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      if (!user.emailVerified) {
        res.status(403).json({ error: 'Email não verificado. Por favor, confirme seu email antes de fazer login.' });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({ error: 'Usuário inativo' });
        return;
      }

      if (user.companyId && user.company && !user.company.isActive) {
        res.status(403).json({ error: 'Empresa inativa' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
      } as jwt.SignOptions);

      // ✅ SECURITY: Gerar e setar CSRF token
      const csrfToken = crypto.randomBytes(32).toString('hex');
      res.cookie('XSRF-TOKEN', csrfToken, {
        httpOnly: false, // Frontend precisa ler
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000 * 24, // 24 horas
      });

      res.json({
        token,
        csrfToken, // Enviar no body também
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          permissions: user.permissions,
        },
      });
    } catch (error) {
      log.error('Erro no login', { error });
      res.status(500).json({ error: 'Erro ao fazer login' });
    }
  }

  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        res.json({ message: 'Se o email existir, um link de recuperação será enviado' });
        return;
      }

      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hora

      await prisma.user.update({
        where: { id: user.id },
        data: { resetToken, resetTokenExpiry },
      });

      await sendPasswordResetEmail(user.email, resetToken);

      res.json({ message: 'Se o email existir, um link de recuperação será enviado' });
    } catch (error) {
      log.error('Erro ao solicitar recuperação de senha', { error });
      res.status(500).json({ error: 'Erro ao processar solicitação' });
    }
  }

  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;

      const user = await prisma.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: { gte: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ error: 'Token inválido ou expirado' });
        return;
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      res.json({ message: 'Senha redefinida com sucesso' });
    } catch (error) {
      log.error('Erro ao redefinir senha', { error });
      res.status(500).json({ error: 'Erro ao redefinir senha' });
    }
  }

  async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          companyId: true,
          permissions: true,
          isActive: true,
          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              isActive: true,
            },
          },
        },
      });

      res.json(user);
    } catch (error) {
      log.error('Erro ao buscar dados do usuário', { error });
      res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }
  }

  async verifyEmail(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.body;

      if (!token) {
        res.status(400).json({ error: 'Token não fornecido' });
        return;
      }

      const user = await prisma.user.findFirst({
        where: {
          emailVerificationToken: token,
          emailVerificationExpiry: { gte: new Date() },
        },
      });

      if (!user) {
        res.status(400).json({ error: 'Token inválido ou expirado' });
        return;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationExpiry: null,
        },
      });

      res.json({
        message: 'Email confirmado com sucesso! Agora você pode fazer login.',
        email: user.email
      });
    } catch (error) {
      log.error('Erro ao verificar email', { error });
      res.status(500).json({ error: 'Erro ao verificar email' });
    }
  }
}
