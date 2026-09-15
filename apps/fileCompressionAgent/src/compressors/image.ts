import sharp from "sharp";

import { MAX_IMAGE_PIXELS, MAX_OUTPUT_BYTES } from "../types";

const PRIMARY_SSIM_FLOOR = 0.95;
const FALLBACK_SSIM_FLOOR = 0.75;
const MAX_LONG_EDGE = 2048;
const MIN_FALLBACK_LONG_EDGE = 512;
const MAX_CANDIDATES_PER_STAGE = 7;

type Candidate = {
  bytes: Buffer;
  quality: number;
  ssim: number;
  width: number;
};

function dimensionsForLongEdge(width: number, height: number, longEdge: number) {
  if (Math.max(width, height) <= longEdge) return { width, height };
  const scale = longEdge / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function blockSsim(reference: Buffer, candidate: Buffer): number {
  if (reference.length !== candidate.length || reference.length === 0) return 0;
  // SSIM is measured on 8x8 luminance blocks. The buffers are 256x256 grayscale.
  const side = 256;
  const block = 8;
  const c1 = 6.5025;
  const c2 = 58.5225;
  let total = 0;
  let blocks = 0;

  for (let top = 0; top < side; top += block) {
    for (let left = 0; left < side; left += block) {
      let sumA = 0;
      let sumB = 0;
      const count = block * block;
      for (let y = 0; y < block; y += 1) {
        for (let x = 0; x < block; x += 1) {
          const index = (top + y) * side + left + x;
          sumA += reference[index] ?? 0;
          sumB += candidate[index] ?? 0;
        }
      }
      const meanA = sumA / count;
      const meanB = sumB / count;
      let varianceA = 0;
      let varianceB = 0;
      let covariance = 0;
      for (let y = 0; y < block; y += 1) {
        for (let x = 0; x < block; x += 1) {
          const index = (top + y) * side + left + x;
          const deltaA = (reference[index] ?? 0) - meanA;
          const deltaB = (candidate[index] ?? 0) - meanB;
          varianceA += deltaA * deltaA;
          varianceB += deltaB * deltaB;
          covariance += deltaA * deltaB;
        }
      }
      varianceA /= count - 1;
      varianceB /= count - 1;
      covariance /= count - 1;
      total +=
        ((2 * meanA * meanB + c1) * (2 * covariance + c2)) /
        ((meanA * meanA + meanB * meanB + c1) * (varianceA + varianceB + c2));
      blocks += 1;
    }
  }
  return Math.max(0, Math.min(1, total / blocks));
}

async function thumbnail(input: Buffer): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(256, 256, { fit: "fill", withoutEnlargement: false })
    .removeAlpha()
    .grayscale()
    .raw()
    .toBuffer();
}

async function encodeCandidate(input: Buffer, width: number, height: number, quality: number): Promise<Buffer> {
  return sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(width, height, { fit: "fill", withoutEnlargement: true })
    .webp({ quality, alphaQuality: quality, effort: 4 })
    .toBuffer();
}

async function findSmallestCandidate(input: {
  baseline: Buffer;
  height: number;
  qualityFloor: number;
  referenceThumbnail: Buffer;
  width: number;
}): Promise<Candidate | null> {
  let low = 1;
  let high = 100;
  let best: Candidate | null = null;
  for (let attempt = 0; attempt < MAX_CANDIDATES_PER_STAGE && low <= high; attempt += 1) {
    const quality = Math.floor((low + high) / 2);
    const bytes = await encodeCandidate(input.baseline, input.width, input.height, quality);
    const score = blockSsim(input.referenceThumbnail, await thumbnail(bytes));
    if (score >= input.qualityFloor) {
      best = { bytes, quality, ssim: score, width: input.width };
      high = quality - 1;
    } else {
      low = quality + 1;
    }
  }
  return best;
}

export type ImageCompressionResult = {
  bytes: Buffer;
  originalBytes: number;
  ssim: number;
  status: "compressed" | "unchanged";
};

export class ImageCannotFitError extends Error {
  constructor() {
    super("The image could not reach the 1 MiB limit without crossing the fallback quality floor");
    this.name = "ImageCannotFitError";
  }
}

export async function compressImage(input: Buffer): Promise<ImageCompressionResult> {
  const metadata = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS }).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error("The uploaded image is invalid");
  }
  if (!["jpeg", "png", "webp"].includes(metadata.format)) {
    throw new Error("Unsupported image format");
  }
  if (metadata.width * metadata.height > MAX_IMAGE_PIXELS) {
    throw new Error("The image has too many pixels");
  }

  const normalized = dimensionsForLongEdge(metadata.width, metadata.height, MAX_LONG_EDGE);
  const baseline = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .resize(normalized.width, normalized.height, { fit: "fill", withoutEnlargement: true })
    .toBuffer();
  const referenceThumbnail = await thumbnail(baseline);

  const primary = await findSmallestCandidate({
    baseline,
    width: normalized.width,
    height: normalized.height,
    qualityFloor: PRIMARY_SSIM_FLOOR,
    referenceThumbnail,
  });
  if (primary && primary.bytes.byteLength <= MAX_OUTPUT_BYTES) {
    return {
      bytes: primary.bytes,
      originalBytes: input.byteLength,
      ssim: primary.ssim,
      status: "compressed",
    };
  }

  const longest = Math.max(normalized.width, normalized.height);
  const fallbackLongEdges = [1600, 1280, 1024, 768, MIN_FALLBACK_LONG_EDGE]
    .filter((edge) => edge < longest)
    .concat(longest === MIN_FALLBACK_LONG_EDGE ? [] : [MIN_FALLBACK_LONG_EDGE]);

  let fallback: Candidate | null = null;
  for (const longEdge of fallbackLongEdges) {
    const dimensions = dimensionsForLongEdge(normalized.width, normalized.height, longEdge);
    const candidate = await findSmallestCandidate({
      baseline,
      width: dimensions.width,
      height: dimensions.height,
      qualityFloor: FALLBACK_SSIM_FLOOR,
      referenceThumbnail,
    });
    if (candidate && (!fallback || candidate.bytes.byteLength < fallback.bytes.byteLength)) {
      fallback = candidate;
    }
    if (candidate && candidate.bytes.byteLength <= MAX_OUTPUT_BYTES) break;
  }

  if (!fallback || fallback.bytes.byteLength > MAX_OUTPUT_BYTES) {
    throw new ImageCannotFitError();
  }
  return {
    bytes: fallback.bytes,
    originalBytes: input.byteLength,
    ssim: fallback.ssim,
    status: "compressed",
  };
}
