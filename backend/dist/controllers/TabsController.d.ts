import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class TabsController {
    listOpen(req: AuthRequest, res: Response): Promise<void>;
    findOrCreate(req: AuthRequest, res: Response): Promise<void>;
    addOrder(req: AuthRequest, res: Response): Promise<void>;
    markOrderDelivered(req: AuthRequest, res: Response): Promise<void>;
    closeTab(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=TabsController.d.ts.map