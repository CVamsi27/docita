import { useInfiniteQuery } from "@tanstack/react-query";
import {
  CreateInvoiceRequest,
  Invoice,
  ListInvoicesContractQuery,
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
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";
import { fetchWithSession } from "@/lib/fetch-with-session";
import { withQueryString } from "@/lib/http/query-string";

export const useInvoices = (filters?: ListInvoicesContractQuery) =>
  useAPIQuery<
    (Invoice & {
      patient: Patient;
      appointment?: { doctor: { name: string } };
    })[]
  >(
    ["invoices", filters || {}],
    withQueryString("/invoices", filters),
  );

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

export const useCreateInvoice = () =>
  useAPIMutation<Invoice, CreateInvoiceRequest>("/invoices", "POST", {
    invalidateKeys: [["invoices"]],
  });

export const useUpdateInvoice = (id: string) =>
  useAPIMutation<Invoice, UpdateInvoiceRequest>(`/invoices/${id}`, "PATCH", {
    invalidateKeys: [["invoices"], ["invoices", id]],
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
) =>
  useAPIQuery<SubscriptionBillingPreviewResponse>(
    ["proration-preview", tier, cycle],
    `/subscription/billing/preview?tier=${tier}&cycle=${cycle}`,
    {
      select: (data) => subscriptionBillingPreviewResponseSchema.parse(data),
      enabled: !!tier && !!cycle,
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
          cursor: pageParam,
          patientId: options?.patientId,
          status: options?.status,
          date: options?.date,
          search: options?.search,
        }),
      );

      if (!response.ok) {
        throw new Error("We could not load your invoices. Please try again.");
      }
      return response.json() as Promise<{
        items: Invoice[];
        nextCursor: string | null;
        hasMore: boolean;
        count: number;
      }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60 * 5,
  });
};
