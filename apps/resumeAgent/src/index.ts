import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";

import { runGeneratePipeline, runGenerateWithAiPipeline } from "./pipeline";
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

const generateResumeSchema = z.object({
  userId: z.string().uuid(),
  userInfo: userInfoSchema,
  templateId: z.string().optional(),
  deliveryMode: z.enum(["cached", "transient"]).default("cached"),
});

const generateResumeWithAiSchema = z.object({
  userId: z.string().uuid(),
  userInfo: userInfoSchema,
  templateId: z.string().optional(),
  targetJobs: z.array(z.string()).optional(),
  deliveryMode: z.enum(["cached", "transient"]).default("cached"),
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
      ? "resume_generate"
      : route === "/generateAi"
        ? "resume_generate_ai"
        : null;

  if (!operation) {
    return jsonResponse(404, { success: false, error: "Route not found" });
  }

  try {
    const trustedRequest = authorizeTrustedAppRequest(event, operation);
    const body: unknown = JSON.parse(event.body || "{}");

    if (route === "/generate") {
      const input = generateResumeSchema.parse(body);
      assertAuthorizedUserId(trustedRequest, input.userId);
      return jsonResponse(200, await runGeneratePipeline(input));
    }

    const input = generateResumeWithAiSchema.parse(body);
    assertAuthorizedUserId(trustedRequest, input.userId);
    return jsonResponse(200, await runGenerateWithAiPipeline(input));
  } catch (error) {
    if (error instanceof TrustedAppConfigurationError) {
      console.error("Resume agent authentication is misconfigured:", error);
      return jsonResponse(500, {
        success: false,
        error: "Agent authentication is unavailable",
      });
    }

    if (error instanceof TrustedAppRequestError) {
      console.warn("Rejected unauthorized resume agent request", {
        requestId: event.requestContext.requestId,
      });
      return jsonResponse(403, { success: false, error: "Forbidden" });
    }

    console.error("Resume agent request failed:", error);
    const invalidRequest = error instanceof SyntaxError || error instanceof z.ZodError;
    return jsonResponse(invalidRequest ? 400 : 500, {
      success: false,
      error: invalidRequest ? "Invalid request body" : "Agent request failed",
    });
  }
};
