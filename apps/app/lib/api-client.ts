import { toast } from "sonner"

/**
 * Configuration for API requests
 */
interface ApiRequestConfig extends RequestInit {
    retries?: number
    retryDelay?: number
    showErrorToast?: boolean
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public status?: number,
        public data?: unknown
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Get authentication token from localStorage
 */
const getAuthToken = (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('docita_token')
}

/**
 * Enhanced fetch with retry logic and error handling
 * 
 * @param url - API endpoint URL
 * @param config - Request configuration with retry options
 * @returns Promise with typed response
 * 
 * @example
 * const data = await apiFetch<Patient[]>('/patients')
 * const patient = await apiFetch<Patient>('/patients/123')
 */
export async function apiFetch<T = unknown>(
    url: string,
    config: ApiRequestConfig = {}
): Promise<T> {
    const {
        retries = 3,
        retryDelay = 1000,
        showErrorToast = true,
        ...fetchConfig
    } = config

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`

    // Add auth token if available
    const token = getAuthToken()
    const headers = new Headers(fetchConfig.headers)
    if (token && !headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`)
    }
    if (!headers.has('Content-Type') && fetchConfig.method !== 'GET') {
        headers.set('Content-Type', 'application/json')
    }

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await fetch(fullUrl, {
                ...fetchConfig,
                headers,
            })

            // Handle non-OK responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new ApiError(
                    errorData.message || `Request failed with status ${response.status}`,
                    response.status,
                    errorData
                )
            }

            // Parse JSON response
            const data = await response.json()
            return data as T

        } catch (error) {
            lastError = error as Error

            // Don't retry on client errors (4xx)
            if (error instanceof ApiError && error.status && error.status < 500) {
                break
            }

            // Retry on network errors or server errors (5xx)
            if (attempt < retries) {
                await sleep(retryDelay * (attempt + 1)) // Exponential backoff
                continue
            }
        }
    }

    // All retries failed
    const errorMessage = lastError?.message || 'An unexpected error occurred'

    if (showErrorToast) {
        toast.error(errorMessage)
    }

    throw lastError || new Error(errorMessage)
}

/**
 * Convenience methods for common HTTP verbs
 */
export const api = {
    get: <T = unknown>(url: string, config?: ApiRequestConfig) =>
        apiFetch<T>(url, { ...config, method: 'GET' }),

    post: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
        apiFetch<T>(url, {
            ...config,
            method: 'POST',
            body: data ? JSON.stringify(data) : undefined,
        }),

    put: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
        apiFetch<T>(url, {
            ...config,
            method: 'PUT',
            body: data ? JSON.stringify(data) : undefined,
        }),

    patch: <T = unknown>(url: string, data?: unknown, config?: ApiRequestConfig) =>
        apiFetch<T>(url, {
            ...config,
            method: 'PATCH',
            body: data ? JSON.stringify(data) : undefined,
        }),

    delete: <T = unknown>(url: string, config?: ApiRequestConfig) =>
        apiFetch<T>(url, { ...config, method: 'DELETE' }),
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown, fallbackMessage = 'An error occurred'): string {
    if (error instanceof ApiError) {
        return error.message
    }

    if (error instanceof Error) {
        return error.message
    }

    return fallbackMessage
}
