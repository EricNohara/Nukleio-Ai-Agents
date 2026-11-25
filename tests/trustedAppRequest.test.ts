import { describe, expect, it } from "vitest";

import * as coverLetterAuth from "../apps/coverLetterAgent/src/utils/trustedAppRequest";
import * as headshotAuth from "../apps/professionalHeadshotAgent/src/utils/trustedAppRequest";
import * as resumeAuth from "../apps/resumeAgent/src/utils/trustedAppRequest";

const APP_ARN = "arn:aws:iam::123456789012:user/Nukleio-App-Agent-Invoker-Dev";
const USER_ID = "018f74ad-7d38-7c21-9a13-d4fd83325003";
const REQUEST_ID = "018f74ad-7d38-7c21-9a13-d4fd83325004";

function event(overrides?: {
  callerArn?: string | null;
  operation?: string;
  requestId?: string;
  userId?: string;
}) {
  return {
    headers: {
      "x-nukleio-operation": overrides?.operation ?? "resume_generate",
      "x-nukleio-request-id": overrides?.requestId ?? REQUEST_ID,
      "x-nukleio-user-id": overrides?.userId ?? USER_ID,
    },
    requestContext: {
      http: { method: "POST" },
      requestId: "lambda-request-id",
      ...(overrides?.callerArn === null
        ? {}
        : {
            authorizer: {
              iam: { userArn: overrides?.callerArn ?? APP_ARN },
            },
          }),
    },
  } as never;
}

describe.each([
  ["resume", resumeAuth],
  ["cover letter", coverLetterAuth],
  ["headshot", headshotAuth],
])("%s trusted app request guard", (_name, auth) => {
  it("accepts the configured IAM caller and signed metadata", () => {
    const result = auth.authorizeTrustedAppRequest(
      event(),
      "resume_generate",
      APP_ARN,
    );
    expect(result).toMatchObject({
      callerArn: APP_ARN,
      operation: "resume_generate",
      requestId: REQUEST_ID,
      userId: USER_ID,
    });
    expect(() => auth.assertAuthorizedUserId(result, USER_ID)).not.toThrow();
  });

  it("rejects a request without AWS IAM caller context", () => {
    expect(() =>
      auth.authorizeTrustedAppRequest(
        event({ callerArn: null }),
        "resume_generate",
        APP_ARN,
      ),
    ).toThrow(auth.TrustedAppRequestError);
  });

  it("rejects an unapproved principal, operation, or body user", () => {
    expect(() =>
      auth.authorizeTrustedAppRequest(
        event({ callerArn: "arn:aws:iam::123456789012:user/attacker" }),
        "resume_generate",
        APP_ARN,
      ),
    ).toThrow(auth.TrustedAppRequestError);

    expect(() =>
      auth.authorizeTrustedAppRequest(
        event({ operation: "headshot_generate" }),
        "resume_generate",
        APP_ARN,
      ),
    ).toThrow(auth.TrustedAppRequestError);

    const request = auth.authorizeTrustedAppRequest(
      event(),
      "resume_generate",
      APP_ARN,
    );
    expect(() =>
      auth.assertAuthorizedUserId(
        request,
        "018f74ad-7d38-7c21-9a13-d4fd83325005",
      ),
    ).toThrow(auth.TrustedAppRequestError);
  });

  it("fails closed when the allowlist is not configured", () => {
    expect(() =>
      auth.authorizeTrustedAppRequest(event(), "resume_generate", ""),
    ).toThrow(auth.TrustedAppConfigurationError);
  });
});
