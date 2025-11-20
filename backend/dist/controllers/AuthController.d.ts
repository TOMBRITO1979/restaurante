import { Request, Response } from 'express';
import { AuthRequest } from '../types';
export declare class AuthController {
    register(req: Request, res: Response): Promise<void>;
    login(req: Request, res: Response): Promise<void>;
    forgotPassword(req: Request, res: Response): Promise<void>;
    resetPassword(req: Request, res: Response): Promise<void>;
    me(req: AuthRequest, res: Response): Promise<void>;
    verifyEmail(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AuthController.d.ts.map