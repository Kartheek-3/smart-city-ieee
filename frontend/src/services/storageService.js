/**
 * AWS S3 Storage Service — SmartCity Platform
 * Replaces: Firebase Storage
 * Uses: @aws-sdk/client-s3 with pre-signed URLs
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const REGION = process.env.REACT_APP_AWS_REGION || 'us-east-1';
const BUCKET = process.env.REACT_APP_S3_BUCKET || '';

const getS3Client = () => {
  return new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || '',
    },
  });
};

// ── Upload File ───────────────────────────────────────────────────────────────
export const uploadFile = async (file, folder = 'reports') => {
  if (!BUCKET) {
    console.warn('S3 bucket not configured. Using placeholder URL.');
    return `https://placeholder.example.com/${folder}/${file.name}`;
  }

  const client = await getS3Client();
  const key = `${folder}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  await client.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type,
  }));

  // Generate a readable URL (1-hour expiry)
  const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const signedUrl = await getSignedUrl(client, getCmd, { expiresIn: 3600 });
  return signedUrl;
};

// ── Upload Multiple Files ─────────────────────────────────────────────────────
export const uploadFiles = async (files, folder = 'reports') => {
  return Promise.all(Array.from(files).map(f => uploadFile(f, folder)));
};

// ── Delete File ───────────────────────────────────────────────────────────────
export const deleteFile = async (key) => {
  if (!BUCKET) return;
  const client = await getS3Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
};

// ── Generate Pre-signed Upload URL (for direct browser uploads) ───────────────
export const getUploadUrl = async (key, contentType, expiresIn = 300) => {
  if (!BUCKET) return null;
  const client = await getS3Client();
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return await getSignedUrl(client, command, { expiresIn });
};

// ── Generate Pre-signed Read URL ──────────────────────────────────────────────
export const getReadUrl = async (key, expiresIn = 3600) => {
  if (!BUCKET) return null;
  const client = await getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return await getSignedUrl(client, command, { expiresIn });
};

// ── Folder Helpers ────────────────────────────────────────────────────────────
export const FOLDERS = {
  ACCIDENTS: 'reports/accidents',
  CRIMES: 'reports/crimes',
  WASTE: 'reports/waste',
  FOOD: 'food/donations',
  PROFILES: 'profiles/avatars',
  DOCUMENTS: 'documents/city-plans',
};
