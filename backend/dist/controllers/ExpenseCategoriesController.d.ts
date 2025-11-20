import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class ExpenseCategoriesController {
    list(req: AuthRequest, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=ExpenseCategoriesController.d.ts.map