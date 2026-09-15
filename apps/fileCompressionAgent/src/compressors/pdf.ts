import { PDFDocument } from "pdf-lib";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

import { MAX_OUTPUT_BYTES } from "../types";

const execFileAsync = promisify(execFile);

export type PdfCompressionResult = {
  bytes: Buffer;
  originalBytes: number;
  status: "compressed" | "unchanged";
};

export class PdfCannotFitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfCannotFitError";
  }
}

async function safeOptimize(input: Buffer): Promise<Buffer> {
  const document = await PDFDocument.load(input, { updateMetadata: false });
  const saved = await document.save({ useObjectStreams: true, addDefaultPage: false, updateFieldAppearances: false });
  return Buffer.from(saved);
}

async function lossyOptimize(input: Buffer): Promise<Buffer | null> {
  const binary = process.env.GHOSTSCRIPT_BINARY_PATH?.trim();
  if (!binary) return null;
  const directory = await mkdtemp(join(tmpdir(), "nukleio-pdf-"));
  const source = join(directory, "source.pdf");
  const output = join(directory, "compressed.pdf");
  try {
    await writeFile(source, input);
    // The last pass is intentionally aggressive: 96 DPI and JPEG quality 60 are the
    // documented fallback floor before returning a structured cannot-fit response.
    for (const [dpi, quality] of [[144, 80], [120, 70], [96, 60]] as const) {
      await execFileAsync(binary, [
        "-q",
        "-dSAFER",
        "-dBATCH",
        "-dNOPAUSE",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dAutoRotatePages=/None",
        "-dDownsampleColorImages=true",
        "-dDownsampleGrayImages=true",
        "-dDownsampleMonoImages=true",
        "-dColorImageDownsampleType=/Bicubic",
        "-dGrayImageDownsampleType=/Bicubic",
        `-dColorImageResolution=${dpi}`,
        `-dGrayImageResolution=${dpi}`,
        `-dMonoImageResolution=${dpi}`,
        `-dJPEGQ=${quality}`,
        `-sOutputFile=${output}`,
        source,
      ]);
      const candidate = await readFile(output);
      if (candidate.byteLength <= MAX_OUTPUT_BYTES) return candidate;
    }
    return await readFile(output);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export async function compressPdf(input: Buffer): Promise<PdfCompressionResult> {
  if (!input.subarray(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("The uploaded document is not a valid PDF");
  }
  const optimized = await safeOptimize(input);
  const bestSafe = optimized.byteLength < input.byteLength ? optimized : input;
  if (bestSafe.byteLength <= MAX_OUTPUT_BYTES) {
    return {
      bytes: bestSafe,
      originalBytes: input.byteLength,
      status: bestSafe === input ? "unchanged" : "compressed",
    };
  }
  const lossy = await lossyOptimize(bestSafe);
  if (!lossy) {
    throw new PdfCannotFitError(
      "The PDF needs lossy compression, but the PDF optimizer layer is not configured",
    );
  }
  if (lossy.byteLength > MAX_OUTPUT_BYTES) {
    throw new PdfCannotFitError(
      "The PDF could not reach 1 MiB at the 96 DPI fallback floor",
    );
  }
  return { bytes: lossy, originalBytes: input.byteLength, status: "compressed" };
}
