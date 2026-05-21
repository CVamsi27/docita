"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useState } from "react";
import {
  fetchInternalClinicTierInfo,
  fetchInternalPricingConfig,
  type InternalClinicTierInfo,
  type InternalPaymentTierPricingRow,
  useInternalBillingPricingOffers,
  useInternalClinics,
  useInternalTierPricing,
} from "@workspace/data-access/internal";
import { useDataAccessFetcher } from "@workspace/data-access";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import { Input } from "@workspace/ui/components/form/input";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { CreditCard, Percent, Receipt, TrendingUp } from "lucide-react";
import {
  GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
  recordInternalAdditionalChargeRequestSchema,
} from "@workspace/types";
import { useAuth } from "@/lib/auth/auth";
import { billingAPI, type PricingOfferRow } from "@/lib/api/api";
import { client } from "@/lib/api/api-client";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  DEFAULT_CURRENCY,
  formatCurrency,
  parseSupportedCurrency,
} from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

type Clinic = {
  id: string;
  name: string;
  tier: string;
  email: string;
  phone: string;
  currency?: string;
};

type TierInfo = InternalClinicTierInfo;
type TierPricing = InternalPaymentTierPricingRow;

interface PaymentFormData {
  paymentMethod: string;
  amount: string;
  newTier: string;
  paymentNotes?: string;
}

interface PricingOfferFormData {
  clinicId: string;
  percentOff: string;
  title: string;
  validUntil: string;
  notes: string;
}

interface AdditionalChargeFormData {
  category: string;
  amount: string;
  paymentMethod: string;
  razorpayPaymentId: string;
  notes: string;
}

function guidedSetupPresetAmount(currency: string | undefined): string {
  const key = (currency ?? DEFAULT_CURRENCY).toUpperCase();
  if (
    Object.prototype.hasOwnProperty.call(
      GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
      key,
    )
  ) {
    return String(
      GUIDED_SETUP_LIST_PRICE_BY_CURRENCY[parseSupportedCurrency(key)],
    );
  }
  return "";
}

const DEFAULT_TIERS: TierPricing[] = [
  {
    tier: "CAPTURE",
    price: 0,
    billingCycle: "monthly",
    maxDoctors: 5,
    maxPatients: 100,
    features: ["Basic"],
  },
  {
    tier: "CORE",
    price: 999,
    billingCycle: "monthly",
    maxDoctors: 20,
    maxPatients: 500,
    features: ["Standard"],
  },
  {
    tier: "PLUS",
    price: 2999,
    billingCycle: "monthly",
    maxDoctors: 50,
    maxPatients: 2000,
    features: ["Advanced"],
  },
  {
    tier: "PRO",
    price: 5999,
    billingCycle: "monthly",
    maxDoctors: 100,
    maxPatients: 5000,
    features: ["Professional"],
  },
  {
    tier: "ENTERPRISE",
    price: 0,
    billingCycle: "custom",
    maxDoctors: -1,
    maxPatients: -1,
    features: ["Enterprise"],
  },
];

