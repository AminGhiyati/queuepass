import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { environment } from "../environment.js";

const UPLOAD_URL_LIFETIME_IN_SECONDS = 300;

export const imageFileExtensions = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type ImageContentType = keyof typeof imageFileExtensions;

const s3 = new S3Client({
  endpoint: environment.S3_ENDPOINT,
  region: environment.S3_REGION,
  credentials: {
    accessKeyId: environment.S3_ACCESS_KEY,
    secretAccessKey: environment.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});

export async function createEventImageUpload(contentType: ImageContentType) {
  const imageKey = `events/${randomUUID()}.${imageFileExtensions[contentType]}`;

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: environment.S3_BUCKET,
      Key: imageKey,
      ContentType: contentType,
    }),
    { expiresIn: UPLOAD_URL_LIFETIME_IN_SECONDS },
  );

  return { imageKey, uploadUrl };
}

export function eventImageUrl(imageKey: string | null) {
  return imageKey ? `${environment.S3_PUBLIC_URL}/${imageKey}` : null;
}
