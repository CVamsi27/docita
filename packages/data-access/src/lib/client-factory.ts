import { z } from "zod";
import { APIRequestError, ErrorCodes, getErrorCode } from "./errors";
import { buildURL, normalizeHeaders } from "./request-helpers";
import { executeWithRetry } from "./retry";
import type { APIClient, APIClientConfig, RequestConfig } from "./types";

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

    if (!options.skipAuth && getToken) {
      const token = getToken();
      if (token) {
        requestConfig.headers = {
          ...requestConfig.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

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

    if (dedupeKey && inFlightGetRequests.has(dedupeKey)) {
      return inFlightGetRequests.get(dedupeKey) as Promise<T>;
    }

    const makeRequest = async (): Promise<T> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), requestTimeout);

      try {
        const response = await fetch(url, {
          ...requestConfig,
          credentials: "include",
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          let errorData: Record<string, unknown> | null = null;
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }

          const rfc7807 = errorData as {
            detail?: string;
            message?: string;
            validationErrors?: Record<string, string>;
          };

          const error = new APIRequestError(
            rfc7807?.detail ||
              rfc7807?.message ||
              response.statusText ||
              "Request failed",
            {
              status: response.status,
              statusText: response.statusText,
              code: getErrorCode(response.status),
              ...(errorData ? { data: errorData } : {}),
              ...(rfc7807?.validationErrors
                ? { validationErrors: rfc7807.validationErrors }
                : {}),
            },
          );

          if (onError && shouldNotifyGlobalError) {
            await onError(error);
          }

          throw error;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {} as T;
        }

        let data = await response.json();

        if (onResponse) {
          data = await onResponse(data);
        }

        return data as T;
      } catch (error) {
        clearTimeout(timeoutId);

        if (error instanceof APIRequestError) {
          throw error;
        }

        if ((error as Error).name === "AbortError") {
          const timeoutError = new APIRequestError("Request timeout", {
            isTimeout: true,
            code: ErrorCodes.TIMEOUT,
          });
          if (onError && shouldNotifyGlobalError) await onError(timeoutError);
          throw timeoutError;
        }

        const networkError = new APIRequestError(
          (error as Error).message || "Network error",
          {
            isNetworkError: true,
            code: ErrorCodes.NETWORK_ERROR,
          },
        );
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

    inFlightGetRequests.set(dedupeKey, requestPromise as Promise<unknown>);

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
      const authHeaders: Record<string, string> = {};

      if (!options?.skipAuth && getToken) {
        const token = getToken();
        if (token) {
          authHeaders["Authorization"] = `Bearer ${token}`;
        }
      }

      const response = await fetch(buildURL(baseURL, endpoint), {
        ...restOptions,
        method: "POST",
        credentials: "include",
        headers: {
          ...defaultHeaders,
          ...authHeaders,
          ...headers,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;
        const rfc7807 = errorData as {
          detail?: string;
          message?: string;
          validationErrors?: Record<string, string>;
        } | null;
        throw new APIRequestError(
          rfc7807?.detail ||
            rfc7807?.message ||
            response.statusText ||
            "Request failed",
          {
            status: response.status,
            statusText: response.statusText,
            code: getErrorCode(response.status),
            ...(errorData ? { data: errorData } : {}),
            ...(rfc7807?.validationErrors
              ? { validationErrors: rfc7807.validationErrors }
              : {}),
          },
        );
      }

      return response.json();
    },
  };
}
