import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class UserController {
    list(req: AuthRequest, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
    activate(req: AuthRequest, res: Response): Promise<void>;
    suspend(req: AuthRequest, res: Response): Promise<void>;
    toggleActive(req: AuthRequest, res: Response): Promise<void>;
    listAll(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map