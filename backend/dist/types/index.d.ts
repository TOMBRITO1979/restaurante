import { Request } from 'express';
export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: 'SUPER_ADMIN' | 'ADMIN' | 'USER';
        companyId?: string;
        permissions?: any;
    };
    tenantSchema?: string;
}
export interface Product {
    id: string;
    name: string;
    displayName: string;
    categoryId: string;
    description?: string;
    price: number;
    imageUrl?: string;
    isAvailable: boolean;
    sku?: string;
    prepTime?: number;
    cost?: number;
    stock?: number;
    tags: string[];
    hasPromotion: boolean;
    promotionDiscount?: number;
    nutritionalInfo?: string;
    allergens?: string;
    priority: number;
    availableSchedule?: {
        start: string;
        end: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export interface Category {
    id: string;
    name: string;
    description?: string;
    priority: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProductVariation {
    id: string;
    productId: string;
    name: string;
    value: string;
    priceAdjust: number;
}
export interface ProductAddition {
    id: string;
    productId: string;
    name: string;
    price: number;
}
//# sourceMappingURL=index.d.ts.map