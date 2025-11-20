import { z } from 'zod';
export declare const createCompanySchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    plan: z.ZodOptional<z.ZodEnum<["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]>>;
    adminName: z.ZodString;
    adminEmail: z.ZodString;
    adminPassword: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    plan?: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | undefined;
}, {
    name: string;
    slug: string;
    adminName: string;
    adminEmail: string;
    adminPassword: string;
    plan?: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | undefined;
}>;
export declare const updateCompanySchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    slug: z.ZodOptional<z.ZodString>;
    plan: z.ZodOptional<z.ZodEnum<["FREE", "BASIC", "PREMIUM", "ENTERPRISE"]>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    slug?: string | undefined;
    plan?: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    slug?: string | undefined;
    plan?: "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | undefined;
}>;
//# sourceMappingURL=company.validator.d.ts.map