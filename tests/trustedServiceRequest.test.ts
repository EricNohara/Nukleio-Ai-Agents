import { afterEach, describe, expect, it } from "vitest";

import {
  authorizeTrustedServiceRequest,
  TrustedServiceConfigurationError,
  TrustedServiceRequestError,
} from "../apps/fileCompressionAgent/src/utils/trustedServiceRequest";

const CALLER_ARN = "arn:aws:iam::123456789012:role/Nukleio-Headshot-Agent-Dev";
const REQUEST_ID = "018f74ad-7d38-7c21-9a13-d4fd83325004";

function event(overrides?: { callerArn?: string | null; operation?: string; requestId?: string }) {
  return {
    headers: {
      "x-nukleio-operation": overrides?.operation ?? "compress_file",
      "x-nukleio-request-id": overrides?.requestId ?? REQUEST_ID,
    },
    requestContext: {
      http: { method: "POST" },
      requestId: "lambda-request-id",
      ...(overrides?.callerArn === null
        ? {}
        : { authorizer: { iam: { userArn: overrides?.callerArn ?? CALLER_ARN } } }),
    },
  } as never;
}

afterEach(() => {
  delete process.env.NUKLEIO_COMPRESSION_CALLER_ARNS;
});

describe("file compression trusted service request guard", () => {
  it("accepts the configured IAM caller without a user-id header", () => {
    process.env.NUKLEIO_COMPRESSION_CALLER_ARNS = CALLER_ARN;
    expect(authorizeTrustedServiceRequest(event(), "compress_file")).toEqual({
      callerArn: CALLER_ARN,
      requestId: REQUEST_ID,
    });
  });

  it("rejects an unsigned caller or incorrect operation", () => {
    process.env.NUKLEIO_COMPRESSION_CALLER_ARNS = CALLER_ARN;
    expect(() => authorizeTrustedServiceRequest(event({ callerArn: null }), "compress_file")).toThrow(
      TrustedServiceRequestError,
    );
    expect(() =>
      authorizeTrustedServiceRequest(event({ operation: "compress_file_prepare" }), "compress_file"),
    ).toThrow(TrustedServiceRequestError);
  });

  it("fails closed without an allowlist", () => {
    expect(() => authorizeTrustedServiceRequest(event(), "compress_file")).toThrow(
      TrustedServiceConfigurationError,
    );
  });
});
