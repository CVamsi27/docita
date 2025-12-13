/**
 * Optimistic Update Utilities for React Query
 *
 * Provides helpers for implementing optimistic updates in mutations.
 */

import { useQueryClient } from "@tanstack/react-query";

/**
 * Local paginated list interface for optimistic updates
 */
interface PaginatedList<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}
interface _OptimisticContext<T> {
  previousData: T | undefined;
  queryKey: readonly unknown[];
}

/**
 * Options for optimistic updates
 */
interface _OptimisticUpdateOptions<T, TVariables> {
  /** Query key to update optimistically */
  queryKey: readonly unknown[];
  /** Function to update cached data optimistically */
  updater: (old: T | undefined, variables: TVariables) => T;
}

/**
 * Create an optimistic update mutation with automatic rollback on error.
 *
 * @example
 * ```typescript
 * const { mutate } = useOptimisticMutation<Patient, UpdatePatientInput>({
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
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  invalidateOnSuccess?: boolean;
}) {
  const queryClient = useQueryClient();
  const {
    mutationFn,
    queryKey,
    updater,
    onSuccess,
    onError,
    invalidateOnSuccess = true,
  } = options;

  return {
    mutate: async (variables: TVariables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<TData>(queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData<TData>(queryKey, (old) =>
        updater(old, variables),
      );

      try {
        const result = await mutationFn(variables);

        // Invalidate to get fresh data if configured
        if (invalidateOnSuccess) {
          await queryClient.invalidateQueries({ queryKey });
        }

        onSuccess?.(result, variables);
        return result;
      } catch (error) {
        // Rollback to previous value on error
        queryClient.setQueryData(queryKey, previousData);
        onError?.(error as Error, variables);
        throw error;
      }
    },
  };
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
