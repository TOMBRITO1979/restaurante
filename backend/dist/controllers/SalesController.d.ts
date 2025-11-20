import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class SalesController {
    list(req: AuthRequest, res: Response): Promise<void>;
    getById(req: AuthRequest, res: Response): Promise<void>;
    getStats(req: AuthRequest, res: Response): Promise<void>;
    exportPDF(req: AuthRequest, res: Response): Promise<void>;
    exportCSV(req: AuthRequest, res: Response): Promise<void>;
    printReceipt(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=SalesController.d.ts.map