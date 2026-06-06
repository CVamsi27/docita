import { z } from "zod";
import { parseProblemDetailsFromJson } from "./api-error-body";
import {
  buildApiRequestError,
  handleFetchFailure,
  notifyApiError,
  readResponseData,
} from "./client-response-handler";
import { APIRequestError, ErrorCodes, getErrorCode } from "./errors";
import { buildURL, dedupeHeaders, normalizeHeaders } from "./request-helpers";
import { executeWithRetry } from "./retry";
import type { APIClient, APIClientConfig, RequestConfig } from "./types";
import { assertTyped } from "./typed-http-boundary";

type ClientRuntime = Omit<
  APIClientConfig,
  "defaultHeaders" | "timeout" | "retries"
> & {
  defaultHeaders: HeadersInit;
  timeout: number;
  retries: number;
  inFlightGetRequests: Map<string, Promise<unknown>>;
};

interface PreparedClientRequest {
  url: string;
  method: string;
  requestConfig: RequestConfig;
  requestTimeout: number;
  requestRetries: number;
  shouldNotifyGlobalError: boolean;
  dedupeKey: string | null;
}

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) return Object.fromEntries(headers.entries());

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key, String(value)]),
  );
}

function hasHeader(headers: HeadersInit | undefined, name: string): boolean {
  const target = name.toLowerCase();
  return Object.keys(toHeaderRecord(headers)).some(
    (key) => key.toLowerCase() === target,
  );
}

export function createAPIClient(config: APIClientConfig): APIClient {
  const runtime = createClientRuntime(config);
  const request = <T>(
    endpoint: string,
    options: RequestConfig = {},
  ): Promise<T> => executeClientRequest<T>(runtime, endpoint, options);

  return {
    ...createHttpMethods(request),
    request,
    validate: (endpoint, schema, options) =>
      validateClientResponse(request, endpoint, schema, options),
    safeParse: parseWithSchema,
    upload: (endpoint, files, data, options) =>
      uploadClientFiles(runtime, endpoint, files, data, options),
  };
}

function createClientRuntime(config: APIClientConfig): ClientRuntime {
  const {
    baseURL,
    getToken,
    defaultHeaders = {},
    timeout = 30000,
    retries = 0,
    validateRequest,
    onRequest,
    onFetchResponse,
    onResponse,
    onError,
  } = config;

  return {
    baseURL,
    getToken,
    defaultHeaders,
    timeout,
    retries,
    validateRequest,
    onRequest,
    onFetchResponse,
    onResponse,
    onError,
    inFlightGetRequests: new Map<string, Promise<unknown>>(),
  };
}

async function executeClientRequest<T>(
  runtime: ClientRuntime,
  endpoint: string,
  options: RequestConfig,
): Promise<T> {
  const prepared = await prepareClientRequest(runtime, endpoint, options);
  if (prepared.dedupeKey) {
    const inFlight = runtime.inFlightGetRequests.get(prepared.dedupeKey);
    if (inFlight) return assertTyped<Promise<T>>(inFlight);
  }

  const requestPromise = executeWithRetry(
    createFetchAttempt<T>(runtime, prepared),
    prepared.requestRetries,
    runtime.retries,
  );
  if (!prepared.dedupeKey) return requestPromise;

  runtime.inFlightGetRequests.set(prepared.dedupeKey, requestPromise);
  try {
    return await requestPromise;
  } finally {
    runtime.inFlightGetRequests.delete(prepared.dedupeKey);
  }
}

async function prepareClientRequest(
  runtime: ClientRuntime,
  endpoint: string,
  options: RequestConfig,
): Promise<PreparedClientRequest> {
  const requestConfig = await buildRequestConfig(runtime, endpoint, options);
  const url = buildURL(runtime.baseURL, endpoint, options.params);
  const method = (requestConfig.method ?? "GET").toUpperCase();
  const dedupeKey =
    method === "GET"
      ? `${method}:${url}:${normalizeHeaders(requestConfig.headers)}`
      : null;

  return {
    url,
    method,
    requestConfig,
    requestTimeout: options.timeout ?? runtime.timeout,
    requestRetries: options.retries ?? runtime.retries,
    shouldNotifyGlobalError: options.suppressGlobalErrorToast !== true,
    dedupeKey,
  };
}

async function buildRequestConfig(
  runtime: ClientRuntime,
  endpoint: string,
  options: RequestConfig,
): Promise<RequestConfig> {
  const shouldAttachJsonContentType =
    !(options.body instanceof FormData) &&
    !hasHeader(runtime.defaultHeaders, "content-type") &&
    !hasHeader(options.headers, "content-type");
  let requestConfig: RequestConfig = {
    ...options,
    headers: {
      ...toHeaderRecord(runtime.defaultHeaders),
      ...toHeaderRecord(options.headers),
      ...(shouldAttachJsonContentType ? { "Content-Type": "application/json" } : {}),
    },
  };

  void runtime.getToken;
  if (runtime.validateRequest) await runtime.validateRequest(endpoint, options);
  if (runtime.onRequest) requestConfig = await runtime.onRequest(requestConfig);
  return requestConfig;
}

