import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class ExpensesController {
    list(req: AuthRequest, res: Response): Promise<void>;
    getById(req: AuthRequest, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
    getStats(req: AuthRequest, res: Response): Promise<void>;
    exportPDF(req: AuthRequest, res: Response): Promise<void>;
    exportCSV(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=ExpensesController.d.ts.map