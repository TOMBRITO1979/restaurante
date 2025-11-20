import { Response } from 'express';
import { AuthRequest } from '../types';
export declare class CompanyController {
    /**
     * Generate unique s3Folder name for a company
     * Format: {company-slug}-{4-random-digits}
     */
    private generateUniqueS3Folder;
    list(req: AuthRequest, res: Response): Promise<void>;
    create(req: AuthRequest, res: Response): Promise<void>;
    update(req: AuthRequest, res: Response): Promise<void>;
    delete(req: AuthRequest, res: Response): Promise<void>;
    toggleActive(req: AuthRequest, res: Response): Promise<void>;
}
//# sourceMappingURL=CompanyController.d.ts.map