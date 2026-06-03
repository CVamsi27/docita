"use client";

import { useState } from "react";
import { billingAPI } from "@/lib/api/api";
import { useAuth } from "@/lib/auth/auth";
import {
  type InternalSubscriptionOverview as SubscriptionOverview,
  useInternalBillingMetrics,
  useInternalBillingPayments,
  useInternalBillingSubscriptions,
} from "@workspace/data-access/internal";
import {
  buildSubscriptionFilters,
  DEFAULT_EXTEND_DAYS,
  deriveSubscriptionPageStatus,
} from "./billing-helpers";

export function useBillingDashboard() {
  const [refreshing, setRefreshing] = useState(false);
  const { token, isLoading: authLoading } = useAuth();
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [billingCycleFilter, setBillingCycleFilter] = useState("all");
  const [extendGraceDialog, setExtendGraceDialog] = useState<{ open: boolean; subscription?: SubscriptionOverview }>({ open: false });
  const [extendDays, setExtendDays] = useState(DEFAULT_EXTEND_DAYS);
  const [sending, setSending] = useState(false);
  const { filters: subscriptionFilters, filtersKey: subscriptionFiltersKey } =
    buildSubscriptionFilters(tierFilter, statusFilter, billingCycleFilter);
  const metricsQuery = useInternalBillingMetrics(token);
  const subscriptionsQuery = useInternalBillingSubscriptions(token, subscriptionFiltersKey, subscriptionFilters);
  const paymentsQuery = useInternalBillingPayments(token, "default", {});
  const { loading, errorMessage, pageStatus } = deriveSubscriptionPageStatus(
    authLoading, token,
    metricsQuery.isLoading, subscriptionsQuery.isLoading, paymentsQuery.isLoading,
    metricsQuery.error, subscriptionsQuery.error, paymentsQuery.error,
  );
  const metrics = metricsQuery.data ?? null;
  const subscriptions = subscriptionsQuery.data ?? [];
  const payments = paymentsQuery.data ?? [];

  const refetchBilling = () => Promise.all([
    metricsQuery.refetch(),
    subscriptionsQuery.refetch(),
    paymentsQuery.refetch(),
  ]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await refetchBilling(); } finally { setRefreshing(false); }
  };

  const handleSendReminder = async (subscription: { id: string }) => {
    setSending(true);
    try { await billingAPI.sendReminder(subscription.id); } catch { /* noop */ } finally { setSending(false); }
  };

  const handleExtendGracePeriod = async () => {
    if (!extendGraceDialog.subscription) return;
    setSending(true);
    try {
      await billingAPI.extendGracePeriod(extendGraceDialog.subscription.id, extendDays);
      setExtendGraceDialog({ open: false });
      setExtendDays(DEFAULT_EXTEND_DAYS);
      await refetchBilling();
    } catch { /* noop */ } finally { setSending(false); }
  };

  return {
    refreshing, tierFilter, statusFilter, billingCycleFilter,
    extendGraceDialog, extendDays, sending,
    setTierFilter, setStatusFilter, setBillingCycleFilter,
    setExtendGraceDialog, setExtendDays,
    metrics, subscriptions, payments, loading, errorMessage, pageStatus,
    handleRefresh, handleSendReminder, handleExtendGracePeriod, refetchBilling,
  };
}