function createFetchAttempt<T>(
  runtime: ClientRuntime,
  prepared: PreparedClientRequest,
): () => Promise<T> {
  let csrfRetried = false;
  return async function fetchAttempt(): Promise<T> {
    const result = await fetchOnce<T>(runtime, prepared);
    if (
      result instanceof APIRequestError &&
      result.code === "INVALID_CSRF_TOKEN" &&
      !csrfRetried &&
      runtime.onRequest
    ) {
      csrfRetried = true;
      prepared.requestConfig = await runtime.onRequest(prepared.requestConfig);
      return fetchAttempt();
    }
    if (result instanceof APIRequestError) {
      await notifyApiError(
        runtime.onError,
        prepared.shouldNotifyGlobalError,
        result,
      );
      throw result;
    }
    return result;
  };
}

async function fetchOnce<T>(
  runtime: ClientRuntime,
  prepared: PreparedClientRequest,
): Promise<T | APIRequestError> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), prepared.requestTimeout);

  try {
    const response = await fetch(prepared.url, {
      ...prepared.requestConfig,
      headers: dedupeHeaders(prepared.requestConfig.headers),
      credentials: "include",
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    runtime.onFetchResponse?.(response);
    if (!response.ok) return buildApiRequestError(response);
    return readResponseData<T>(response, runtime.onResponse);
  } catch (error) {
    clearTimeout(timeoutId);
    return handleFetchFailure(
      error,
      runtime.onError,
      prepared.shouldNotifyGlobalError,
    );
  }
}

function createHttpMethods(
  request: <T>(endpoint: string, options?: RequestConfig) => Promise<T>,
) {
  return {
    get<T>(endpoint: string, options?: RequestConfig): Promise<T> {
      return request<T>(endpoint, { ...options, method: "GET" });
    },

    post<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      const serializedBody = body ? JSON.stringify(body) : null;
      return request<T>(endpoint, {
        ...options,
        method: "POST",
        ...(serializedBody ? { body: serializedBody } : {}),
      });
    },

    put<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      const serializedBody = body ? JSON.stringify(body) : null;
      return request<T>(endpoint, {
        ...options,
        method: "PUT",
        ...(serializedBody ? { body: serializedBody } : {}),
      });
    },

    patch<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      const serializedBody = body ? JSON.stringify(body) : null;
      return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        ...(serializedBody ? { body: serializedBody } : {}),
      });
    },

    delete<T>(endpoint: string, options?: RequestConfig): Promise<T> {
      return request<T>(endpoint, { ...options, method: "DELETE" });
    },
  };
}

async function validateClientResponse<T>(
  request: <R>(endpoint: string, options?: RequestConfig) => Promise<R>,
  endpoint: string,
  schema: z.ZodType<T>,
  options?: RequestConfig,
): Promise<T> {
  const data = await request<T>(endpoint, options);
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const isDev = process.env["NODE_ENV"] === "development";
  throw new APIRequestError(
    isDev
      ? `Response validation failed: ${result.error.message}`
      : "Response validation failed",
    {
      code: ErrorCodes.VALIDATION_ERROR,
      ...(isDev ? { data: result.error.format() } : {}),
    },
  );
}

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  data: Record<string, unknown>,
): T | undefined {
  const result = schema.safeParse(data);
  return result.success ? result.data : undefined;
}

async function uploadClientFiles<T>(
  runtime: ClientRuntime,
  endpoint: string,
  files: File | File[],
  data?: Record<string, unknown>,
  options?: RequestConfig,
): Promise<T> {
  const formData = buildUploadFormData(files, data);
  const { headers, ...restOptions } = options || {};
  const response = await fetch(buildURL(runtime.baseURL, endpoint), {
    ...restOptions,
    method: "POST",
    credentials: "include",
    headers: dedupeHeaders({ ...runtime.defaultHeaders, ...headers }),
    body: formData,
  });
  if (!response.ok) throw await buildUploadRequestError(response);
  return assertTyped<T>(await response.json());
}

function buildUploadFormData(
  files: File | File[],
  data?: Record<string, unknown>,
): FormData {
  const formData = new FormData();
  const fileArray = Array.isArray(files) ? files : [files];
  fileArray.forEach((file, index) => {
    formData.append(fileArray.length > 1 ? `files[${index}]` : "file", file);
  });
  if (data) {
    Object.entries(data).forEach(([key, value]) => {
      formData.append(
        key,
        typeof value === "object" ? JSON.stringify(value) : String(value),
      );
    });
  }
  return formData;
}

async function buildUploadRequestError(response: Response): Promise<APIRequestError> {
  const errorData = await response.json().catch(() => null);
  const problem = parseProblemDetailsFromJson(errorData);
  const responseCode =
    problem.raw && typeof problem.raw["code"] === "string"
      ? problem.raw["code"]
      : undefined;
  return new APIRequestError(
    problem.detail || problem.message || response.statusText || "Request failed",
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
