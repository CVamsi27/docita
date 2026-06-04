import {
  getErrorMessage,
  isAbortError,
  parseProblemDetailsFromJson,
} from "./api-error-body";
import { APIRequestError, ErrorCodes, getErrorCode } from "./errors";
import type { APIClientConfig } from "./types";
import { assertTyped } from "./typed-http-boundary";

type ErrorHandler = NonNullable<APIClientConfig["onError"]>;
type ResponseHandler = NonNullable<APIClientConfig["onResponse"]>;

export async function buildApiRequestError(
  response: Response,
): Promise<APIRequestError> {
  const errorData = await readErrorJson(response);
  const problem = parseProblemDetailsFromJson(errorData);
  const responseCode =
    problem.raw && typeof problem.raw["code"] === "string"
      ? problem.raw["code"]
      : undefined;
  return new APIRequestError(
    problem.detail ||
      problem.message ||
      response.statusText ||
      "Request failed",
    {
      status: response.status,
      statusText: response.statusText,
      code: responseCode ?? getErrorCode(response.status),
      ...(problem.raw ? { data: problem.raw } : {}),
      ...(problem.validationErrors
        ? { validationErrors: problem.validationErrors }
        : {}),
    },
  );
}

export async function readResponseData<T>(
  response: Response,
  onResponse: ResponseHandler | undefined,
): Promise<T> {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return assertTyped<T>({});
  }
  const data = onResponse
    ? await onResponse(await response.json())
    : await response.json();
  return assertTyped<T>(data);
}

export async function notifyApiError(
  onError: ErrorHandler | undefined,
  shouldNotifyGlobalError: boolean,
  error: APIRequestError,
): Promise<void> {
  if (onError && shouldNotifyGlobalError) await onError(error);
}

export async function handleFetchFailure(
  error: unknown,
  onError: ErrorHandler | undefined,
  shouldNotifyGlobalError: boolean,
): Promise<never> {
  if (error instanceof APIRequestError) throw error;
  const apiError = isAbortError(error)
    ? new APIRequestError("Request timeout", {
        isTimeout: true,
        code: ErrorCodes.TIMEOUT,
      })
    : new APIRequestError(getErrorMessage(error), {
        isNetworkError: true,
        code: ErrorCodes.NETWORK_ERROR,
      });
  await notifyApiError(onError, shouldNotifyGlobalError, apiError);
  throw apiError;
}

async function readErrorJson(
  response: Response,
): Promise<Record<string, unknown> | null> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
