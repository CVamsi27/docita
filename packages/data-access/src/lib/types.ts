import type { z } from "zod";

export interface APIClientConfig {
  baseURL: string;
  getToken?: () => string | null;
  defaultHeaders?: Record<string, string>;
  timeout?: number;
  retries?: number;
  /**
   * Optional guard before the request is sent (e.g. restrict an app build to
   * specific API path prefixes). Runs after auth headers are attached.
   */
  validateRequest?: (
    endpoint: string,
    options: RequestConfig,
  ) => void | Promise<void>;
  onRequest?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  onResponse?: <T>(response: T) => T | Promise<T>;
  onError?: (error: APIError) => void | Promise<void>;
}

export interface RequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
  timeout?: number;
  retries?: number;
  skipAuth?: boolean;
  suppressGlobalErrorToast?: boolean;
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

export interface APIClient {
  get<T>(endpoint: string, options?: RequestConfig): Promise<T>;
  post<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestConfig,
  ): Promise<T>;
  put<T>(endpoint: string, body?: unknown, options?: RequestConfig): Promise<T>;
  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: RequestConfig,
  ): Promise<T>;
  delete<T>(endpoint: string, options?: RequestConfig): Promise<T>;
  request<T>(endpoint: string, options?: RequestConfig): Promise<T>;
  validate<T>(
    endpoint: string,
    schema: z.ZodType<T>,
    options?: RequestConfig,
  ): Promise<T>;
  safeParse<T>(
    schema: z.ZodType<T>,
    data: Record<string, unknown>,
  ): T | undefined;
  upload<T>(
    endpoint: string,
    files: File | File[],
    data?: Record<string, unknown>,
    options?: RequestConfig,
  ): Promise<T>;
}
