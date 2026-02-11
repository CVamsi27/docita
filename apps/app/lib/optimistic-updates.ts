/**
 * Optimistic Update Utilities for React Query
 *
 * Provides helpers for implementing optimistic updates in mutations.
 */

import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Local paginated list interface for optimistic updates
 */
interface PaginatedList<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

/**
 * Create an optimistic update mutation with automatic rollback on error.
 * Wraps @tanstack/react-query useMutation.
 *
 * @example
 * ```typescript
 * const mutation = useOptimisticMutation<Patient, UpdatePatientInput>({
 *   mutationFn: (data) => api.patch(`/patients/${id}`, data),
 *   queryKey: ['patients', 'detail', id],
 *   updater: (old, input) => ({ ...old, ...input }),
 * });
 * ```
 */
export function useOptimisticMutation<TData, TVariables>(options: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  queryKey: readonly unknown[];
  updater: (old: TData | undefined, variables: TVariables) => TData;
  onSuccess?: (
    data: TData,
    variables: TVariables,
    context: { previousData: TData | undefined } | undefined,
  ) => void;
  onError?: (
    error: unknown,
    variables: TVariables,
    context: { previousData: TData | undefined } | undefined,
  ) => void;
  onSettled?: (
    data: TData | undefined,
    error: unknown | null,
    variables: TVariables,
    context: { previousData: TData | undefined } | undefined,
  ) => void;
  invalidateOnSuccess?: boolean;
}): UseMutationResult<
  TData,
  unknown,
  TVariables,
  { previousData: TData | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation<
    TData,
    unknown,
    TVariables,
    { previousData: TData | undefined }
  >({
    mutationFn: options.mutationFn,
    onMutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: options.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TData>(options.queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(options.queryKey, (old) =>
        options.updater(old, variables),
      );

      // Return a context object with the snapshotted value
      return { previousData };
    },
    onError: (err, variables, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      options.onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      options.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {
      // Always refetch after error or success to ensure server state is synced
      if (options.invalidateOnSuccess !== false) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }
      options.onSettled?.(data, error, variables, context);
    },
  });
}

/**
 * Optimistically add an item to a paginated list.
 */
export function optimisticAddToList<T extends { id: string }>(
  old: PaginatedList<T> | undefined,
  newItem: T,
): PaginatedList<T> {
  if (!old) {
    return {
      items: [newItem],
      hasMore: false,
    };
  }

  return {
    ...old,
    items: [newItem, ...old.items],
  };
}

/**
 * Optimistically update an item in a paginated list.
 */
export function optimisticUpdateInList<T extends { id: string }>(
  old: PaginatedList<T> | undefined,
  id: string,
  updates: Partial<T>,
): PaginatedList<T> {
  if (!old) {
    return { items: [], hasMore: false };
  }

  return {
    ...old,
    items: old.items.map((item) =>
      item.id === id ? { ...item, ...updates } : item,
    ),
  };
}

/**
 * Optimistically remove an item from a paginated list.
 */
export function optimisticRemoveFromList<T extends { id: string }>(
  old: PaginatedList<T> | undefined,
  id: string,
): PaginatedList<T> {
  if (!old) {
    return { items: [], hasMore: false };
  }

  return {
    ...old,
    items: old.items.filter((item) => item.id !== id),
  };
}

/**
 * Hook to get optimistic update helpers for a query.
 *
 * @example
 * ```typescript
 * const { setOptimistic, rollback } = useOptimisticUpdate<Patient>({
 *   queryKey: ['patients', 'detail', id],
 * });
 *
 * // In mutation:
 * onMutate: async (newData) => {
 *   const previous = await setOptimistic((old) => ({ ...old, ...newData }));
 *   return { previous };
 * },
 * onError: (err, vars, context) => {
 *   if (context?.previous) rollback(context.previous);
 * }
 * ```
 */
export function useOptimisticUpdate<T>(options: {
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const { queryKey } = options;

  return {
    /**
     * Set optimistic data, returns previous data for rollback
     */
    setOptimistic: async (
      updater: (old: T | undefined) => T,
    ): Promise<T | undefined> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T>(queryKey);
      queryClient.setQueryData<T>(queryKey, updater);
      return previous;
    },

    /**
     * Rollback to previous data
     */
    rollback: (previousData: T | undefined) => {
      queryClient.setQueryData(queryKey, previousData);
    },

    /**
     * Invalidate the query to refetch fresh data
     */
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
