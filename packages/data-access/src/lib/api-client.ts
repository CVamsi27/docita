import { z } from "zod";

/**
 * Shared API Client Factory
 *
 * Provides a configurable, type-safe API client that can be used
 * across all frontend apps (app, admin, landing).
 *
 * Features:
 * - Configurable base URL
 * - Automatic token injection
 * - Request/response interceptors
 * - Error handling with custom error types
 * - Retry logic for failed requests
 * - Request cancellation support
 */

// =============================================================================
// Types
// =============================================================================

export interface APIClientConfig {
  /** Base URL for all API requests */
  baseURL: string;
  /** Function to get auth token */
  getToken?: () => string | null;
  /** Default request headers */
  defaultHeaders?: Record<string, string>;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Number of retry attempts for failed requests */
  retries?: number;
  /** Request interceptor */
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  /** Response interceptor */
  onResponse?: <T>(response: T) => T | Promise<T>;
  /** Error interceptor */
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
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

// =============================================================================
// Error Classes
// =============================================================================

export class APIRequestError extends Error implements APIError {
  status?: number;
  statusText?: string;
  code?: string;
  data?: Record<string, unknown>;
  isNetworkError?: boolean;
  isTimeout?: boolean;

  constructor(message: string, options?: Partial<APIError>) {
    super(message);
    this.name = "APIRequestError";
    Object.assign(this, options);
  }
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  SERVER_ERROR: "SERVER_ERROR",
} as const;

// =============================================================================
// API Client Factory
// =============================================================================

/**
 * Create a configured API client instance
 *
 * @example
 * ```typescript
 * const api = createAPIClient({
 *   baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
 *   getToken: () => localStorage.getItem('auth_token'),
 *   onError: (error) => {
 *     if (error.status === 401) {
 *       // Redirect to login
 *     }
 *   },
 * });
 *
 * // Use the client
 * const patients = await api.get<Patient[]>('/patients');
 * const patient = await api.post<Patient>('/patients', { name: 'John' });
 * ```
 */
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

  /**
   * Build URL with query parameters
   */
  function buildURL(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined | null>,
  ): string {
    const normalizedEndpoint = endpoint.startsWith("/")
      ? endpoint.substring(1)
      : endpoint;
    const url = new URL(
      normalizedEndpoint,
      baseURL.endsWith("/") ? baseURL : `${baseURL}/`,
    );

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  /**
   * Execute request with retries
   */
  async function executeWithRetry<T>(
    fn: () => Promise<T>,
    retriesLeft: number,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retriesLeft > 0 && (error as APIError).isNetworkError) {
        // Exponential backoff
        const delay = Math.pow(2, retries - retriesLeft) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return executeWithRetry(fn, retriesLeft - 1);
      }
      throw error;
    }
  }

  /**
   * Core request function
   */
  async function request<T>(
    endpoint: string,
    options: RequestConfig = {},
  ): Promise<T> {
    let requestConfig: RequestConfig = {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...defaultHeaders,
        ...options.headers,
      },
    };

    // Add auth token
    if (!options.skipAuth && getToken) {
      const token = getToken();
      if (token) {
        requestConfig.headers = {
          ...requestConfig.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    // Apply request interceptor
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
          let errorData: Record<string, unknown>;
          try {
            errorData = await response.json();
          } catch {
            errorData = null;
          }

          const error = new APIRequestError(
            (errorData as { message?: string })?.message ||
              response.statusText ||
              "Request failed",
            {
              status: response.status,
              statusText: response.statusText,
              data: errorData,
              code: getErrorCode(response.status),
            },
          );

          if (onError) {
            await onError(error);
          }

          throw error;
        }

        // Handle empty responses
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          return {} as T;
        }

        let data = await response.json();

        // Apply response interceptor
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

  /**
   * Map HTTP status to error code
   */
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

  // Return the API client interface
  return {
    /**
     * GET request
     */
    get<T>(endpoint: string, options?: RequestConfig): Promise<T> {
      return request<T>(endpoint, { ...options, method: "GET" });
    },

    /**
     * POST request
     */
    post<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      return request<T>(endpoint, {
        ...options,
        method: "POST",
        body: body ? JSON.stringify(body) : (null as any),
      });
    },

    /**
     * PUT request
     */
    put<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      return request<T>(endpoint, {
        ...options,
        method: "PUT",
        body: body ? JSON.stringify(body) : (null as any),
      });
    },

    /**
     * PATCH request
     */
    patch<T>(
      endpoint: string,
      body?: unknown,
      options?: RequestConfig,
    ): Promise<T> {
      return request<T>(endpoint, {
        ...options,
        method: "PATCH",
        body: body ? JSON.stringify(body) : (null as any),
      });
    },

    /**
     * DELETE request
     */
    delete<T>(endpoint: string, options?: RequestConfig): Promise<T> {
      return request<T>(endpoint, { ...options, method: "DELETE" });
    },

    /**
     * Raw request with custom config
     */
    request,

    /**
     * Request with Zod validation
     */
    async validate<T>(
      endpoint: string,
      schema: z.ZodType<T>,
      options?: RequestConfig,
    ): Promise<T> {
      const data = await request<T>(endpoint, options);
      const result = schema.safeParse(data);

      if (!result.success) {
        // In development, throw for awareness; in production, return raw data
        if (process.env["NODE_ENV"] === "development") {
          console.error(
            "API response validation failed:",
            result.error.format(),
          );
          throw new APIRequestError(
            `Response validation failed: ${result.error.message}`,
            {
              code: ErrorCodes.VALIDATION_ERROR,
              data: result.error.format(),
            },
          );
        }
        return data as T;
      }

      return result.data;
    },

    /**
     * Safe parse helper
     */
    safeParse<T>(schema: z.ZodType<T>, data: Record<string, unknown>): T | undefined {
      const result = schema.safeParse(data);
      return result.success ? result.data : undefined;
    },

    /**
     * Upload file(s)
     */
    async upload<T>(
      endpoint: string,
      files: File | File[],
      data?: Record<string, any>,
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

      // Don't set Content-Type - let browser set it with boundary
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

// =============================================================================
// CRUD Resource Helper
// =============================================================================

/**
 * Create CRUD methods for a resource
 *
 * @example
 * ```typescript
 * const api = createAPIClient({ baseURL: '...' });
 * const patientsResource = createCRUDResource<Patient>(api, '/patients');
 *
 * const patients = await patientsResource.getAll();
 * const patient = await patientsResource.getOne('123');
 * const newPatient = await patientsResource.create({ name: 'John' });
 * ```
 */
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

// =============================================================================
// Default Singleton (for convenience)
// =============================================================================

let defaultClient: ReturnType<typeof createAPIClient> | null = null;

/**
 * Get or create the default API client
 * Call this once at app initialization with config, then without to get the instance
 */
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