export default function PaymentProcessingPage() {
  const queryClient = useQueryClient();
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [selectedTierPricing, setSelectedTierPricing] = useState<TierPricing[]>(
    [],
  );
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showAdditionalChargeDialog, setShowAdditionalChargeDialog] =
    useState(false);
  const [additionalChargeClinic, setAdditionalChargeClinic] =
    useState<Clinic | null>(null);

  const { token, isInternal, isLoading } = useAuth();
  const fetcher = useDataAccessFetcher();
  const form = useForm<PaymentFormData>({
    defaultValues: {
      paymentMethod: "razorpay",
      amount: "",
      newTier: "",
      paymentNotes: "",
    },
  });
  const clinicsQuery = useInternalClinics(token, "list", {
    enabled: Boolean(isInternal && token),
  });

  const tierPricingQuery = useInternalTierPricing(token, DEFAULT_TIERS, {
    enabled: Boolean(isInternal && token),
  });

  const additionalChargeForm = useForm<AdditionalChargeFormData>({
    defaultValues: {
      category: "GUIDED_SETUP",
      amount: "",
      paymentMethod: "manual",
      razorpayPaymentId: "",
      notes: "",
    },
  });

  const pricingOfferForm = useForm<PricingOfferFormData>({
    defaultValues: {
      clinicId: "",
      percentOff: "10",
      title: "Commercial discount",
      validUntil: "",
      notes: "",
    },
  });

  const pricingOffersQuery = useInternalBillingPricingOffers(token, {
    enabled: Boolean(isInternal && token),
  });

  const savePricingOfferMutation = useMutation({
    mutationFn: (payload: {
      clinicId: string;
      title: string;
      percentOff: number;
      validUntil?: string;
      notes?: string;
    }) => billingAPI.upsertPricingOffer(payload.clinicId, payload),
    onSuccess: async () => {
      toast.success("Checkout discount saved");
      pricingOfferForm.reset({
        clinicId: "",
        percentOff: "10",
        title: "Commercial discount",
        validUntil: "",
        notes: "",
      });
      await queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.billingPricingOffers(),
      });
    },
  });

  const deletePricingOfferMutation = useMutation({
    mutationFn: (clinicId: string) => billingAPI.deletePricingOffer(clinicId),
    onSuccess: async () => {
      toast.success("Checkout discount removed");
      await queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.billingPricingOffers(),
      });
    },
  });

  const clinics: Clinic[] = (clinicsQuery.data ?? []).map((clinic) => ({
    id: clinic.id,
    name: clinic.name,
    tier: clinic.tier ?? "CAPTURE",
    email: clinic.email ?? "",
    phone: clinic.phone ?? "",
    currency: clinic.currency,
  }));
  const tierPricing = tierPricingQuery.data ?? DEFAULT_TIERS;
  const loading = clinicsQuery.isLoading || tierPricingQuery.isLoading;

  const loadClinicTierInfo = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const data = await queryClient.fetchQuery({
        queryKey: internalQueryKeys.internal.clinicTierInfo(clinic.id),
        queryFn: () => fetchInternalClinicTierInfo(fetcher, clinic.id),
      });

      const pricingData = await queryClient.fetchQuery({
        queryKey: internalQueryKeys.internal.pricingConfig(
          clinic.currency || DEFAULT_CURRENCY,
        ),
        queryFn: () =>
          fetchInternalPricingConfig(
            fetcher,
            clinic.currency || DEFAULT_CURRENCY,
          ),
      });
      const nextPricing: TierPricing[] = Array.isArray(pricingData.tiers)
        ? pricingData.tiers.map((tier) => ({
            tier: tier.id,
            price:
              typeof tier.pricing?.monthly === "number"
                ? tier.pricing.monthly
                : 0,
            billingCycle: "monthly",
            maxDoctors: -1,
            maxPatients: -1,
            features: [],
          }))
        : [];
      setSelectedTierPricing(nextPricing);

      setTierInfo(data);
      setSelectedClinic(clinic);
      form.reset({
        paymentMethod: "razorpay",
        newTier: clinic.tier,
        amount:
          nextPricing.find((t) => t.tier === clinic.tier)?.price?.toString() ??
          data.pricing.toString(),
        paymentNotes: "",
      });
      setShowPaymentDialog(true);
    } catch {
      showUserFacingErrorToast(
        "We could not load these plan details. Please try again.",
      );
    }
  };

  const openAdditionalChargeForClinic = (clinic: Clinic) => {
    setAdditionalChargeClinic(clinic);
    const defaultAmount = guidedSetupPresetAmount(clinic.currency);
    additionalChargeForm.reset({
      category: "GUIDED_SETUP",
      amount: defaultAmount,
      paymentMethod: "manual",
      razorpayPaymentId: "",
      notes: "",
    });
    setShowAdditionalChargeDialog(true);
  };

  const recordAdditionalChargeMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      client.post(
        `/internal/clinics/${additionalChargeClinic?.id}/additional-charge`,
        data,
      ),
    onSuccess: async () => {
      const currencySnapshot = additionalChargeClinic?.currency;
      toast.success("Additional charge recorded");
      setShowAdditionalChargeDialog(false);
      setAdditionalChargeClinic(null);
      additionalChargeForm.reset({
        category: "GUIDED_SETUP",
        amount: guidedSetupPresetAmount(currencySnapshot),
        paymentMethod: "manual",
        razorpayPaymentId: "",
        notes: "",
      });
      await clinicsQuery.refetch();
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      client.post(`/internal/clinics/${selectedClinic?.id}/process-payment`, {
        paymentId: `PAY_${Date.now()}`,
        amount: parseFloat(data.amount),
        currency: selectedClinic?.currency || DEFAULT_CURRENCY,
        newTier: data.newTier,
        paymentMethod: data.paymentMethod,
        notes: data.paymentNotes,
      }),
    onSuccess: async () => {
      toast.success("Payment processed and tier updated successfully");
      setShowPaymentDialog(false);
      await clinicsQuery.refetch();
      form.reset({
        paymentMethod: "razorpay",
        amount: "",
        newTier: "",
        paymentNotes: "",
      });
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedClinic || !token) return;

    try {
      await processPaymentMutation.mutateAsync(data);
    } catch {
      showUserFacingErrorToast(
        "We could not process this payment. Please try again.",
      );
    }
  };

  const onSubmitAdditionalCharge = async (raw: AdditionalChargeFormData) => {
    if (!additionalChargeClinic || !token) return;

    const amount = Number.parseFloat(raw.amount);
    const parsed = recordInternalAdditionalChargeRequestSchema.safeParse({
      category: raw.category,
      paymentMethod: raw.paymentMethod,
      amount,
      currency: additionalChargeClinic.currency || DEFAULT_CURRENCY,
      razorpayPaymentId: raw.razorpayPaymentId.trim() || undefined,
      notes: raw.notes.trim() || undefined,
    });

    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors;
      const msg =
        first.amount?.[0] ??
        first.category?.[0] ??
        first.paymentMethod?.[0] ??
        "Check the form and try again.";
      showUserFacingErrorToast(msg);
      return;
    }

    try {
      await recordAdditionalChargeMutation.mutateAsync(parsed.data);
    } catch {
      showUserFacingErrorToast(
        "We could not record this charge. Please try again.",
      );
    }
  };

  const onSavePricingOffer = pricingOfferForm.handleSubmit(async (data) => {
    const percent = Number.parseFloat(data.percentOff);
    if (!Number.isFinite(percent) || percent < 0 || percent > 95) {
      showUserFacingErrorToast(
        "Percent off must be a number between 0 and 95.",
      );
      return;
    }
    if (!data.clinicId) {
      showUserFacingErrorToast("Select a facility.");
      return;
    }
    try {
      await savePricingOfferMutation.mutateAsync({
        clinicId: data.clinicId,
        title: data.title.trim() || "Commercial discount",
        percentOff: percent,
        validUntil: data.validUntil.trim() || undefined,
        notes: data.notes.trim() || undefined,
      });
    } catch {
      showUserFacingErrorToast(
        "We could not save this checkout discount. Please try again.",
      );
    }
  });

  const getTierBadgeColor = (tier: string) => {
    const colors: Record<string, string> = {
      CAPTURE: "tier-capture",
      CORE: "tier-core",
      PLUS: "tier-plus",
      PRO: "tier-pro",
      ENTERPRISE: "tier-enterprise",
    };
    return colors[tier] || "tier-capture";
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
        aria-label="Loading payment processing"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8 text-muted-foreground"
        />
      </div>
    );
  }

  if (!isInternal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payment Processing"
        description="Record subscription payments and tier changes, or bill add-on services including guided setup"
        size="compact"
      />

      {loading ? (
        <div
          className="flex items-center justify-center py-12"
          role="status"
          aria-live="polite"
          aria-label="Loading tier pricing"
        >
          <DocitaLoadingIndicator
            variant="section"
            withStatusRole={false}
            iconClassName="h-8 w-8 text-muted-foreground"
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {tierPricing && tierPricing.length > 0 ? (
              tierPricing.map((tier) => (
                <Card key={tier.tier}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold">
                      {tier.tier}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                        {tier.price === 0 ? "Free" : formatCurrency(tier.price)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tier.billingCycle}
                      </p>
                      <div className="space-y-1 pt-2 border-t">
                        <p className="text-xs">
                          <strong>{tier.maxDoctors}</strong> doctors
                        </p>
                        <p className="text-xs">
                          <strong>{tier.maxPatients}</strong> patients
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full">
                <EmptyState
                  icon={TrendingUp}
                  title="No tier pricing information available"
                  description="Pricing tiers will appear here once billing configuration is available."
                />
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Facilities Payment Management
              </CardTitle>
              <CardDescription>
                Select a facility to change plan and record subscription
                payment, or record an add-on charge (for example guided setup)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clinics.length === 0 ? (
                <EmptyState
                  icon={CreditCard}
                  title="No facilities found"
                  description="Facilities will appear here once they are provisioned for billing."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility Name</TableHead>
                      <TableHead>Current Tier</TableHead>
                      <TableHead>Max Doctors</TableHead>
                      <TableHead>Max Patients</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(clinics) &&
                      clinics.map((clinic) => (
                        <TableRow key={clinic.id}>
                          <TableCell className="font-medium">
                            {clinic.name}
                          </TableCell>
                          <TableCell>
                            <Badge className={getTierBadgeColor(clinic.tier)}>
                              {clinic.tier}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {tierPricing.find((t) => t.tier === clinic.tier)
                              ?.maxDoctors || "-"}
                          </TableCell>
                          <TableCell>
                            {tierPricing.find((t) => t.tier === clinic.tier)
                              ?.maxPatients || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {clinic.email}
                          </TableCell>
                          <TableCell className="text-sm">
                            {clinic.currency || DEFAULT_CURRENCY}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                onClick={() => loadClinicTierInfo(clinic)}
                                className="gap-2"
                              >
                                <TrendingUp className="h-4 w-4" />
                                Manage plan payment
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  openAdditionalChargeForClinic(clinic)
                                }
                                className="gap-2"
                              >
                                <Receipt className="h-4 w-4" />
                                Add-on charge
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5" aria-hidden />
                Checkout discounts (subscription)
              </CardTitle>
              <CardDescription>
                Apply a percent-off offer to the facility&apos;s next
                subscription checkout (Razorpay). Separate from add-on charges.
                Remove the offer when it should no longer apply.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {pricingOffersQuery.isLoading ? (
                <div className="flex justify-center py-6" role="status">
                  <DocitaLoadingIndicator
                    variant="section"
                    withStatusRole={false}
                    iconClassName="h-6 w-6 text-muted-foreground"
                  />
                </div>
              ) : (pricingOffersQuery.data ?? []).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Facility</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Percent off</TableHead>
                      <TableHead>Valid until</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(pricingOffersQuery.data ?? []).map(
                      (row: PricingOfferRow) => (
                        <TableRow key={row.id}>
                          <TableCell className="font-medium">
                            {row.clinic?.name ?? row.clinicId}
                          </TableCell>
                          <TableCell className="text-sm">{row.title}</TableCell>
                          <TableCell className="tabular-nums">
                            {row.percentOff}%
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {row.validUntil ?? "—"}
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={deletePricingOfferMutation.isPending}
                              onClick={async () => {
                                try {
                                  await deletePricingOfferMutation.mutateAsync(
                                    row.clinicId,
                                  );
                                } catch {
                                  showUserFacingErrorToast(
                                    "Could not remove checkout discount.",
                                  );
                                }
                              }}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active checkout discounts.
                </p>
              )}

              <Form {...pricingOfferForm}>
                <form
                  onSubmit={onSavePricingOffer}
                  className="space-y-4 border-t border-border/60 pt-4"
                  noValidate
                >
                  <FormField
                    control={pricingOfferForm.control}
                    name="clinicId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Facility</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select facility" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {clinics.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingOfferForm.control}
                    name="percentOff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percent off checkout</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            max={95}
                            step={1}
                            placeholder="Enter percent"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Applied to list price at subscription checkout (max
                          95).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingOfferForm.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Commercial discount" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingOfferForm.control}
                    name="validUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="pricing-offer-valid-until">
                          Valid until (optional)
                        </FormLabel>
                        <FormControl>
                          <IsoDatePickerField
                            id="pricing-offer-valid-until"
                            label=""
                            showLabel={false}
                            value={
                              typeof field.value === "string" ? field.value : ""
                            }
                            onChange={field.onChange}
                            placeholder="Select date"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={pricingOfferForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Internal notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Reason for discount, approval ref, etc."
                            className="min-h-[80px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      disabled={savePricingOfferMutation.isPending}
                    >
                      {savePricingOfferMutation.isPending && (
                        <DocitaLoadingIndicator
                          variant="inline"
                          decorative
                          className="mr-2"
                        />
                      )}
                      {savePricingOfferMutation.isPending
                        ? "Saving…"
                        : "Save discount"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Payment Processing - {selectedClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Process payment and update clinic tier
            </DialogDescription>
          </DialogHeader>

          {tierInfo && (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Tier
                    </p>
                    <Badge className={getTierBadgeColor(tierInfo.currentTier)}>
                      {tierInfo.currentTier}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      Current Price
                    </p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(
                        selectedTierPricing.find(
                          (t) => t.tier === tierInfo.currentTier,
                        )?.price ?? tierInfo.pricing,
                        {
                          currency:
                            selectedClinic?.currency || DEFAULT_CURRENCY,
                          fractionDigits: 0,
                        },
                      )}
                    </p>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="newTier"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Upgrade to Tier</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(value) => {
                          field.onChange(value);
                          const tierData = (
                            selectedTierPricing.length > 0
                              ? selectedTierPricing
                              : tierPricing
                          ).find((t) => t.tier === value);
                          if (tierData) {
                            form.setValue("amount", tierData.price.toString());
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(selectedTierPricing.length > 0
                            ? selectedTierPricing
                            : tierPricing
                          ).map((tier) => (
                            <SelectItem key={tier.tier} value={tier.tier}>
                              {tier.tier} -{" "}
                              {formatCurrency(tier.price, {
                                currency:
                                  selectedClinic?.currency || DEFAULT_CURRENCY,
                                fractionDigits: 0,
                              })}
                              /{tier.billingCycle}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Select the new tier for this facility
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Amount ({selectedClinic?.currency || DEFAULT_CURRENCY})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="Amount"
                          {...field}
                          disabled
                        />
                      </FormControl>
                      <FormDescription>
                        Amount will be auto-calculated based on selected tier
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        value={field.value ?? "razorpay"}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="razorpay">Razorpay</SelectItem>
                          <SelectItem value="stripe">Stripe</SelectItem>
                          <SelectItem value="bank_transfer">
                            Bank Transfer
                          </SelectItem>
                          <SelectItem value="manual">Manual</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Payment notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowPaymentDialog(false)}
                    disabled={processPaymentMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={processPaymentMutation.isPending}
                  >
                    {processPaymentMutation.isPending && (
                      <DocitaLoadingIndicator
                        variant="inline"
                        decorative
                        className="mr-2"
                      />
                    )}
                    {processPaymentMutation.isPending
                      ? "Processing…"
                      : "Process Payment"}
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAdditionalChargeDialog}
        onOpenChange={(open) => {
          setShowAdditionalChargeDialog(open);
          if (!open) {
            setAdditionalChargeClinic(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Add-on charge — {additionalChargeClinic?.name}
            </DialogTitle>
            <DialogDescription>
              Records a paid one-off charge (for example guided setup) in
              billing history. This does not change the clinic subscription
              tier.
            </DialogDescription>
          </DialogHeader>

          <Form {...additionalChargeForm}>
            <form
              onSubmit={additionalChargeForm.handleSubmit(
                onSubmitAdditionalCharge,
              )}
              noValidate
              className="space-y-4"
            >
              <FormField
                control={additionalChargeForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Charge category</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "GUIDED_SETUP") {
                          additionalChargeForm.setValue(
                            "amount",
                            guidedSetupPresetAmount(
                              additionalChargeClinic?.currency,
                            ),
                          );
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="GUIDED_SETUP">
                          Guided setup
                        </SelectItem>
                        <SelectItem value="DATA_MIGRATION">
                          Data migration
                        </SelectItem>
                        <SelectItem value="CUSTOM_TRAINING">
                          Custom training
                        </SelectItem>
                        <SelectItem value="INTEGRATION">Integration</SelectItem>
                        <SelectItem value="COMMERCIAL_DISCOUNT">
                          Commercial discount / adjustment
                        </SelectItem>
                        <SelectItem value="OTHER">Other service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Guided setup is separate from the software subscription.
                      Default amount follows the list price for the
                      clinic&apos;s currency; adjust to match your invoice.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Amount (
                      {additionalChargeClinic?.currency || DEFAULT_CURRENCY})
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step="1"
                        placeholder="Enter amount"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank transfer
                        </SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="razorpayPaymentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razorpay payment ID (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter Razorpay payment id"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={additionalChargeForm.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Scope, invoice reference, or internal note"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAdditionalChargeDialog(false)}
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={recordAdditionalChargeMutation.isPending}
                >
                  {recordAdditionalChargeMutation.isPending && (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                  )}
                  {recordAdditionalChargeMutation.isPending
                    ? "Saving…"
                    : "Record charge"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
