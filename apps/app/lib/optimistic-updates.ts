

import {
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";

interface PaginatedList<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
  count?: number;
}

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

      await queryClient.cancelQueries({ queryKey: options.queryKey });

      const previousData = queryClient.getQueryData<TData>(options.queryKey);

      queryClient.setQueryData<TData>(options.queryKey, (old) =>
        options.updater(old, variables),
      );

      return { previousData };
    },
    onError: (err, variables, context) => {

      if (context?.previousData !== undefined) {
        queryClient.setQueryData(options.queryKey, context.previousData);
      }
      options.onError?.(err, variables, context);
    },
    onSuccess: (data, variables, context) => {
      options.onSuccess?.(data, variables, context);
    },
    onSettled: (data, error, variables, context) => {

      if (options.invalidateOnSuccess !== false) {
        queryClient.invalidateQueries({ queryKey: options.queryKey });
      }
      options.onSettled?.(data, error, variables, context);
    },
  });
}

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

export function useOptimisticUpdate<T>(options: {
  queryKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const { queryKey } = options;

  return {
    
    setOptimistic: async (
      updater: (old: T | undefined) => T,
    ): Promise<T | undefined> => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<T>(queryKey);
      queryClient.setQueryData<T>(queryKey, updater);
      return previous;
    },

    
    rollback: (previousData: T | undefined) => {
      queryClient.setQueryData(queryKey, previousData);
    },

    
    invalidate: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
}
