import {
  APIRequestError,
  useAPIMutation as useAPIMutationBase,
  useAPIQuery as useAPIQueryBase,
  type RequestConfig,
  type UseAPIMutationOptions,
} from "@workspace/data-access";
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/react-query";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { getAppApiUrl } from "./api-config";
import { apiFetch } from "./api-client";
import { ApiError } from "@/lib/errors";

export { getAppApiUrl };
// React Query wrappers live in @workspace/data-access (transport-agnostic,
// fetcher injected via <DataAccessProvider>). The thin wrappers below pin
// TError to ApiError so the 30+ existing app hooks keep their familiar error
// type without rewrites. See docs/architecture/DATA_ACCESS_MIGRATION_PLAN.md.
type QueryKey = readonly (string | number | Record<string, unknown>)[];

export function useAPIQuery<T>(
  key: QueryKey,
  endpoint: string,
  options?: Omit<UseQueryOptions<T, ApiError>, "queryKey" | "queryFn">,
) {
  return useAPIQueryBase<T, ApiError>(key, endpoint, options);
}

export function useAPIMutation<TData, TVariables>(
  endpointOrFn: string | ((vars: TVariables) => string),
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: Omit<
    UseMutationOptions<TData, ApiError, TVariables>,
    "mutationFn"
  > &
    Pick<
      UseAPIMutationOptions<TData, TVariables, ApiError>,
      "invalidateKeys" | "body" | "suppressGlobalErrorToast"
    >,
) {
  return useAPIMutationBase<TData, TVariables, ApiError>(
    endpointOrFn,
    method,
    options,
  );
}




function toRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

export async function fetchAPI<T>(
  endpoint: string,
  options?: RequestConfig,
): Promise<T> {
  try {
    return await apiFetch<T>(endpoint, options);
  } catch (error) {
    if (error instanceof APIRequestError) {
      throw new ApiError(
        getUserFacingErrorMessage(error, {
          fallback:
            "Please review the information on this screen and try again",
        }),
        error.status ?? 500,
        error.code ?? "API_ERROR",
        toRecord(error.data ?? undefined) ?? undefined,
      );
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      getUserFacingErrorMessage(error, {
        fallback:
          "We could not load this right now. Please refresh or try again.",
        context: "load",
      }),
      500,
      "NETWORK_ERROR",
    );
  }
}
