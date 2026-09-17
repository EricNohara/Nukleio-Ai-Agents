import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";

import { ImageCannotFitError, compressImage } from "./compressors/image";
import { PdfCannotFitError, PdfEncryptedError, compressPdf } from "./compressors/pdf";
import { acceptsContentType, MAX_OUTPUT_BYTES, mediaKinds } from "./types";
import { prepareStagedUpload, readAndDeleteStagedSource } from "./utils/staging";
import {
  authorizeTrustedServiceRequest,
  TrustedServiceConfigurationError,
  TrustedServiceRequestError,
} from "./utils/trustedServiceRequest";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const prepareSchema = z.object({
  contentType: z.string().trim().toLowerCase(),
  mediaKind: z.enum(mediaKinds),
});

const compressSchema = z.object({
  contentType: z.string().trim().toLowerCase(),
  jobId: z.string().uuid(),
  mediaKind: z.enum(mediaKinds),
});

function jsonResponse(statusCode: number, body: unknown) {
  return { statusCode, headers: JSON_HEADERS, body: JSON.stringify(body) };
}

function compressionFailure(reason: string, detail: string) {
  return jsonResponse(422, {
    success: false,
    error: "File could not be compressed to the 1 MiB storage limit",
    reason,
    detail,
    limitBytes: MAX_OUTPUT_BYTES,
  });
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const route = event.rawPath;
  const operation = route === "/prepare" ? "compress_file_prepare" : route === "/compress" ? "compress_file" : null;
  if (!operation) return jsonResponse(404, { success: false, error: "Route not found" });

  try {
    const trustedRequest = authorizeTrustedServiceRequest(event, operation);
    const body: unknown = JSON.parse(event.body || "{}");

    if (route === "/prepare") {
      const input = prepareSchema.parse(body);
      if (!acceptsContentType(input.mediaKind, input.contentType)) {
        return jsonResponse(400, { success: false, error: "Unsupported media kind or content type" });
      }
      const stagedUpload = await prepareStagedUpload(input);
      console.info("Prepared file compression upload", {
        callerArn: trustedRequest.callerArn,
        mediaKind: input.mediaKind,
        requestId: trustedRequest.requestId,
      });
      return jsonResponse(200, {
        success: true,
        jobId: stagedUpload.jobId,
        expiresInSeconds: stagedUpload.expiresInSeconds,
        upload: stagedUpload.post,
      });
    }

    const input = compressSchema.parse(body);
    if (!acceptsContentType(input.mediaKind, input.contentType)) {
      return jsonResponse(400, { success: false, error: "Unsupported media kind or content type" });
    }
    const source = await readAndDeleteStagedSource(input);
    const result = input.contentType === "application/pdf"
      ? await compressPdf(source)
      : await compressImage(source);

    if (result.bytes.byteLength > MAX_OUTPUT_BYTES) {
      return compressionFailure("output_limit_exceeded", "The compressor produced an oversized result");
    }
    console.info("Compressed file", {
      callerArn: trustedRequest.callerArn,
      inputBytes: result.originalBytes,
      mediaKind: input.mediaKind,
      outputBytes: result.bytes.byteLength,
      requestId: trustedRequest.requestId,
      status: result.status,
    });
    return {
      statusCode: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": input.contentType === "application/pdf" ? "application/pdf" : "image/webp",
        "X-Nukleio-Compression-Status": result.status,
        "X-Nukleio-Original-Bytes": String(result.originalBytes),
        "X-Nukleio-Output-Bytes": String(result.bytes.byteLength),
      },
      body: result.bytes.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    if (error instanceof TrustedServiceConfigurationError) {
      console.error("File compression authentication is misconfigured", { message: error.message });
      return jsonResponse(500, { success: false, error: "Compression authentication is unavailable" });
    }
    if (error instanceof TrustedServiceRequestError) {
      console.warn("Rejected unauthorized compression request", { requestId: event.requestContext.requestId });
      return jsonResponse(403, { success: false, error: "Forbidden" });
    }
    if (error instanceof ImageCannotFitError) {
      return compressionFailure("image_quality_floor", error.message);
    }
    if (error instanceof PdfCannotFitError) {
      return compressionFailure("pdf_quality_floor", error.message);
    }
    if (error instanceof PdfEncryptedError) {
      return compressionFailure("encrypted_pdf", error.message);
    }
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return jsonResponse(400, { success: false, error: "Invalid request body" });
    }
    console.error("File compression request failed", { message: String(error), requestId: event.requestContext.requestId });
    return jsonResponse(500, { success: false, error: "File compression failed" });
  }
};
