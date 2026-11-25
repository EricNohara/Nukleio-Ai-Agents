import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";

import { runPipeline, runRevisionPipeline } from "./pipeline";
import { coverLetterSessionSchema } from "./schemas/coverLetterSessionSchema";
import { userInfoSchema } from "./schemas/userInfoSchema";
import {
  assertAuthorizedUserId,
  authorizeTrustedAppRequest,
  TrustedAppConfigurationError,
  TrustedAppRequestError,
} from "./utils/trustedAppRequest";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

const generateCoverLetterSchema = z.object({
  userId: z.string().uuid(),
  userInfo: userInfoSchema,
  jobTitle: z.string(),
  companyName: z.string(),
  jobDescriptionDump: z.string(),
  writingSample: z.string().optional(),
});

const reviseSchema = z.object({
  userId: z.string().uuid(),
  userInfo: userInfoSchema,
  session: coverLetterSessionSchema,
  feedback: z.string(),
});

function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: JSON_HEADERS,
    body: JSON.stringify(body),
  };
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const route = event.rawPath;
  const operation =
    route === "/generate"
      ? "cover_letter_generate"
      : route === "/revise"
        ? "cover_letter_revise"
        : null;

  if (!operation) {
    return jsonResponse(404, { success: false, error: "Route not found" });
  }

  try {
    const trustedRequest = authorizeTrustedAppRequest(event, operation);
    const body: unknown = JSON.parse(event.body || "{}");

    if (route === "/generate") {
      const input = generateCoverLetterSchema.parse(body);
      assertAuthorizedUserId(trustedRequest, input.userId);
      return jsonResponse(200, await runPipeline(input));
    }

    const input = reviseSchema.parse(body);
    assertAuthorizedUserId(trustedRequest, input.userId);
    return jsonResponse(200, await runRevisionPipeline(input));
  } catch (error) {
    if (error instanceof TrustedAppConfigurationError) {
      console.error("Cover letter agent authentication is misconfigured:", error);
      return jsonResponse(500, {
        success: false,
        error: "Agent authentication is unavailable",
      });
    }

    if (error instanceof TrustedAppRequestError) {
      console.warn("Rejected unauthorized cover letter agent request", {
        requestId: event.requestContext.requestId,
      });
      return jsonResponse(403, { success: false, error: "Forbidden" });
    }

    console.error("Cover letter agent request failed:", error);
    const invalidRequest = error instanceof SyntaxError || error instanceof z.ZodError;
    return jsonResponse(invalidRequest ? 400 : 500, {
      success: false,
      error: invalidRequest ? "Invalid request body" : "Agent request failed",
    });
  }
};
