import {
  useMutation,
  useQueryClient,
  type MutationFunction,
  type QueryKey,
  type UseMutationOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

type AppMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
  TError = unknown,
> = Omit<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "mutationFn"
> & {
  mutationFn: MutationFunction<TData, TVariables>;
  invalidateKeys?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
};

export function useAppMutation<
  TData,
  TVariables = void,
  TContext = unknown,
  TError = unknown,
>({
  mutationFn,
  invalidateKeys = [],
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  ...options
}: AppMutationOptions<TData, TVariables, TContext, TError>) {
  const queryClient = useQueryClient();

  return useMutation<TData, TError, TVariables, TContext>({
    mutationFn,
    ...options,
    onSuccess: async (data, variables, mutationContext, context) => {
      await Promise.all(
        invalidateKeys.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );

      if (successMessage) {
        toast.success(successMessage);
      }

      if (onSuccess) {
        await onSuccess(data, variables, mutationContext, context);
      }
    },
    onError: async (error, variables, mutationContext, context) => {
      showUserFacingErrorToast(errorMessage ?? getErrorMessage(error));

      if (onError) {
        await onError(error, variables, mutationContext, context);
      }
    },
  });
}
