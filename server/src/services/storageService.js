const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucket } = require('../config/storage');
const path = require('path');
const { format } = require('date-fns');

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const buildKey = (userId, businessId, fileName) => {
  const date = format(new Date(), 'yyyy/MM/dd');
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uid = businessId ? `${userId}/${businessId}` : userId;
  return `recordings/${uid}/${date}/${Date.now()}_${sanitizedName}`;
};

const hasS3Config = () => {
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  const hasBucket = !!(process.env.AWS_S3_BUCKET || process.env.R2_BUCKET);
  const hasValidKey = accessKey && !accessKey.includes('your_aws_access_key') && accessKey !== '';
  return hasBucket && hasValidKey;
};

const uploadFile = async (key, buffer, contentType) => {
  // In production (Vercel), never write to local disk — filesystem is read-only
  if (!hasS3Config()) {
    if (IS_PRODUCTION) {
      console.warn('[Storage] No S3 configured in production. File not uploaded.');
      return null;
    }
    // Development only: save locally
    try {
      const fs = require('fs');
      const uploadDir = path.join(__dirname, '../../uploads');
      const fullPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      console.log(`[Storage] Saved file locally to: ${fullPath}`);
      return `/uploads/${key}`;
    } catch (err) {
      console.error('[Storage] Local save failed:', err.message);
      return null;
    }
  }

  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    await s3Client.send(command);
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('[Storage] Cloud upload failed:', error.message);
    // In production, DO NOT fallback to local disk (it's read-only on Vercel)
    if (IS_PRODUCTION) return null;
    try {
      const fs = require('fs');
      const uploadDir = path.join(__dirname, '../../uploads');
      const fullPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      console.log(`[Storage] Saved fallback file locally to: ${fullPath}`);
      return `/uploads/${key}`;
    } catch (err) {
      console.error('[Storage] Local fallback save failed:', err.message);
      return null;
    }
  }
};

const deleteFile = async (key) => {
  if (!key) return;

  // Only attempt local delete in development
  if (!IS_PRODUCTION) {
    try {
      const fs = require('fs');
      const uploadDir = path.join(__dirname, '../../uploads');
      const localPath = path.join(uploadDir, key);
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
        console.log(`[Storage] Deleted local file: ${localPath}`);
      }
    } catch (err) {
      console.warn('[Storage] Local file delete failed:', err.message);
    }
  }

  if (!hasS3Config()) return;

  try {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(command);
  } catch (error) {
    console.warn('[Storage] Cloud delete file failed:', error.message);
  }
};

const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;

  // Only check local files in development
  if (!IS_PRODUCTION) {
    try {
      const fs = require('fs');
      const uploadDir = path.join(__dirname, '../../uploads');
      const localPath = path.join(uploadDir, key);
      if (fs.existsSync(localPath)) {
        return `/uploads/${key}`;
      }
    } catch (err) {}
  }

  if (!hasS3Config()) {
    return IS_PRODUCTION ? null : `/uploads/${key}`;
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.warn('[Storage] Get signed URL failed:', error.message);
    return null;
  }
};

module.exports = { buildKey, uploadFile, deleteFile, getSignedUrl: getSignedDownloadUrl };
