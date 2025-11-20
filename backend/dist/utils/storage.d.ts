/**
 * Storage Abstraction Layer
 * Supports multiple storage providers: AWS S3, MinIO, and Local Storage
 */
export type StorageProvider = 'local' | 'minio' | 's3';
/**
 * Upload file using configured storage provider
 * @param file - The file to upload
 * @param folder - The folder type (products, categories, etc.)
 * @param tenantSchema - Optional tenant schema for multi-tenant S3 paths
 */
export declare const uploadFile: (file: Express.Multer.File, folder?: string, tenantSchema?: string) => Promise<string>;
/**
 * Delete file using configured storage provider
 */
export declare const deleteFile: (fileUrl: string) => Promise<void>;
/**
 * Get current storage provider info
 */
export declare const getStorageInfo: () => {
    provider: StorageProvider;
    config: {
        local: {
            path: string;
            baseUrl: string;
        } | null;
        s3: {
            region: string;
            bucket: string;
        } | null;
        minio: {
            endpoint: string | undefined;
            bucket: string;
            region: string;
        } | null;
    };
};
//# sourceMappingURL=storage.d.ts.map