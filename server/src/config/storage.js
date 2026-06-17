const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const getS3Client = () => {
  const isR2 = process.env.STORAGE_PROVIDER === 'r2';

  if (isR2) {
    return new S3Client({
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      },
    });
  }

  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
};

const getBucket = () => {
  return process.env.STORAGE_PROVIDER === 'r2'
    ? process.env.R2_BUCKET
    : process.env.AWS_S3_BUCKET;
};

const s3Client = getS3Client();
const bucket = getBucket();

module.exports = { s3Client, bucket, GetObjectCommand, DeleteObjectCommand, getSignedUrl };
