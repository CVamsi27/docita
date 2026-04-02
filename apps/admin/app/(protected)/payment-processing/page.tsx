"use client";

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
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { CreditCard, Loader2, TrendingUp } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { client } from "@/lib/api-client";
import { adminQueryKeys } from "@/lib/query-keys";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { DEFAULT_CURRENCY } from "@workspace/utils";

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
  const [selectedTierPricing, setSelectedTierPricing] = useState<
    TierPricing[]
  >([]);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  const { token, isSuperAdmin } = useAuth();
  const form = useForm<PaymentFormData>();
  const clinicsQuery = useQuery({
    queryKey: adminQueryKeys.superAdmin.clinics(),
    queryFn: async () => {
      const data = await client.get<Clinic[] | { items?: Clinic[] }>(
        "/super-admin/clinics",
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    enabled: Boolean(isSuperAdmin && token),
  });

  const tierPricingQuery = useQuery({
    queryKey: adminQueryKeys.superAdmin.pricingTiers(),
    queryFn: async () => {
      try {
        const data = await client.get<{ tiers?: TierPricing[] }>(
          "/super-admin/tier-pricing",
        );
        return Array.isArray(data.tiers) ? data.tiers : DEFAULT_TIERS;
      } catch {
        return DEFAULT_TIERS;
      }
    },
    enabled: Boolean(isSuperAdmin && token),
  });

  const clinics = clinicsQuery.data ?? [];
  const tierPricing = tierPricingQuery.data ?? DEFAULT_TIERS;
  const loading = clinicsQuery.isLoading || tierPricingQuery.isLoading;

  const loadClinicTierInfo = async (clinic: Clinic) => {
    if (!token) return;

    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["super-admin", "clinic", clinic.id, "tier-info"],
        queryFn: () =>
          client.get<TierInfo>(`/super-admin/clinics/${clinic.id}/tier-info`),
      });

      const pricingData = await queryClient.fetchQuery({
        queryKey: ["pricing", "config", clinic.currency || DEFAULT_CURRENCY],
        queryFn: () =>
          client.get<{ tiers?: Array<{ id: string; pricing?: { monthly?: number } }> }>(
            `/pricing/config?currency=${clinic.currency || DEFAULT_CURRENCY}`,
          ),
      });
      const nextPricing: TierPricing[] = Array.isArray(pricingData.tiers)
        ? pricingData.tiers.map((tier) => ({
            tier: tier.id,
            price: typeof tier.pricing?.monthly === "number" ? tier.pricing.monthly : 0,
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
      });
      setShowPaymentDialog(true);
    } catch {
      toast.error("Failed to load tier information");
    }
  };

  const processPaymentMutation = useMutation({
    mutationFn: (data: PaymentFormData) =>
      client.post(`/super-admin/clinics/${selectedClinic?.id}/process-payment`, {
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
      form.reset();
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    if (!selectedClinic || !token) return;

    try {
      await processPaymentMutation.mutateAsync(data);
    } catch {
      toast.error("Failed to process payment");
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

  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access denied</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Payment Processing
        </h1>
        <p className="text-muted-foreground">
          Process payments and manage clinic tier upgrades
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {}
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
                      <p className="text-2xl font-bold">
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
              <div className="col-span-full text-center py-8 text-muted-foreground">
                <p>No tier pricing information available</p>
              </div>
            )}
          </div>

          {}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Clinics Payment Management
              </CardTitle>
              <CardDescription>
                Select a clinic to process payment or upgrade tier
              </CardDescription>
            </CardHeader>
            <CardContent>
              {clinics.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No clinics found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                  <TableRow>
                      <TableHead>Clinic Name</TableHead>
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
                            <Button
                              size="sm"
                              onClick={() => loadClinicTierInfo(clinic)}
                              className="gap-2"
                            >
                              <TrendingUp className="h-4 w-4" />
                              Manage Payment
                            </Button>
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

      {}
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
                      (selectedTierPricing.find(
                        (t) => t.tier === tierInfo.currentTier,
                      )?.price ?? tierInfo.pricing),
                      selectedClinic?.currency || DEFAULT_CURRENCY,
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
                        ).find(
                          (t) => t.tier === value,
                        );
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
                            {tier.tier} - {formatCurrency(
                              tier.price,
                              selectedClinic?.currency || DEFAULT_CURRENCY,
                            )}
                            /
                            {tier.billingCycle}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select the new tier for this clinic
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
                        placeholder="0"
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
                        placeholder="Add any notes about this payment..."
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
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {processPaymentMutation.isPending
                    ? "Processing..."
                    : "Process Payment"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
