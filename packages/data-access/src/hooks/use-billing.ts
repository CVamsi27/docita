"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import {
  CreateInvoiceRequest,
  Feature,
  Invoice,
  type InvoiceListRow,
  invoiceListRowSchema,
  ListInvoicesContractQuery,
  paginatedInvoiceListResponseSchema,
  Patient,
  SubscriptionBillingActivateRequest,
  SubscriptionBillingActivateResponse,
  SubscriptionBillingCancelRequest,
  SubscriptionBillingCancelResponse,
  SubscriptionBillingCheckoutRequest,
  SubscriptionBillingCheckoutResponse,
  SubscriptionBillingPaymentHistoryResponse,
  SubscriptionBillingPreviewQuery,
  SubscriptionBillingPreviewResponse,
  SubscriptionBillingStatusResponse,
  UpdateInvoiceRequest,
  invoicePaymentActivityResponseSchema,
  invoiceResponseSchema,
  subscriptionBillingPaymentHistoryResponseSchema,
  subscriptionBillingPreviewResponseSchema,
  subscriptionBillingStatusResponseSchema,
} from "@workspace/types";
import { useAPIQuery } from "../core/use-api-query";
import { useAPIQueryValidated } from "../core/use-api-query-validated";
import { useAPIMutation } from "../core/use-api-mutation";
import { APIRequestError } from "../lib/errors";
import { queryKeys } from "../lib/query-keys";
import { withQueryString } from "../lib/query-string";
import { useDataAccessContext, useDataAccessFetcher } from "../provider/hooks";
import { isRecord } from "@workspace/utils";

export type { InvoiceListRow } from "@workspace/types";
export { invoiceListRowSchema, normalizeInvoiceListRowInput } from "@workspace/types";

function hasItemsArray(data: unknown): data is { items: unknown[] } {
  return isRecord(data) && Array.isArray(data["items"]);
}

/** API list returns `{ items, hasMore, ... }`; older clients may still receive a bare array. */
export function normalizeInvoicesListResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (hasItemsArray(data)) {
    return data["items"];
  }
  return [];
}

const infiniteInvoicesResponseSchema = paginatedInvoiceListResponseSchema.extend(
  {
    nextCursor: z.string().nullable().optional(),
    count: z.number(),
  },
);

function parseInvoiceListRows(raw: unknown): InvoiceListRow[] {
  const parsed = z
    .array(invoiceListRowSchema)
    .safeParse(normalizeInvoicesListResponse(raw));
  if (!parsed.success) {
    throw new APIRequestError(
      "We could not read the invoice list. Please refresh and try again.",
      { code: "VALIDATION_ERROR" },
    );
  }
  return parsed.data;
}

export const useInvoices = (filters?: ListInvoicesContractQuery) => {
  const fetcher = useDataAccessFetcher();
  const { isTierFeatureEnabled, getClinicId } = useDataAccessContext();
  const invoicingOk = isTierFeatureEnabled(Feature.INVOICING);
  const clinicReady = Boolean(getClinicId());
  return useQuery<unknown, APIRequestError, InvoiceListRow[]>({
    queryKey: queryKeys.invoices.legacyList(filters),
    queryFn: () => fetcher<unknown>(withQueryString("/invoices", filters)),
    select: parseInvoiceListRows,
    staleTime: 60 * 1000,
    enabled: invoicingOk && clinicReady,
  });
};

export const useInvoice = (id: string) => {
  const invoicingOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INVOICING,
  );
  return useAPIQuery<
    Invoice & {
      patient: Patient & {
        clinic?: {
          name?: string;
          slaSignatureUrl?: string | null;
        };
      };
    }
  >(queryKeys.invoices.legacyDetail(id), `/invoices/${id}`, {
    enabled: invoicingOk && id.length > 0,
  });
};

export const useInvoicePaymentActivity = (
  invoiceId: string,
  options?: { enabled?: boolean },
) => {
  const invoicingOk = useDataAccessContext().isTierFeatureEnabled(
    Feature.INVOICING,
  );
  return useAPIQueryValidated(
    queryKeys.invoices.paymentActivity(invoiceId),
    `/invoices/${invoiceId}/payment-activity`,
    invoicePaymentActivityResponseSchema,
    {
      enabled:
        invoicingOk &&
        Boolean(invoiceId) &&
        (options?.enabled ?? true),
      staleTime: 60_000,
    },
  );
};

export const useCreateInvoice = () =>
  useAPIMutation<Invoice, CreateInvoiceRequest>("/invoices", "POST", {
    invalidateKeys: [queryKeys.invoices.all()],
  });

export const useUpdateInvoice = (id: string) =>
  useAPIMutation<Invoice, UpdateInvoiceRequest>(`/invoices/${id}`, "PATCH", {
    invalidateKeys: [
      queryKeys.invoices.all(),
      queryKeys.invoices.legacyDetail(id),
      queryKeys.invoices.paymentActivity(id),
    ],
  });

export const useDeleteInvoice = (id: string) =>
  useAPIMutation<void, void>(`/invoices/${id}`, "DELETE", {
    invalidateKeys: [queryKeys.invoices.all()],
  });

export const useBillingStatus = () =>
  useAPIQuery<SubscriptionBillingStatusResponse>(
    queryKeys.billing.status(),
    "/subscription/billing",
    {
      select: (data) => subscriptionBillingStatusResponseSchema.parse(data),
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  );

export const usePaymentHistory = () =>
  useAPIQuery<SubscriptionBillingPaymentHistoryResponse>(
    queryKeys.billing.paymentHistory(),
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
    queryKeys.billing.prorationPreview(tier, cycle),
    withQueryString("/subscription/billing/preview", { tier, cycle }),
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
  const fetcher = useDataAccessFetcher();
  const { isTierFeatureEnabled, getClinicId } = useDataAccessContext();
  const invoicingOk = isTierFeatureEnabled(Feature.INVOICING);
  const clinicReady = Boolean(getClinicId());
  return useInfiniteQuery({
    queryKey: queryKeys.invoices.legacyInfinite(options ?? {}),
    queryFn: async ({ pageParam }) => {
      const raw = await fetcher<unknown>(
        withQueryString("/invoices", {
          limit: options?.limit || 50,
          cursor: pageParam || undefined,
          patientId: options?.patientId,
          status: options?.status,
          date: options?.date,
          search: options?.search,
        }),
      );
      const parsed = infiniteInvoicesResponseSchema.safeParse(raw);
      if (!parsed.success) {
        throw new APIRequestError(
          "We could not read the invoice list. Please refresh and try again.",
          { code: "VALIDATION_ERROR" },
        );
      }
      return parsed.data;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: "",
    staleTime: 1000 * 60 * 5,
    enabled: invoicingOk && clinicReady,
  });
};
