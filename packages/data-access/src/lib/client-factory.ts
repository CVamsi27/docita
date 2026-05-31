import { z } from "zod";
import {
  getErrorMessage,
  isAbortError,
  parseProblemDetailsFromJson,
} from "./api-error-body";
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

    // Authorization: Bearer is intentionally NOT attached here.
    // Same-origin callers ride the httpOnly access_token cookie via
    // `credentials: "include"` below; CSRF protection on mutating
    // methods is provided by the X-XSRF-TOKEN header (see onRequest).
    // Non-cookie channels (e.g. wss:// socket auth) attach the token
    // themselves outside this client.
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
          // Dedupe case-variant header keys (e.g. a manual `X-XSRF-TOKEN` plus
          // the interceptor's `x-xsrf-token`) so `fetch` cannot combine them
          // into a doubled value that fails the backend CSRF check.
          headers: dedupeHeaders(requestConfig.headers),
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Capture refreshed session/CSRF headers from EVERY response, including
        // error responses. The API mints a fresh X-CSRF-Token on each reply, so
        // a 403 INVALID_CSRF_TOKEN still carries the token the client needs to
        // recover. Capturing only on response.ok meant the first mutating call
        // on a route that never warmed the token (e.g. onboarding "Skip for
        // now") could fail CSRF and never pick the new token up — looping.
        if (onFetchResponse) {
          onFetchResponse(response);
        }

        if (!response.ok) {
          let errorData: Record<string, unknown> | null = null;
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }

          const problem = parseProblemDetailsFromJson(errorData);

          const responseCode =
            problem.raw && typeof problem.raw["code"] === "string"
              ? problem.raw["code"]
              : undefined;

          const error = new APIRequestError(
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

          // One-shot self-heal for a CSRF token that was never warmed (e.g. the
          // first mutating call on a pre-clinic onboarding route). The API
          // re-issues a fresh token on this 403, captured above via
          // onFetchResponse; re-run onRequest to echo it and replay once.
          if (error.code === "INVALID_CSRF_TOKEN" && !csrfRetried && onRequest) {
            csrfRetried = true;
            requestConfig = await onRequest(requestConfig);
            return makeRequest();
          }

          if (onError && shouldNotifyGlobalError) {
            await onError(error);
          }

          throw error;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return assertTyped<T>({});
        }

        let data: unknown = await response.json();

        if (onResponse) {
          data = await onResponse(data);
        }

        return assertTyped<T>(data);
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof APIRequestError) {
          throw error;
        }

        if (isAbortError(error)) {
          const timeoutError = new APIRequestError("Request timeout", {
            isTimeout: true,
            code: ErrorCodes.TIMEOUT,
          });
          if (onError && shouldNotifyGlobalError) await onError(timeoutError);
          throw timeoutError;
        }

        const networkError = new APIRequestError(getErrorMessage(error), {
          isNetworkError: true,
          code: ErrorCodes.NETWORK_ERROR,
        });
        if (onError && shouldNotifyGlobalError) await onError(networkError);
        throw networkError;
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
      // Authorization: Bearer intentionally omitted — see request() above.
      // The httpOnly access_token cookie rides via credentials: "include".

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
