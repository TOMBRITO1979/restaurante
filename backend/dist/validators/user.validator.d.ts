import { z } from 'zod';
export declare const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    password: string;
    email: string;
    permissions?: Record<string, any> | undefined;
}, {
    name: string;
    password: string;
    email: string;
    permissions?: Record<string, any> | undefined;
}>;
export declare const updateUserSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    permissions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    permissions?: Record<string, any> | undefined;
}, {
    name?: string | undefined;
    isActive?: boolean | undefined;
    permissions?: Record<string, any> | undefined;
}>;
//# sourceMappingURL=user.validator.d.ts.map