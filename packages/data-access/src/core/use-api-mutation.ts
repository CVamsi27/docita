import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { useDataAccessFetcher } from "../provider/hooks";

type QueryKey = readonly (string | number | Record<string, unknown>)[];

export interface UseAPIMutationOptions<TData, TVariables, TError = Error>
  extends Omit<UseMutationOptions<TData, TError, TVariables>, "mutationFn"> {
  invalidateKeys?: readonly QueryKey[];
  body?: (variables: TVariables) => unknown;
  suppressGlobalErrorToast?: boolean;
}

export function useAPIMutation<TData, TVariables, TError = Error>(
  endpointOrFn: string | ((vars: TVariables) => string),
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST",
  options?: UseAPIMutationOptions<TData, TVariables, TError>,
) {
  const fetcher = useDataAccessFetcher();
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables>({
    mutationFn: (variables: TVariables) => {
      const endpoint =
        typeof endpointOrFn === "function"
          ? endpointOrFn(variables)
          : endpointOrFn;
      const requestBody = options?.body ? options.body(variables) : variables;
      return fetcher<TData>(endpoint, {
        method,
        retries: 0,
        ...(requestBody === undefined
          ? {}
          : { body: JSON.stringify(requestBody) }),
        ...(options?.suppressGlobalErrorToast !== undefined
          ? { suppressGlobalErrorToast: options.suppressGlobalErrorToast }
          : {}),
      });
    },
    ...options,
    onSuccess: (data, variables, context) => {
      if (options?.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }
      if (options?.onSuccess) {
        const typedOnSuccess = options.onSuccess as (
          data: TData,
          variables: TVariables,
          context?: unknown,
        ) => Promise<void> | void;
        typedOnSuccess(data, variables, context);
      }
    },
  });
}
