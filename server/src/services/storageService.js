const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucket } = require('../config/storage');
const path = require('path');
const fs = require('fs');
const { format } = require('date-fns');

const buildKey = (userId, businessId, fileName) => {
  const date = format(new Date(), 'yyyy/MM/dd');
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uid = businessId ? `${userId}/${businessId}` : userId;
  return `recordings/${uid}/${date}/${Date.now()}_${sanitizedName}`;
};

const uploadFile = async (key, buffer, contentType) => {
  // If no S3 bucket configured, return a placeholder URL
  if (!process.env.AWS_S3_BUCKET && !process.env.R2_BUCKET) {
    console.warn('[Storage] No bucket configured. File not uploaded to cloud.');
    return null;
  }

  // If placeholders are present, save file locally
  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  if (!accessKey || accessKey.includes('your_aws_access_key') || accessKey === '') {
    try {
      const uploadDir = path.join(__dirname, '../../uploads');
      const fullPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      console.log(`[Storage] Saved file locally to: ${fullPath}`);
      return `/uploads/${key}`;
    } catch (err) {
      console.error('[Storage] Local save failed:', err.message);
      return `/uploads/${key}`;
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
    console.warn('[Storage] Cloud upload failed, falling back to local storage:', error.message);
    try {
      const uploadDir = path.join(__dirname, '../../uploads');
      const fullPath = path.join(uploadDir, key);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, buffer);
      console.log(`[Storage] Saved fallback file locally to: ${fullPath}`);
      return `/uploads/${key}`;
    } catch (err) {
      console.error('[Storage] Local fallback save failed:', err.message);
      return `/uploads/${key}`;
    }
  }
};

const deleteFile = async (key) => {
  if (!key) return;

  // Try to delete locally first if it exists
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    const localPath = path.join(uploadDir, key);
    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      console.log(`[Storage] Deleted local file: ${localPath}`);
    }
  } catch (err) {
    console.warn('[Storage] Local file delete failed:', err.message);
  }

  if (!process.env.AWS_S3_BUCKET && !process.env.R2_BUCKET) return;

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  if (!accessKey || accessKey.includes('your_aws_access_key') || accessKey === '') {
    return;
  }

  try {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await s3Client.send(command);
  } catch (error) {
    console.warn('[Storage] Cloud delete file failed:', error.message);
  }
};

const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;

  // If local file exists, return local path
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    const localPath = path.join(uploadDir, key);
    if (fs.existsSync(localPath)) {
      return `/uploads/${key}`;
    }
  } catch (err) {}

  if (!process.env.AWS_S3_BUCKET && !process.env.R2_BUCKET) {
    return null;
  }

  const accessKey = process.env.AWS_ACCESS_KEY_ID;
  if (!accessKey || accessKey.includes('your_aws_access_key') || accessKey === '') {
    return `/uploads/${key}`;
  }

  try {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(s3Client, command, { expiresIn });
  } catch (error) {
    console.warn('[Storage] Get signed URL failed, using fallback:', error.message);
    return `/uploads/${key}`;
  }
};

module.exports = { buildKey, uploadFile, deleteFile, getSignedUrl: getSignedDownloadUrl };
