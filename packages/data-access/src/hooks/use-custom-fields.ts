import {
  type CustomField,
  type CreateCustomFieldRequest,
  type UpdateCustomFieldRequest,
} from "@workspace/types";
import { queryKeys } from "../lib/query-keys-clinician";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIMutation } from "../core/use-api-mutation";

export const useCustomFields = (queryOptions?: { enabled?: boolean }) =>
  useAPIQuery<CustomField[]>(
    queryKeys.customFields.all(),
    "/custom-fields",
    {
      enabled: queryOptions?.enabled,
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
    },
  );

export const useCreateCustomField = () =>
  useAPIMutation<CustomField, CreateCustomFieldRequest>(
    "/custom-fields",
    "POST",
    {
      invalidateKeys: [queryKeys.customFields.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useUpdateCustomField = () =>
  useAPIMutation<CustomField, UpdateCustomFieldRequest & { id: string }>(
    ({ id }) => `/custom-fields/${id}`,
    "PUT",
    {
      invalidateKeys: [queryKeys.customFields.all()],
      suppressGlobalErrorToast: true,
    },
  );

export const useDeleteCustomField = () =>
  useAPIMutation<CustomField, { id: string }>(
    ({ id }) => `/custom-fields/${id}`,
    "DELETE",
    {
      invalidateKeys: [queryKeys.customFields.all()],
    },
  );
