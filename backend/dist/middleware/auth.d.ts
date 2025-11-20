import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
export declare const authenticate: (req: AuthRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (...roles: Array<"SUPER_ADMIN" | "ADMIN" | "USER">) => (req: AuthRequest, res: Response, next: NextFunction) => void;
export declare const checkPermission: (permission: string) => (req: AuthRequest, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.d.ts.map