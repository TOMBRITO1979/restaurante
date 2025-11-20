import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const bucket = process.env.AWS_S3_BUCKET || '';

export const uploadFile = async (
  file: Express.Multer.File,
  folder: string = 'products'
): Promise<string> => {
  const fileExtension = file.originalname.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: fileName,
    Body: file.buffer,
    ContentType: file.mimetype,
    ACL: 'public-read',
  });

  await s3Client.send(command);

  return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};

export const deleteFile = async (fileUrl: string): Promise<void> => {
  const fileName = fileUrl.split('.amazonaws.com/')[1];

  if (!fileName) return;

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: fileName,
  });

  await s3Client.send(command);
};
