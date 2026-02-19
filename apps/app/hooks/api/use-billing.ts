import { useInfiniteQuery } from "@tanstack/react-query";
import { CreateInvoiceInput, Invoice, Patient } from "@workspace/types";
import { API_URL, useAPIMutation, useAPIQuery } from "../../lib/api-core";

// Invoices
export const useInvoices = (filters?: {
  patientId?: string;
  status?: string;
  date?: string;
  limit?: number;
  search?: string;
}) =>
  useAPIQuery<
    (Invoice & {
      patient: Patient;
      appointment?: { doctor: { name: string } };
    })[]
  >(
    ["invoices", filters || {}],
    (() => {
      if (!filters) return "/invoices";
      const params = new URLSearchParams();
      (
        Object.entries(filters) as [string, string | number | undefined][]
      ).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });
      const qs = params.toString();
      return qs ? `/invoices?${qs}` : "/invoices";
    })(),
  );

export const useInvoice = (id: string) =>
  useAPIQuery<Invoice & { patient: Patient }>(
    ["invoices", id],
    `/invoices/${id}`,
  );

export const useCreateInvoice = () =>
  useAPIMutation<Invoice, CreateInvoiceInput>("/invoices", "POST", {
    invalidateKeys: [["invoices"]],
  });

export const useUpdateInvoice = (id: string) =>
  useAPIMutation<Invoice, Partial<Invoice>>(`/invoices/${id}`, "PATCH", {
    invalidateKeys: [["invoices"], ["invoices", id]],
  });

export const useDeleteInvoice = (id: string) =>
  useAPIMutation<void, void>(`/invoices/${id}`, "DELETE", {
    invalidateKeys: [["invoices"]],
  });

export const useBillingStatus = () =>
  useAPIQuery<{
    subscription: {
      id: string;
      status: string;
      tier: string;
      billingCycle: string;
      basePriceCents?: number;
      currentPeriodStart: Date;
      currentPeriodEnd: Date;
      cancelAtPeriodEnd: boolean;
      graceEndsAt?: Date;
      scheduledChange?: {
        tier: string;
        billingCycle: string;
        effectiveDate: Date;
      };
    } | null;
    referralCredits: number;
    pendingReferralDiscount: number;
    lastPayment?: {
      amount: number;
      currency: string;
      date: Date;
      status: string;
      paymentMethod?: string;
    };
  }>(["billing-status"], "/subscription/billing", {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

export const usePaymentHistory = () =>
  useAPIQuery<
    {
      id: string;
      amount: number;
      currency: string;
      status: string;
      paymentMethod?: string;
      tier: string;
      billingCycle: string;
      invoiceUrl?: string;
      createdAt: string;
    }[]
  >(["payment-history"], "/subscription/billing/payments", {
    staleTime: 1000 * 60 * 5,
  });

export const useProrationPreview = (tier: string, billingCycle: string) =>
  useAPIQuery<{
    currentTier: string;
    newTier: string;
    currentCycle: string;
    newCycle: string;
    creditCents: number;
    chargeCents: number;
    daysRemaining: number;
    billingCycleDays: number;
    finalAmountCents: number;
    discount?: {
      type: string;
      percent: number;
      description: string;
    };
  }>(
    ["proration-preview", tier, billingCycle],
    `/subscription/billing/preview?tier=${tier}&cycle=${billingCycle}`,
    {
      enabled: !!tier && !!billingCycle,
      staleTime: 1000 * 60, // 1 minute
    },
  );

export const useCreateCheckout = () =>
  useAPIMutation<
    {
      orderId: string;
      amount: number;
      currency: string;
      razorpayKeyId: string;
      prefill: {
        name: string;
        email: string;
        contact?: string;
      };
    },
    {
      tier: string;
      billingCycle: string;
      referralCode?: string;
    }
  >("/subscription/billing/checkout", "POST");

export const useActivateSubscription = () =>
  useAPIMutation<
    {
      success: boolean;
      subscription: {
        id: string;
        tier: string;
        status: string;
      };
    },
    {
      razorpayPaymentId: string;
      razorpayOrderId: string;
      razorpaySignature: string;
      tier: string;
      billingCycle: string;
    }
  >("/subscription/billing/activate", "POST");

export const useCancelSubscription = () =>
  useAPIMutation<
    { success: boolean; message: string },
    { immediate?: boolean }
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
      const params = new URLSearchParams({
        limit: (options?.limit || 50).toString(),
        ...(pageParam && { cursor: pageParam }),
        ...(options?.patientId && { patientId: options.patientId }),
        ...(options?.status && { status: options.status }),
        ...(options?.date && { date: options.date }),
        ...(options?.search && { search: options.search }),
      });

      const response = await fetch(`${API_URL}/invoices?${params}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch invoices");
      return response.json() as Promise<{
        items: Invoice[];
        nextCursor: string | null;
        hasMore: boolean;
        count: number;
      }>;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
