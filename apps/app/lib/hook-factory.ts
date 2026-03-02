

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

function toRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(Object.entries(value));
}

interface EntityConfig<T> {
  
  endpoint: string;
  
  queryKey: string;
  
  transformList?: (data: Record<string, unknown>) => PaginatedResponse<T>;
  
  transformOne?: (data: Record<string, unknown>) => T;
}

interface ListOptions {
  limit?: number;
  cursor?: string;
  search?: string;
  enabled?: boolean;
}

export function createEntityHooks<
  T,
  CreateInput = Partial<T>,
  UpdateInput = Partial<T>,
>(config: EntityConfig<T>) {
  const { endpoint, queryKey, transformList, transformOne } = config;

  return {
    
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
            ? transformList(toRecord(data))
            : (data as PaginatedResponse<T>);
        },
        enabled: options?.enabled !== false,
        ...queryOptions,
      });
    },

    
    useOne: (
      id: string | undefined,
      queryOptions?: Omit<UseQueryOptions<T>, "queryKey" | "queryFn">,
    ) => {
      return useQuery<T>({
        queryKey: [queryKey, "detail", id],
        queryFn: async () => {
          const data = await api.get(`${endpoint}/${id}`);
          return transformOne
            ? transformOne(toRecord(data))
            : (data as T);
        },
        enabled: !!id && queryOptions?.enabled !== false,
        ...queryOptions,
      });
    },

    
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

          queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });
          toast.success("Created successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
        ...mutationOptions,
      });
    },

    
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

          queryClient.invalidateQueries({ queryKey: [queryKey, "list"] });

          queryClient.removeQueries({ queryKey: [queryKey, "detail", id] });
          toast.success("Deleted successfully");
        },
        onError: (error) => {
          toast.error(error.message);
        },
        ...mutationOptions,
      });
    },

    
    getQueryKey: {
      list: (options?: ListOptions) => [queryKey, "list", options] as const,
      detail: (id: string) => [queryKey, "detail", id] as const,
    },
  };
}

export function useEntity<T>(config: {
  queryKey: string[];
  endpoint: string;
  enabled?: boolean;
  staleTime?: number;
  transform?: (data: Record<string, unknown>) => T;
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
      return transform
        ? transform(toRecord(data))
        : (data as T);
    },
    enabled,
    staleTime,
  });
}

export function useEntityMutation<
  TData,
  TVariables = Record<string, unknown>,
>(config: {
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
