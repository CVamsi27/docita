export interface InternalSubscriptionOverview {
  id: string;
  clinic: {
    name: string;
    email: string;
    referralCreditsMonths: number;
  };
  tier: string;
  status: string;
  billingCycle: string;
  amount: number;
  currency: string;
  currentPeriodEnd: string;
}

export interface InternalBillingMetrics {
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  churnRate: number;
  expiringSubscriptions: InternalSubscriptionOverview[];
  gracePeriodSubscriptions: InternalSubscriptionOverview[];
  subscriptionsByTier: Record<string, number>;
  subscriptionsByStatus: Record<string, number>;
  revenueByMonth: { month: string; revenue: number }[];
}

export interface InternalTierPricingRow {
  id: string;
  tier: string;
  name: string;
  description: string;
  tagline: string;
  color: string;
  displayOrder: number;
  monthlyBasePriceCents: number;
  includedPatients: number;
  includedAppointments: number;
  includedStorageGB: number;
  includedUsers: number;
  overagePatientCents: number;
  overageAppointmentCents: number;
  overageStorageCents: number;
  overageUserCents: number;
  overagePrescriptionCents: number;
  overageInvoiceCents: number;
  overageOcrPageCents: number;
  overageApiCallCents: number;
  isActive: boolean;
}
