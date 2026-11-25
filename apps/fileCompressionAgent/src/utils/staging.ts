import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { randomUUID } from "node:crypto";

import { maxInputBytes, PRESIGNED_UPLOAD_TTL_SECONDS, type MediaKind } from "../types";

const s3 = new S3Client({});

function bucketName(): string {
  const value = process.env.FILE_COMPRESSION_STAGING_BUCKET?.trim();
  if (!value) throw new Error("Missing FILE_COMPRESSION_STAGING_BUCKET");
  return value;
}

function sourceKey(jobId: string): string {
  return `incoming/${jobId}`;
}

export async function prepareStagedUpload(input: {
  contentType: string;
  mediaKind: MediaKind;
}) {
  const jobId = randomUUID();
  const key = sourceKey(jobId);
  const post = await createPresignedPost(s3, {
    Bucket: bucketName(),
    Key: key,
    Expires: PRESIGNED_UPLOAD_TTL_SECONDS,
    Fields: {
      "Content-Type": input.contentType,
      "x-amz-meta-job-id": jobId,
      "x-amz-meta-media-kind": input.mediaKind,
    },
    Conditions: [
      ["content-length-range", 1, maxInputBytes(input.mediaKind)],
      ["eq", "$Content-Type", input.contentType],
      ["eq", "$x-amz-meta-job-id", jobId],
      ["eq", "$x-amz-meta-media-kind", input.mediaKind],
    ],
  });
  return { jobId, expiresInSeconds: PRESIGNED_UPLOAD_TTL_SECONDS, post };
}

export async function readAndDeleteStagedSource(input: {
  contentType: string;
  jobId: string;
  mediaKind: MediaKind;
}): Promise<Buffer> {
  const Bucket = bucketName();
  const Key = sourceKey(input.jobId);
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket, Key }));
    const size = head.ContentLength ?? 0;
    if (size < 1 || size > maxInputBytes(input.mediaKind)) {
      throw new Error("Staged source is outside the allowed size range");
    }
    if (head.ContentType !== input.contentType) {
      throw new Error("Staged source content type does not match the request");
    }
    if (
      head.Metadata?.["job-id"] !== input.jobId ||
      head.Metadata?.["media-kind"] !== input.mediaKind
    ) {
      throw new Error("Staged source metadata does not match the request");
    }

    const object = await s3.send(new GetObjectCommand({ Bucket, Key }));
    if (!object.Body) throw new Error("Staged source is empty");
    const bytes = await object.Body.transformToByteArray();
    return Buffer.from(bytes);
  } finally {
    await s3.send(new DeleteObjectCommand({ Bucket, Key })).catch((error: unknown) => {
      console.error("Unable to delete staged compression source", { message: String(error) });
    });
  }
}
