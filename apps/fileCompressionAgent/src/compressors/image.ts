import sharp from "sharp";

import { MAX_IMAGE_PIXELS, MAX_OUTPUT_BYTES } from "../types";

const PREFERRED_WEBP_QUALITY = 80;
const FALLBACK_WEBP_QUALITY = 60;
const MIN_LONG_EDGE = 512;
const PROBE_LONG_EDGE = 2048;
const ESTIMATE_SAFETY_FACTOR = 0.96;
const MAX_ESTIMATE_CORRECTIONS = 2;

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

async function encodeAtDimensions(input: {
  baseline: Buffer;
  height: number;
  quality: number;
  width: number;
}): Promise<Buffer> {
  return encodeCandidate(input.baseline, input.width, input.height, input.quality);
}

function estimatedLongEdge(referenceLongEdge: number, encodedBytes: number, maxLongEdge = referenceLongEdge): number {
  const estimate = referenceLongEdge * Math.sqrt(MAX_OUTPUT_BYTES / encodedBytes) * ESTIMATE_SAFETY_FACTOR;
  return Math.max(MIN_LONG_EDGE, Math.min(maxLongEdge, Math.floor(estimate)));
}

export type ImageCompressionResult = {
  bytes: Buffer;
  originalBytes: number;
  ssim: number;
  status: "compressed" | "unchanged";
};

export class ImageCannotFitError extends Error {
  constructor() {
    super("The image could not reach the 1 MiB limit while preserving the minimum visual quality");
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

  const baseline = await sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS })
    .rotate()
    .toBuffer();
  const longest = Math.max(metadata.width, metadata.height);
  if (longest <= PROBE_LONG_EDGE) {
    const fullSize = await encodeAtDimensions({
      baseline,
      width: metadata.width,
      height: metadata.height,
      quality: PREFERRED_WEBP_QUALITY,
    });
    if (fullSize.byteLength > MAX_OUTPUT_BYTES) throw new ImageCannotFitError();
    return {
      bytes: fullSize,
      originalBytes: input.byteLength,
      ssim: blockSsim(await thumbnail(baseline), await thumbnail(fullSize)),
      status: "compressed",
    };
  }

  // A 2,048px WebP is only a fast size probe, never a final-resolution cap.
  // It avoids first encoding the entire source image just to learn it exceeds
  // 1 MiB, then estimates the final dimensions from the probe's byte size.
  const probeDimensions = dimensionsForLongEdge(metadata.width, metadata.height, PROBE_LONG_EDGE);
  const probe = await encodeAtDimensions({
    baseline,
    width: probeDimensions.width,
    height: probeDimensions.height,
    quality: PREFERRED_WEBP_QUALITY,
  });
  let edge = estimatedLongEdge(PROBE_LONG_EDGE, probe.byteLength, longest);
  let best: Buffer | null = null;
  for (let attempt = 0; attempt <= MAX_ESTIMATE_CORRECTIONS; attempt += 1) {
    const dimensions = dimensionsForLongEdge(metadata.width, metadata.height, edge);
    const candidate = await encodeAtDimensions({
      baseline,
      width: dimensions.width,
      height: dimensions.height,
      quality: PREFERRED_WEBP_QUALITY,
    });
    if (candidate.byteLength <= MAX_OUTPUT_BYTES) {
      best = candidate;
      break;
    }
    const nextEdge = estimatedLongEdge(edge, candidate.byteLength);
    if (nextEdge >= edge || edge === MIN_LONG_EDGE) break;
    edge = nextEdge;
  }

  if (!best) {
    const minimum = dimensionsForLongEdge(metadata.width, metadata.height, Math.min(MIN_LONG_EDGE, longest));
    const fallback = await encodeAtDimensions({
      baseline,
      width: minimum.width,
      height: minimum.height,
      quality: FALLBACK_WEBP_QUALITY,
    });
    if (fallback.byteLength > MAX_OUTPUT_BYTES) throw new ImageCannotFitError();
    best = fallback;
  }

  return {
    bytes: best,
    originalBytes: input.byteLength,
    ssim: blockSsim(await thumbnail(baseline), await thumbnail(best)),
    status: "compressed",
  };
}
