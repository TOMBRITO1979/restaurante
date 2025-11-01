/**
 * Storage Abstraction Layer
 * Supports multiple storage providers: AWS S3, MinIO, and Local Storage
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

// Storage provider type
export type StorageProvider = 'local' | 'minio' | 's3';

// Get storage provider from environment
const STORAGE_PROVIDER: StorageProvider =
  (process.env.STORAGE_PROVIDER as StorageProvider) || 'local';

// Local storage configuration
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || './uploads';
const LOCAL_STORAGE_BASE_URL = process.env.LOCAL_STORAGE_BASE_URL || 'http://localhost:3000/uploads';

// S3/MinIO configuration
const S3_ENDPOINT = process.env.S3_ENDPOINT; // For MinIO
const S3_REGION = process.env.AWS_REGION || process.env.S3_REGION || 'us-east-1';
const S3_ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID || '';
const S3_SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY || '';
const S3_BUCKET = process.env.AWS_S3_BUCKET || process.env.S3_BUCKET || '';
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === 'true'; // For MinIO

// S3 Client (used for both AWS S3 and MinIO)
let s3Client: S3Client | null = null;

const getS3Client = (): S3Client => {
  if (!s3Client) {
    const config: any = {
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
    };

    // MinIO-specific configuration
    if (S3_ENDPOINT) {
      config.endpoint = S3_ENDPOINT;
      config.forcePathStyle = S3_FORCE_PATH_STYLE;
    }

    s3Client = new S3Client(config);
  }
  return s3Client;
};

/**
 * Upload file to local storage
 */
const uploadToLocal = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${fileExtension}`;
  const folderPath = path.join(LOCAL_STORAGE_PATH, folder);
  const filePath = path.join(folderPath, fileName);

  // Ensure folder exists
  await fs.mkdir(folderPath, { recursive: true });

  // Write file
  await fs.writeFile(filePath, file.buffer);

  // Return URL
  return `${LOCAL_STORAGE_BASE_URL}/${folder}/${fileName}`;
};

/**
 * Upload file to S3 or MinIO
 */
const uploadToS3 = async (
  file: Express.Multer.File,
  folder: string
): Promise<string> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  });

  const client = getS3Client();
  await client.send(command);

  // Return URL based on provider
  if (S3_ENDPOINT) {
    // MinIO URL
    return `${S3_ENDPOINT}/${S3_BUCKET}/${fileName}`;
  } else {
    // AWS S3 URL
    return `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${fileName}`;
  }
};

/**
 * Delete file from local storage
 */
const deleteFromLocal = async (fileUrl: string): Promise<void> => {
  try {
    // Extract path from URL
    const urlParts = fileUrl.replace(LOCAL_STORAGE_BASE_URL, '');
    const filePath = path.join(LOCAL_STORAGE_PATH, urlParts);

    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting local file:', error);
  }
};

/**
 * Delete file from S3 or MinIO
 */
const deleteFromS3 = async (fileUrl: string): Promise<void> => {
  try {
    let fileName: string;

    if (S3_ENDPOINT) {
      // MinIO: extract from MinIO URL
      fileName = fileUrl.split(`/${S3_BUCKET}/`)[1];
    } else {
      // AWS S3: extract from S3 URL
      fileName = fileUrl.split('.amazonaws.com/')[1];
    }

    if (!fileName) return;

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: fileName,
    });

    const client = getS3Client();
    await client.send(command);
  } catch (error) {
    console.error('Error deleting S3/MinIO file:', error);
  }
};

/**
 * Upload file using configured storage provider
 */
export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = 'products'
): Promise<string> => {
  switch (STORAGE_PROVIDER) {
    case 'local':
      return uploadToLocal(file, folder);
    case 'minio':
    case 's3':
      return uploadToS3(file, folder);
    default:
      throw new Error(`Unknown storage provider: ${STORAGE_PROVIDER}`);
  }
};

/**
 * Delete file using configured storage provider
 */
export const deleteFile = async (fileUrl: string): Promise<void> => {
  switch (STORAGE_PROVIDER) {
    case 'local':
      return deleteFromLocal(fileUrl);
    case 'minio':
    case 's3':
      return deleteFromS3(fileUrl);
    default:
      console.error(`Unknown storage provider: ${STORAGE_PROVIDER}`);
  }
};

/**
 * Get current storage provider info
 */
export const getStorageInfo = () => {
  return {
    provider: STORAGE_PROVIDER,
    config: {
      local: STORAGE_PROVIDER === 'local' ? {
        path: LOCAL_STORAGE_PATH,
        baseUrl: LOCAL_STORAGE_BASE_URL,
      } : null,
      s3: STORAGE_PROVIDER === 's3' ? {
        region: S3_REGION,
        bucket: S3_BUCKET,
      } : null,
      minio: STORAGE_PROVIDER === 'minio' ? {
        endpoint: S3_ENDPOINT,
        bucket: S3_BUCKET,
        region: S3_REGION,
      } : null,
    },
  };
};

// Log storage configuration on startup
console.log('Storage Configuration:', getStorageInfo());
