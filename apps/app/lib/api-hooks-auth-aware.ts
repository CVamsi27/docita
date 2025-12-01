import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { useAuth } from "./auth-context";
import { API_URL } from "./api";

// Re-export all types from api-hooks
export * from "./api-hooks";

/**
 * Custom hooks that are aware of auth state and won't query until authenticated
 */

/**
 * Use this version of useAPIQuery when you want queries to wait for auth initialization
 * This prevents 401 errors by not making requests until the user is authenticated
 */
export function useAuthAwareAPIQuery<T>(
  key: string[],
  endpoint: string,
  options?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
) {
  const { isLoading: authLoading, token } = useAuth();

  // Import the fetchAPI function indirectly
  const fetchAPI = async (): Promise<T> => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        if (typeof window !== "undefined") {
          localStorage.removeItem("docita_token");
          localStorage.removeItem("docita_user");
          window.location.href = "/login";
        }
        throw new Error("Session expired. Please log in again.");
      }

      const error = await response
        .json()
        .catch(() => ({ message: "An error occurred" }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  };

  return useQuery<T>({
    queryKey: key,
    queryFn: fetchAPI,
    // Don't run query until auth is loaded and user has a token
    enabled: !authLoading && !!token,
    ...options,
  });
}
