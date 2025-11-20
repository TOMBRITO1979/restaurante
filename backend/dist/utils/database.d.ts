import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function validateSchemaName(schemaName: string): void;
export declare const getTenantClient: (schemaName: string) => PrismaClient;
export declare const createTenantSchema: (schemaName: string) => Promise<void>;
export declare const deleteTenantSchema: (schemaName: string) => Promise<void>;
export declare const disconnectAll: () => Promise<void>;
//# sourceMappingURL=database.d.ts.map