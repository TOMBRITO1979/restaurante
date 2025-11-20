import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class CategoryController {
    list(req: AuthRequest, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=CategoryController.d.ts.map