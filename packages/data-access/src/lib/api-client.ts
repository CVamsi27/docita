import { z } from "zod";

export interface APIClientConfig {
  
  baseURL: string;
  
  getToken?: () => string | null;
  
  defaultHeaders?: Record<string, string>;
  
  timeout?: number;
  
  retries?: number;
  
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  
  onResponse?: <T>(response: T) => T | Promise<T>;
  
  onError?: (error: APIError) => void | Promise<void>;
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
}

export interface APIError extends Error {
  status?: number;
  statusText?: string;
  code?: string;
  data?: Record<string, unknown>;
  
  validationErrors?: Record<string, string>;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

export class APIRequestError extends Error implements APIError {
  status?: number;
  statusText?: string;
  code?: string;
  data?: Record<string, unknown>;
  
  validationErrors?: Record<string, string>;
  isNetworkError?: boolean;
  isTimeout?: boolean;

  constructor(message: string, options?: Partial<APIError>) {
    super(message);
    this.name = "APIRequestError";
    Object.assign(this, options);
  }

  
  get hasFieldErrors(): boolean {
    return (
      !!this.validationErrors && Object.keys(this.validationErrors).length > 0
    );
  }
}

export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

export function createAPIClient(config: APIClientConfig) {
  const {
    baseURL,
    getToken,
    defaultHeaders = {},
    timeout = 30000,
    retries = 0,
    onRequest,
    onResponse,
    onError,
  } = config;

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

  
  function buildURL(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint.substring(1)
      : endpoint;
    const resolvedBase = (() => {
      const base = baseURL.endsWith("/") ? baseURL : `${baseURL}/`;
      if (base.startsWith("http://") || base.startsWith("https://")) {
        return base;
      }
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost:3000";
      return `${origin}${base.startsWith("/") ? "" : "/"}${base}`;
    })();
    const url = new URL(normalizedEndpoint, resolvedBase);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  
  async function executeWithRetry<T>(
    fn: () => Promise<T>,
    retriesLeft: number,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retriesLeft > 0 && (error as APIError).isNetworkError) {

        const delay = Math.pow(2, retries - retriesLeft) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeWithRetry(fn, retriesLeft - 1);
      }
      throw error;
    }
  }

  
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

    if (onRequest) {
      requestConfig = await onRequest(requestConfig);
    }

    const url = buildURL(endpoint, options.params);
    const requestTimeout = options.timeout ?? timeout;
    const requestRetries = options.retries ?? retries;

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

          if (onError) {
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
          if (onError) await onError(timeoutError);
          throw timeoutError;
        }

        const networkError = new APIRequestError(
          (error as Error).message || "Network error",
          {
            isNetworkError: true,
            code: ErrorCodes.NETWORK_ERROR,
          },
        );
        if (onError) await onError(networkError);
        throw networkError;
      }
    };

    return executeWithRetry(makeRequest, requestRetries);
  }

  
  function getErrorCode(status: number): string {
    switch (status) {
      case 401:
        return ErrorCodes.UNAUTHORIZED;
      case 403:
        return ErrorCodes.FORBIDDEN;
      case 404:
        return ErrorCodes.NOT_FOUND;
      case 400:
      case 422:
        return ErrorCodes.VALIDATION_ERROR;
      default:
        return status >= 500 ? ErrorCodes.SERVER_ERROR : "UNKNOWN_ERROR";
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
      return request<T>(endpoint, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : null,
      });
    },

    
    put<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      return request<T>(endpoint, {
        ...options,
        method: "PUT",
        body: body ? JSON.stringify(body) : null,
      });
    },

    
    patch<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        body: body ? JSON.stringify(body) : null,
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

      const response = await fetch(buildURL(endpoint), {
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
        const errorData = await response.json().catch(() => null);
        throw new APIRequestError(errorData?.message || response.statusText, {
          status: response.status,
          data: errorData,
        });
      }

      return response.json();
    },
  };
}

export function createCRUDResource<T extends { id?: string }>(
  client: ReturnType<typeof createAPIClient>,
  basePath: string,
) {
  return {
    getAll(
      params?: Record<string, string | number | boolean | undefined | null>,
    ): Promise<T[] | PaginatedResponse<T>> {
      return client.get(basePath, {
        params: params as Record<
          string,
          string | number | boolean | undefined | null
        >,
      });
    },

    getOne(id: string): Promise<T> {
      return client.get(`${basePath}/${id}`);
    },

    create(data: Omit<T, "id" | "createdAt" | "updatedAt">): Promise<T> {
      return client.post(basePath, data);
    },

    update(
      id: string,
      data: Partial<Omit<T, "id" | "createdAt" | "updatedAt">>,
    ): Promise<T> {
      return client.patch(`${basePath}/${id}`, data);
    },

    delete(id: string): Promise<void> {
      return client.delete(`${basePath}/${id}`);
    },
  };
}

let defaultClient: ReturnType<typeof createAPIClient> | null = null;

export function getAPIClient(
  config?: APIClientConfig,
): ReturnType<typeof createAPIClient> {
  if (config) {
    defaultClient = createAPIClient(config);
  }

  if (!defaultClient) {
    throw new Error(
      "API client not initialized. Call getAPIClient(config) first.",
    );
  }

  return defaultClient;
}
