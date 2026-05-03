"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { PageHeader } from "@workspace/ui/components/page-header";
import { EmptyState } from "@workspace/ui/components/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { CreditCard, Receipt, TrendingUp } from "lucide-react";
import {
  GUIDED_SETUP_LIST_PRICE_BY_CURRENCY,
  recordInternalAdditionalChargeRequestSchema,
  type SupportedCurrency,
} from "@workspace/types";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { internalQueryKeys } from "@/lib/query-keys";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DEFAULT_CURRENCY, formatCurrency } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface Clinic {
  id: string;
  name: string;
  tier: string;
  email: string;
  phone: string;
  currency?: string;
}

interface TierInfo {
  currentTier: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
  pricing: number;
}

interface TierPricing {
  tier: string;
  price: number;
  billingCycle: string;
  maxDoctors: number;
  maxPatients: number;
  features: string[];
}

interface PaymentFormData {
  paymentMethod: string;
  amount: string;
  newTier: string;
  paymentNotes?: string;
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
      GUIDED_SETUP_LIST_PRICE_BY_CURRENCY[key as SupportedCurrency],
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
  const form = useForm<PaymentFormData>({
    defaultValues: {
      paymentMethod: "razorpay",
      amount: "",
      newTier: "",
      paymentNotes: "",
    },
  });
  const clinicsQuery = useQuery({
    queryKey: internalQueryKeys.internal.clinics(),
    queryFn: async () => {
      const data = await client.get<Clinic[] | { items?: Clinic[] }>(
        "/internal/clinics",
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    enabled: Boolean(isInternal && token),
  });

  const tierPricingQuery = useQuery({
    queryKey: internalQueryKeys.internal.pricingTiers(),
    queryFn: async () => {
      try {
        const data = await client.get<{ tiers?: TierPricing[] }>(
          "/internal/tier-pricing",
        );
        return Array.isArray(data.tiers) ? data.tiers : DEFAULT_TIERS;
      } catch {
        return DEFAULT_TIERS;
      }
    },
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

  const clinics = clinicsQuery.data ?? [];
  const tierPricing = tierPricingQuery.data ?? DEFAULT_TIERS;
  const loading = clinicsQuery.isLoading || tierPricingQuery.isLoading;

  const loadClinicTierInfo = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["internal", "clinic", clinic.id, "tier-info"],
        queryFn: () =>
          client.get<TierInfo>(`/internal/clinics/${clinic.id}/tier-info`),
      });

      const pricingData = await queryClient.fetchQuery({
        queryKey: ["pricing", "config", clinic.currency || DEFAULT_CURRENCY],
        queryFn: () =>
          client.get<{
            tiers?: Array<{ id: string; pricing?: { monthly?: number } }>;
          }>(`/pricing/config?currency=${clinic.currency || DEFAULT_CURRENCY}`),
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
        description="Record subscription payments and tier changes, or bill add-on services such as guided setup"
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
                        <Input
                          placeholder="Payment notes"
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
                      <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
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
                    <Select
                      value={field.value}
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
