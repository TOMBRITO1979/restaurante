"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = exports.requireRole = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../utils/database");
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
const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            res.status(401).json({ error: 'Token não fornecido' });
            return;
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        const user = await database_1.prisma.user.findUnique({
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
            permissions: user.permissions,
        };
        if (user.company?.schemaName) {
            req.tenantSchema = user.company.schemaName;
        }
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Token inválido' });
    }
};
exports.authenticate = authenticate;
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Permissão negada' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
const checkPermission = (permission) => {
    return (req, res, next) => {
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
exports.checkPermission = checkPermission;
//# sourceMappingURL=auth.js.map