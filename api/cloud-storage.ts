import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomBytes } from "crypto";

// Use Aliyun OSS S3-compatible endpoint (available in Kimi environment)
const s3Client = new S3Client({
  region: process.env.OSS_REGION || "cn-beijing",
  endpoint: process.env.OSS_ENDPOINT || "https://oss-cn-beijing.aliyuncs.com",
  credentials: {
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.OSS_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: false,
});

const BUCKET = process.env.OSS_BUCKET || "missioncontrol-resumes";

// Fallback: if no OSS creds, store in local filesystem
function useLocalStorage(): boolean {
  return !process.env.OSS_ACCESS_KEY_ID || !process.env.OSS_SECRET_ACCESS_KEY;
}

export async function generateUploadUrl(
  key: string,
  contentType: string = "application/octet-stream",
  expiresIn: number = 300
) {
  if (useLocalStorage()) {
    // Return a local upload endpoint
    return {
      uploadUrl: `/api/upload/local?key=${encodeURIComponent(key)}`,
      publicUrl: `/api/files/${key}`,
      key,
    };
  }

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  const publicUrl = `https://${BUCKET}.oss-${process.env.OSS_REGION || "cn-beijing"}.aliyuncs.com/${key}`;

  return { uploadUrl, publicUrl, key };
}

export async function generateDownloadUrl(key: string, expiresIn: number = 3600) {
  if (useLocalStorage()) {
    return { downloadUrl: `/api/files/${key}`, key };
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return { downloadUrl, key };
}

export async function deleteFile(key: string) {
  if (useLocalStorage()) return { success: true };

  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await s3Client.send(command);
  return { success: true };
}

export function generateFileKey(userId: string, type: string, filename: string): string {
  const random = randomBytes(8).toString("hex");
  const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `users/${userId}/${type}/${random}-${sanitized}`;
}
