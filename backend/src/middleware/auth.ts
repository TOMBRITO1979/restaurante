import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '@/types';
import { prisma } from '@/utils/database';

const JWT_SECRET = process.env.JWT_SECRET;

// ✅ SECURITY: Validar JWT_SECRET no startup
if (!JWT_SECRET) {
  console.error('🚨 ERRO CRÍTICO: JWT_SECRET não configurado!');
  console.error('Configure: export JWT_SECRET=$(openssl rand -hex 64)');
  process.exit(1);
}

if (JWT_SECRET.length < 32) {
  console.error('🚨 ERRO: JWT_SECRET muito fraco! Mínimo 32 caracteres.');
  process.exit(1);
}

if (process.env.NODE_ENV === 'production' && (JWT_SECRET === 'your-secret-key' || JWT_SECRET.includes('example'))) {
  console.error('🚨 ERRO: JWT_SECRET inseguro detectado em PRODUÇÃO!');
  process.exit(1);
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { company: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Usuário inválido ou inativo' });
      return;
    }

    if (user.companyId && user.company && !user.company.isActive) {
      res.status(403).json({ error: 'Empresa inativa' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
      permissions: user.permissions as any,
    };

    if (user.company?.schemaName) {
      req.tenantSchema = user.company.schemaName;
    }

    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};

export const requireRole = (...roles: Array<'SUPER_ADMIN' | 'ADMIN' | 'USER'>) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Permissão negada' });
      return;
    }
    next();
  };
};

export const checkPermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Não autenticado' });
      return;
    }

    // Super admin tem todas as permissões
    if (req.user.role === 'SUPER_ADMIN') {
      next();
      return;
    }

    // Admin tem todas as permissões dentro de sua empresa
    if (req.user.role === 'ADMIN') {
      next();
      return;
    }

    // Verificar permissões do usuário
    // Formato esperado: "module.action" (ex: "products.view", "sales.create")
    const permissions = req.user.permissions || {};
    const [module, action] = permission.split('.');

    if (!module || !action) {
      res.status(403).json({ error: 'Formato de permissão inválido' });
      return;
    }

    // Verificar se o módulo existe e se a ação específica está habilitada
    if (!permissions[module] || !permissions[module][action]) {
      res.status(403).json({ error: 'Sem permissão para esta ação' });
      return;
    }

    next();
  };
};
