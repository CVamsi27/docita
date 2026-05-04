import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CreateInvoiceRequest,
  Invoice,
  ListInvoicesContractQuery,
  invoiceResponseSchema,
  invoicePaymentActivityResponseSchema,
  Patient,
  type SubscriptionBillingActivateResponse,
  type SubscriptionBillingCancelResponse,
  type SubscriptionBillingCheckoutResponse,
  type SubscriptionBillingPreviewResponse,
  type SubscriptionBillingStatusResponse,
  SubscriptionBillingPaymentHistoryResponse,
  SubscriptionBillingActivateRequest,
  SubscriptionBillingCancelRequest,
  SubscriptionBillingCheckoutRequest,
  SubscriptionBillingPreviewQuery,
  UpdateInvoiceRequest,
  subscriptionBillingPaymentHistoryResponseSchema,
  subscriptionBillingPreviewResponseSchema,
  subscriptionBillingStatusResponseSchema,
} from "@workspace/types";
import { queryKeys } from "@workspace/data-access";
import { fetchAPI, useAPIMutation, useAPIQuery, useAPIQueryValidated } from "@/lib/api-core";
import { ApiError } from "@/lib/errors";
import { fetchWithSession } from "@/lib/fetch-with-session";
import { withQueryString } from "@/lib/http/query-string";

export type InvoiceListRow = Invoice & {
  patient: Patient;
  appointment?: { doctor: { name: string } };
};

/** API list returns `{ items, hasMore, ... }`; older clients may still receive a bare array. */
export function normalizeInvoicesListResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (
    data &&
    typeof data === "object" &&
    "items" in data &&
    Array.isArray((data as { items: unknown }).items)
  ) {
    return (data as { items: T[] }).items;
  }
  return [];
}

export const useInvoices = (filters?: ListInvoicesContractQuery) =>
  useQuery<unknown, ApiError, InvoiceListRow[]>({
    queryKey: ["invoices", filters || {}],
    queryFn: () => fetchAPI<unknown>(withQueryString("/invoices", filters)),
    select: (raw) => normalizeInvoicesListResponse<InvoiceListRow>(raw),
    staleTime: 60 * 1000,
  });

const infiniteInvoicesResponseSchema = z.object({
  items: z.array(invoiceResponseSchema),
  nextCursor: z.string().nullable().optional(),
  hasMore: z.boolean(),
  count: z.number(),
});

export const useInvoice = (id: string) =>
  useAPIQuery<
    Invoice & {
      patient: Patient & {
        clinic?: {
          name?: string;
          slaSignatureUrl?: string | null;
        };
      };
    }
  >(
    ["invoices", id],
    `/invoices/${id}`,
  );

export const useInvoicePaymentActivity = (
  invoiceId: string,
  options?: { enabled?: boolean },
) =>
  useAPIQueryValidated(
    queryKeys.invoices.paymentActivity(invoiceId),
    `/invoices/${invoiceId}/payment-activity`,
    invoicePaymentActivityResponseSchema,
    {
      enabled: Boolean(invoiceId) && (options?.enabled ?? true),
      staleTime: 60_000,
    },
  );

export const useCreateInvoice = () =>
  useAPIMutation<Invoice, CreateInvoiceRequest>("/invoices", "POST", {
    invalidateKeys: [["invoices"]],
  });

export const useUpdateInvoice = (id: string) =>
  useAPIMutation<Invoice, UpdateInvoiceRequest>(`/invoices/${id}`, "PATCH", {
    invalidateKeys: [
      ["invoices"],
      ["invoices", id],
      queryKeys.invoices.paymentActivity(id),
    ],
  });

export const useDeleteInvoice = (id: string) =>
  useAPIMutation<void, void>(`/invoices/${id}`, "DELETE", {
    invalidateKeys: [["invoices"]],
  });

export const useBillingStatus = () =>
  useAPIQuery<SubscriptionBillingStatusResponse>(
    ["billing-status"],
    "/subscription/billing",
    {
      select: (data) => subscriptionBillingStatusResponseSchema.parse(data),
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: true,
    },
  );

export const usePaymentHistory = () =>
  useAPIQuery<SubscriptionBillingPaymentHistoryResponse>(
    ["payment-history"],
    "/subscription/billing/payments",
    {
      select: (data) =>
        subscriptionBillingPaymentHistoryResponseSchema.parse(data),
      staleTime: 1000 * 60 * 5,
    },
  );

export const useProrationPreview = (
  tier: SubscriptionBillingPreviewQuery["tier"],
  cycle: SubscriptionBillingPreviewQuery["cycle"],
  options?: { enabled?: boolean },
) =>
  useAPIQuery<SubscriptionBillingPreviewResponse>(
    ["proration-preview", tier, cycle],
    `/subscription/billing/preview?tier=${tier}&cycle=${cycle}`,
    {
      select: (data) => subscriptionBillingPreviewResponseSchema.parse(data),
      enabled:
        !!tier &&
        !!cycle &&
        (options?.enabled !== undefined ? options.enabled : true),
      staleTime: 1000 * 60,
    },
  );

export const useCreateCheckout = () =>
  useAPIMutation<
    SubscriptionBillingCheckoutResponse,
    SubscriptionBillingCheckoutRequest
  >("/subscription/billing/checkout", "POST");

export const useActivateSubscription = () =>
  useAPIMutation<
    SubscriptionBillingActivateResponse,
    SubscriptionBillingActivateRequest
  >("/subscription/billing/activate", "POST");

export const useCancelSubscription = () =>
  useAPIMutation<
    SubscriptionBillingCancelResponse,
    SubscriptionBillingCancelRequest
  >("/subscription/billing/cancel", "POST");

export const useInfiniteInvoices = (options?: {
  limit?: number;
  patientId?: string;
  status?: string;
  date?: string;
  search?: string;
}) => {
  return useInfiniteQuery({
    queryKey: ["invoices", "infinite", options],
    queryFn: async ({ pageParam }) => {
      const response = await fetchWithSession(
        withQueryString("/invoices", {
          limit: options?.limit || 50,
          cursor: pageParam || undefined,
          patientId: options?.patientId,
          status: options?.status,
          date: options?.date,
          search: options?.search,
        }),
      );

      if (!response.ok) {
        throw new Error("We could not load your invoices. Please try again.");
      }
      return infiniteInvoicesResponseSchema.parse(await response.json());
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: "",
    staleTime: 1000 * 60 * 5,
  });
};
