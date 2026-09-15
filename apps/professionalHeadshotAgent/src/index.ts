import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { z } from "zod";

import { runPipeline, runRevisionPipeline } from "./pipeline";
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

const headshotSizeSchema = z
  .enum(["1024x1024", "1536x1024", "1024x1536", "auto"])
  .default("1024x1024");

const headshotAttireSchema = z.enum([
  "auto",
  "business",
  "businessCasual",
  "smartCasual",
  "casual",
  "techProfessional",
  "academic",
]);
const deliveryModeSchema = z.enum(["cached", "transient"]);

const generateProfessionalHeadshotSchema = z.object({
  userId: z.string().uuid(),
  referenceUrl: z.string(),
  backgroundDescription: z.string().nullable(),
  backgroundUrl: z.string().optional(),
  attire: headshotAttireSchema,
  layout: headshotSizeSchema,
  deliveryMode: deliveryModeSchema,
});

const reviseProfessionalHeadshotSchema = z.object({
  userId: z.string().uuid(),
  headshotUrl: z.string(),
  feedback: z.string(),
  layout: headshotSizeSchema,
  deliveryMode: deliveryModeSchema,
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
      ? "headshot_generate"
      : route === "/revise"
        ? "headshot_revise"
        : null;

  if (!operation) {
    return jsonResponse(404, { success: false, error: "Route not found" });
  }

  try {
    const trustedRequest = authorizeTrustedAppRequest(event, operation);
    const body: unknown = JSON.parse(event.body || "{}");

    if (route === "/generate") {
      const input = generateProfessionalHeadshotSchema.parse(body);
      assertAuthorizedUserId(trustedRequest, input.userId);
      return jsonResponse(200, await runPipeline(input));
    }

    const input = reviseProfessionalHeadshotSchema.parse(body);
    assertAuthorizedUserId(trustedRequest, input.userId);
    return jsonResponse(200, await runRevisionPipeline(input));
  } catch (error) {
    if (error instanceof TrustedAppConfigurationError) {
      console.error("Headshot agent authentication is misconfigured:", error);
      return jsonResponse(500, {
        success: false,
        error: "Agent authentication is unavailable",
      });
    }

    if (error instanceof TrustedAppRequestError) {
      console.warn("Rejected unauthorized headshot agent request", {
        requestId: event.requestContext.requestId,
      });
      return jsonResponse(403, { success: false, error: "Forbidden" });
    }

    console.error("Headshot agent request failed:", error);
    const invalidRequest = error instanceof SyntaxError || error instanceof z.ZodError;
    return jsonResponse(invalidRequest ? 400 : 500, {
      success: false,
      error: invalidRequest ? "Invalid request body" : "Agent request failed",
    });
  }
};
