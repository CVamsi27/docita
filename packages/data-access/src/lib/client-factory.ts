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

function toHeaderRecord(headers?: HeadersInit): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

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

  const inFlightGetRequests = new Map<string, Promise<unknown>>();

  async function request<T>(
    endpoint: string,
    options: RequestConfig = {},
  ): Promise<T> {
    const shouldAttachJsonContentType =
      !(options.body instanceof FormData) &&
      !hasHeader(defaultHeaders, "content-type") &&
      !hasHeader(options.headers, "content-type");

    let requestConfig: RequestConfig = {
      ...options,
      headers: {
        ...toHeaderRecord(defaultHeaders),
        ...toHeaderRecord(options.headers),
        ...(shouldAttachJsonContentType
          ? { "Content-Type": "application/json" }
          : {}),
      },
    };

    void getToken;

    if (validateRequest) {
      await validateRequest(endpoint, options);
    }

    if (onRequest) {
      requestConfig = await onRequest(requestConfig);
    }

    const url = buildURL(baseURL, endpoint, options.params);
    const requestTimeout = options.timeout ?? timeout;
    const requestRetries = options.retries ?? retries;
    const method = (requestConfig.method ?? "GET").toUpperCase();
    const shouldNotifyGlobalError = options.suppressGlobalErrorToast !== true;

    const dedupeKey =
      method === "GET"
        ? `${method}:${url}:${normalizeHeaders(requestConfig.headers)}`
        : null;

    if (dedupeKey) {
      const inFlight = inFlightGetRequests.get(dedupeKey);
      if (inFlight) {
        return assertTyped<Promise<T>>(inFlight);
      }
    }

    let csrfRetried = false;
    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      try {
        const response = await fetch(url, {
          ...requestConfig,
          headers: dedupeHeaders(requestConfig.headers),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (onFetchResponse) {
          onFetchResponse(response);
        }

        if (!response.ok) {
          const error = await buildApiRequestError(response);
          if (
            error.code === "INVALID_CSRF_TOKEN" &&
            !csrfRetried &&
            onRequest
          ) {
            csrfRetried = true;
            requestConfig = await onRequest(requestConfig);
            return makeRequest();
          }

          await notifyApiError(onError, shouldNotifyGlobalError, error);
          throw error;
        }

        return readResponseData<T>(response, onResponse);
      } catch (error) {
        clearTimeout(timeoutId);
        return handleFetchFailure(error, onError, shouldNotifyGlobalError);
      }
    };

    const requestPromise = executeWithRetry(
      makeRequest,
      requestRetries,
      retries,
    );

    if (!dedupeKey) {
      return requestPromise;
    }

    inFlightGetRequests.set(dedupeKey, requestPromise);

    try {
      return await requestPromise;
    } finally {
      inFlightGetRequests.delete(dedupeKey);
    }
  }

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

    request,

    async validate<T>(
      endpoint: string,
      schema: z.ZodType<T>,
      options?: RequestConfig,
    ): Promise<T> {
      const data = await request<T>(endpoint, options);
      const result = schema.safeParse(data);

      if (!result.success) {
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

      return result.data;
    },

    safeParse<T>(
      schema: z.ZodType<T>,
      data: Record<string, unknown>,
    ): T | undefined {
      const result = schema.safeParse(data);
      return result.success ? result.data : undefined;
    },

    async upload<T>(
      endpoint: string,
      files: File | File[],
      data?: Record<string, unknown>,
      options?: RequestConfig,
    ): Promise<T> {
      const formData = new FormData();

      const fileArray = Array.isArray(files) ? files : [files];
      fileArray.forEach((file, index) => {
        formData.append(
          fileArray.length > 1 ? `files[${index}]` : "file",
          file,
        );
      });

      if (data) {
        Object.entries(data).forEach(([key, value]) => {
          formData.append(
            key,
            typeof value === "object" ? JSON.stringify(value) : String(value),
          );
        });
      }

      const { headers, ...restOptions } = options || {};

      const response = await fetch(buildURL(baseURL, endpoint), {
        ...restOptions,
        method: "POST",
        credentials: "include",
        headers: dedupeHeaders({
          ...defaultHeaders,
          ...headers,
        }),
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const problem = parseProblemDetailsFromJson(errorData);
        const responseCode =
          problem.raw && typeof problem.raw["code"] === "string"
            ? problem.raw["code"]
            : undefined;
        throw new APIRequestError(
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

      return assertTyped<T>(await response.json());
    },
  };
}
