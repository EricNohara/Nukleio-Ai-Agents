export const MAX_OUTPUT_BYTES = 1_048_576;
export const MAX_IMAGE_INPUT_BYTES = 50 * 1024 * 1024;
export const MAX_PDF_INPUT_BYTES = 50 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 100_000_000;
export const PRESIGNED_UPLOAD_TTL_SECONDS = 300;

export const mediaKinds = [
  "portrait",
  "project-thumbnail",
  "resume",
  "transcript",
  "generated-headshot",
  "generated-resume",
] as const;

export type MediaKind = (typeof mediaKinds)[number];

export function isPdfKind(kind: MediaKind): boolean {
  return kind === "resume" || kind === "transcript" || kind === "generated-resume";
}

export function maxInputBytes(kind: MediaKind): number {
  return isPdfKind(kind) ? MAX_PDF_INPUT_BYTES : MAX_IMAGE_INPUT_BYTES;
}

export function acceptsContentType(kind: MediaKind, contentType: string): boolean {
  if (isPdfKind(kind)) return contentType === "application/pdf";
  return ["image/jpeg", "image/png", "image/webp"].includes(contentType);
}
