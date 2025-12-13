/**
 * Generic Hook Factory for React Query
 *
 * Creates typed CRUD hooks for any entity with consistent patterns.
 * Use this to quickly create hooks for new features.
 */

import {
  useMutation,
  type UseMutationOptions,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./api-client";
import type { PaginatedResponse } from "@workspace/types";
import { toast } from "sonner";

/**
 * Configuration for entity hooks
 */
interface EntityConfig<T> {
  /** Base endpoint (e.g., '/patients') */
  endpoint: string;
  /** Query key prefix (e.g., 'patients') */
  queryKey: string;
  /** Optional transform for list response */
  transformList?: (data: unknown) => PaginatedResponse<T>;
  /** Optional transform for single entity response */
  transformOne?: (data: unknown) => T;
}

/**
 * Options for list query
 */
interface ListOptions {
  limit?: number;
  cursor?: string;
  search?: string;
  enabled?: boolean;
}

/**
 * Create a complete set of CRUD hooks for an entity.
 *
 * @example
 * ```typescript
 * const patientHooks = createEntityHooks<Patient>({
 *   endpoint: '/patients',
 *   queryKey: 'patients',
 * });
 *
 * // In component:
 * const { data, isLoading } = patientHooks.useList({ search: 'John' });
 * const { data: patient } = patientHooks.useOne('patient-id');
 * const { mutate: createPatient } = patientHooks.useCreate();
 * const { mutate: updatePatient } = patientHooks.useUpdate('patient-id');
 * const { mutate: deletePatient } = patientHooks.useDelete('patient-id');
 * ```
 */
export function createEntityHooks<
  T,
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>,
>(config: EntityConfig<T>) {
  const { endpoint, queryKey, transformList, transformOne } = config;

  return {
    /**
     * Hook to fetch a paginated list of entities
     */
    useList: (
      options?: ListOptions,
      queryOptions?: Omit<
        UseQueryOptions<PaginatedResponse<T>>,
        "queryKey" | "queryFn"
      >,
    ) => {
      const searchParams = new URLSearchParams();
      if (options?.limit) searchParams.set("limit", String(options.limit));
      if (options?.cursor) searchParams.set("cursor", options.cursor);
      if (options?.search) searchParams.set("search", options.search);
      const query = searchParams.toString();

      return useQuery<PaginatedResponse<T>>({
        queryKey: [queryKey, "list", options],
        queryFn: async () => {
          const data = await api.get(`${endpoint}${query ? `?${query}` : ""}`);
          return transformList
            ? transformList(data)
            : (data as PaginatedResponse<T>);
        },
        enabled: options?.enabled !== false,
        ...queryOptions,
      });
    },

    /**
     * Hook to fetch a single entity by ID
     */
    useOne: (
      id: string | undefined,
      queryOptions?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
    ) => {
      return useQuery<T>({
        queryKey: [queryKey, "detail", id],
        queryFn: async () => {
          const data = await api.get(`${endpoint}/${id}`);
          return transformOne ? transformOne(data) : (data as T);
        },
        enabled: !!id && queryOptions?.enabled !== false,
        ...queryOptions,
      });
    },

    /**
     * Hook to create a new entity
     */
    useCreate: (
      mutationOptions?: UseMutationOptions<T, Error, CreateInput>,
    ) => {
      const queryClient = useQueryClient();

      return useMutation<T, Error, CreateInput>({
        mutationFn: async (_data) => {
          const result = await api.post<T>(endpoint, _data);
          return result;
        },
        onSuccess: (_data) => {
          // Invalidate list queries
          queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
          toast.success("Created successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
        ...mutationOptions,
      });
    },

    /**
     * Hook to update an entity
     */
    useUpdate: (
      id: string,
      mutationOptions?: UseMutationOptions<T, Error, UpdateInput>,
    ) => {
      const queryClient = useQueryClient();

      return useMutation<T, Error, UpdateInput>({
        mutationFn: async (data) => {
          const result = await api.patch<T>(`${endpoint}/${id}`, data);
          return result;
        },
        onSuccess: () => {
          // Invalidate both list and detail queries
          queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
          queryClient.invalidateQueries({ queryKey: [queryKey, "detail", id] });
          toast.success("Updated successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
        ...mutationOptions,
      });
    },

    /**
     * Hook to delete an entity
     */
    useDelete: (
      id: string,
      mutationOptions?: UseMutationOptions<void, Error, void>,
    ) => {
      const queryClient = useQueryClient();

      return useMutation<void, Error, void>({
        mutationFn: async () => {
          await api.delete(`${endpoint}/${id}`);
        },
        onSuccess: () => {
          // Invalidate list queries
          queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
          // Remove from cache
          queryClient.removeQueries({ queryKey: [queryKey, "detail", id] });
          toast.success("Deleted successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
        ...mutationOptions,
      });
    },

    /**
     * Get query key for this entity (useful for manual invalidation)
     */
    getQueryKey: {
      list: (options?: ListOptions) => [queryKey, "list", options] as const,
      detail: (id: string) => [queryKey, "detail", id] as const,
    },
  };
}

/**
 * Generic hook for fetching any entity type
 *
 * @example
 * ```typescript
 * const { data, isLoading } = useEntity<Patient[]>({
 *   queryKey: ['patients', 'recent'],
 *   endpoint: '/patients?limit=5',
 * });
 * ```
 */
export function useEntity<T>(config: {
  queryKey: string[];
  endpoint: string;
  enabled?: boolean;
  staleTime?: number;
  transform?: (data: unknown) => T;
}) {
  const {
    queryKey: key,
    endpoint,
    enabled = true,
    staleTime,
    transform,
  } = config;

  return useQuery<T>({
    queryKey: key,
    queryFn: async () => {
      const data = await api.get(endpoint);
      return transform ? transform(data) : (data as T);
    },
    enabled,
    staleTime,
  });
}

/**
 * Generic mutation hook
 *
 * @example
 * ```typescript
 * const { mutate } = useEntityMutation<Patient, CreatePatientInput>({
 *   endpoint: '/patients',
 *   method: 'POST',
 *   invalidateKeys: [['patients', 'list']],
 * });
 * ```
 */
export function useEntityMutation<TData, TVariables = unknown>(config: {
  endpoint: string | ((variables: TVariables) => string);
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  invalidateKeys?: string[][];
  successMessage?: string;
  errorMessage?: string;
}) {
  const {
    endpoint,
    method,
    invalidateKeys = [],
    successMessage,
    errorMessage,
  } = config;
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (variables) => {
      const url =
        typeof endpoint === "function" ? endpoint(variables) : endpoint;

      switch (method) {
        case "POST":
          return api.post<TData>(url, variables);
        case "PUT":
          return api.put<TData>(url, variables);
        case "PATCH":
          return api.patch<TData>(url, variables);
        case "DELETE":
          return api.delete<TData>(url);
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
    },
    onSuccess: () => {
      // Invalidate specified queries
      invalidateKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (error) => {
      toast.error(errorMessage || error.message);
    },
  });
}
