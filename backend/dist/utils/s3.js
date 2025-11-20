"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteFile = exports.uploadFile = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const uuid_1 = require("uuid");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const bucket = process.env.AWS_S3_BUCKET || '';
const uploadFile = async (file, folder = 'products') => {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${folder}/${(0, uuid_1.v4)()}.${fileExtension}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucket,
        Key: fileName,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
    });
    await s3Client.send(command);
    return `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};
exports.uploadFile = uploadFile;
const deleteFile = async (fileUrl) => {
    const fileName = fileUrl.split('.amazonaws.com/')[1];
    if (!fileName)
        return;
    const command = new client_s3_1.DeleteObjectCommand({
        Bucket: bucket,
        Key: fileName,
    });
    await s3Client.send(command);
};
exports.deleteFile = deleteFile;
//# sourceMappingURL=s3.js.map