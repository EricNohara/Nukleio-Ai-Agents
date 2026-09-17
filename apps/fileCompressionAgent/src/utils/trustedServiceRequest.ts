import type { APIGatewayProxyEventV2 } from "aws-lambda";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type IamAuthorizerContext = { userArn?: unknown };

export type TrustedServiceRequest = {
  callerArn: string;
  requestId: string;
};

export class TrustedServiceRequestError extends Error {
  constructor() {
    super("The request was not authorized");
    this.name = "TrustedServiceRequestError";
  }
}

export class TrustedServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustedServiceConfigurationError";
  }
}

function getHeader(event: APIGatewayProxyEventV2, expectedName: string): string | null {
  const match = Object.entries(event.headers ?? {}).find(
    ([name]) => name.toLowerCase() === expectedName,
  );
  return typeof match?.[1] === "string" ? match[1].trim() : null;
}

function getCallerArn(event: APIGatewayProxyEventV2): string | null {
  const context = event.requestContext as typeof event.requestContext & {
    authorizer?: { iam?: IamAuthorizerContext };
  };
  const userArn = context.authorizer?.iam?.userArn;
  return typeof userArn === "string" && userArn.trim() ? userArn.trim() : null;
}

function allowedCallerArns(): Set<string> {
  const configured = process.env.NUKLEIO_COMPRESSION_CALLER_ARNS?.trim();
  if (!configured) {
    throw new TrustedServiceConfigurationError(
      "Missing NUKLEIO_COMPRESSION_CALLER_ARNS",
    );
  }
  const arns = configured.split(",").map((arn) => arn.trim()).filter(Boolean);
  if (arns.length === 0 || arns.length > 10) {
    throw new TrustedServiceConfigurationError(
      "NUKLEIO_COMPRESSION_CALLER_ARNS must contain between 1 and 10 ARNs",
    );
  }
  return new Set(arns);
}

export function authorizeTrustedServiceRequest(
  event: APIGatewayProxyEventV2,
  expectedOperation: string,
): TrustedServiceRequest {
  if (event.requestContext.http.method !== "POST") {
    throw new TrustedServiceRequestError();
  }

  const callerArn = getCallerArn(event);
  const requestId = getHeader(event, "x-nukleio-request-id");
  const operation = getHeader(event, "x-nukleio-operation");
  if (
    !callerArn ||
    !allowedCallerArns().has(callerArn) ||
    operation !== expectedOperation ||
    !requestId ||
    !UUID_PATTERN.test(requestId)
  ) {
    throw new TrustedServiceRequestError();
  }
  return { callerArn, requestId };
}
