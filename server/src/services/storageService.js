const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client, bucket } = require('../config/storage');
const path = require('path');
const { format } = require('date-fns');
const cloudinary = require('cloudinary').v2;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const hasCloudinaryConfig = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

if (hasCloudinaryConfig()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

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

const hasStorageConfig = () => {
  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    return hasCloudinaryConfig();
  }
  return hasS3Config();
};

const saveLocalFallback = (key, buffer) => {
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
};

const uploadFile = async (key, buffer, contentType) => {
  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    if (!hasCloudinaryConfig()) {
      if (IS_PRODUCTION) {
        console.warn('[Storage] No Cloudinary configured in production. File not uploaded.');
        return null;
      }
      return saveLocalFallback(key, buffer);
    }
    try {
      return new Promise((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'call_recordings',
            public_id: key.replace(/\.[^.]+$/, ''),
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              console.error('[Storage] Cloudinary upload failed:', error.message);
              resolve(IS_PRODUCTION ? null : saveLocalFallback(key, buffer));
            } else {
              resolve(result.secure_url);
            }
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.error('[Storage] Cloudinary upload error:', err.message);
      return IS_PRODUCTION ? null : saveLocalFallback(key, buffer);
    }
  }

  // S3 upload code
  if (!hasS3Config()) {
    if (IS_PRODUCTION) {
      console.warn('[Storage] No S3 configured in production. File not uploaded.');
      return null;
    }
    return saveLocalFallback(key, buffer);
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
    if (IS_PRODUCTION) return null;
    return saveLocalFallback(key, buffer);
  }
};

const deleteFile = async (key) => {
  if (!key) return;

  // Local delete in development
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

  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    if (!hasCloudinaryConfig()) return;
    try {
      const isRaw = key.toLowerCase().endsWith('.zip');
      const publicId = key.replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId, { resource_type: isRaw ? 'raw' : 'video' });
      console.log(`[Storage] Deleted Cloudinary asset: ${publicId}`);
    } catch (error) {
      console.warn('[Storage] Cloudinary delete failed:', error.message);
    }
    return;
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

  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    if (!hasCloudinaryConfig()) {
      return IS_PRODUCTION ? null : `/uploads/${key}`;
    }
    const isRaw = key.toLowerCase().endsWith('.zip');
    return cloudinary.url(key, { secure: true, resource_type: isRaw ? 'raw' : 'video' });
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

const getPresignedUploadUrl = async (key, contentType, expiresIn = 3600) => {
  if (process.env.STORAGE_PROVIDER === 'cloudinary') {
    if (!hasCloudinaryConfig()) return null;
    try {
      const timestamp = Math.round(new Date().getTime() / 1000);
      const isRaw = key.toLowerCase().endsWith('.zip') || contentType === 'application/zip';
      const folder = 'call_recordings';
      const publicId = key.replace(/\.[^.]+$/, '');
      
      const paramsToSign = {
        timestamp,
        folder,
        public_id: publicId,
      };

      const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET);
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const resourceType = isRaw ? 'raw' : 'video';

      return {
        directUpload: true,
        provider: 'cloudinary',
        uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        fields: {
          api_key: process.env.CLOUDINARY_API_KEY,
          timestamp,
          signature,
          folder,
          public_id: publicId,
        }
      };
    } catch (error) {
      console.error('[Storage] Cloudinary sign failed:', error.message);
      return null;
    }
  }

  if (!hasS3Config()) {
    return null;
  }
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return {
      directUpload: true,
      provider: 's3',
      uploadUrl: url,
      fileKey: key
    };
  } catch (error) {
    console.error('[Storage] Get presigned upload URL failed:', error.message);
    return null;
  }
};

const getFileBuffer = async (key, fileUrl) => {
  if (fileUrl) {
    try {
      const axios = require('axios');
      const response = await axios.get(fileUrl, { responseType: 'arraybuffer', timeout: 60000 });
      return Buffer.from(response.data);
    } catch (err) {
      console.error('[Storage] Download from URL failed:', err.message);
    }
  }

  if (!IS_PRODUCTION || !hasStorageConfig()) {
    try {
      const fs = require('fs');
      const uploadDir = path.join(__dirname, '../../uploads');
      const localPath = path.join(uploadDir, key);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    } catch (err) {
      console.error('[Storage] Local read failed:', err.message);
    }
  }

  if (hasS3Config()) {
    try {
      const command = new GetObjectCommand({ Bucket: bucket, Key: key });
      const response = await s3Client.send(command);
      const streamToBuffer = async (stream) => {
        return new Promise((resolve, reject) => {
          const chunks = [];
          stream.on('data', (chunk) => chunks.push(chunk));
          stream.on('error', reject);
          stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
      };
      return await streamToBuffer(response.Body);
    } catch (error) {
      console.error('[Storage] Cloud get file failed:', error.message);
    }
  }

  return null;
};

module.exports = {
  buildKey,
  uploadFile,
  deleteFile,
  getSignedUrl: getSignedDownloadUrl,
  hasStorageConfig,
  getPresignedUploadUrl,
  getFileBuffer,
};
