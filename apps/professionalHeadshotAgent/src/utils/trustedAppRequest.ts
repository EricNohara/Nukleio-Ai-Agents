import type { APIGatewayProxyEventV2 } from "aws-lambda";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TrustedAppRequest = {
  callerArn: string;
  operation: string;
  requestId: string;
  userId: string;
};

type IamAuthorizerContext = {
  userArn?: unknown;
};

export class TrustedAppRequestError extends Error {
  constructor() {
    super("The request was not authorized");
    this.name = "TrustedAppRequestError";
  }
}

export class TrustedAppConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrustedAppConfigurationError";
  }
}

function getHeader(
  event: APIGatewayProxyEventV2,
  expectedName: string,
): string | null {
  const match = Object.entries(event.headers ?? {}).find(
    ([name]) => name.toLowerCase() === expectedName,
  );
  return typeof match?.[1] === "string" ? match[1].trim() : null;
}

function getIamCallerArn(event: APIGatewayProxyEventV2): string | null {
  const requestContext = event.requestContext as typeof event.requestContext & {
    authorizer?: { iam?: IamAuthorizerContext };
  };
  const userArn = requestContext.authorizer?.iam?.userArn;
  return typeof userArn === "string" && userArn.trim()
    ? userArn.trim()
    : null;
}

function getAllowedCallerArns(configuredArns?: string): Set<string> {
  const value =
    configuredArns ?? process.env.NUKLEIO_APP_IAM_PRINCIPAL_ARNS?.trim();
  if (!value) {
    throw new TrustedAppConfigurationError(
      "Missing NUKLEIO_APP_IAM_PRINCIPAL_ARNS",
    );
  }

  const allowedArns = value
    .split(",")
    .map((arn) => arn.trim())
    .filter(Boolean);

  if (allowedArns.length === 0 || allowedArns.length > 10) {
    throw new TrustedAppConfigurationError(
      "NUKLEIO_APP_IAM_PRINCIPAL_ARNS must contain between 1 and 10 ARNs",
    );
  }

  return new Set(allowedArns);
}

export function authorizeTrustedAppRequest(
  event: APIGatewayProxyEventV2,
  expectedOperation: string,
  configuredArns?: string,
): TrustedAppRequest {
  if (event.requestContext.http.method !== "POST") {
    throw new TrustedAppRequestError();
  }

  const callerArn = getIamCallerArn(event);
  const allowedArns = getAllowedCallerArns(configuredArns);
  const operation = getHeader(event, "x-nukleio-operation");
  const requestId = getHeader(event, "x-nukleio-request-id");
  const userId = getHeader(event, "x-nukleio-user-id");

  if (
    !callerArn ||
    !allowedArns.has(callerArn) ||
    operation !== expectedOperation ||
    !requestId ||
    !UUID_PATTERN.test(requestId) ||
    !userId ||
    !UUID_PATTERN.test(userId)
  ) {
    throw new TrustedAppRequestError();
  }

  return { callerArn, operation, requestId, userId };
}

export function assertAuthorizedUserId(
  request: TrustedAppRequest,
  bodyUserId: string,
): void {
  if (request.userId !== bodyUserId) {
    throw new TrustedAppRequestError();
  }
}

