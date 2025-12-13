"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Progress } from "@workspace/ui/components/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bot,
  Brain,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Crown,
  Gift,
  Loader2,
  Pill,
  RefreshCw,
  Share2,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import {
  getFeatureComparisonData,
  getPlanHighlights,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import { useTierConfig } from "@/lib/tier-config-context";

// Declare Razorpay on window
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

interface RazorpayInstance {
  open: () => void;
  close: () => void;
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Plan tiers to display
const DISPLAY_TIERS = [
  Tier.CAPTURE,
  Tier.CORE,
  Tier.PLUS,
  Tier.PRO,
  Tier.ENTERPRISE,
];

// Icon mapping for intelligence addons
const ADDON_ICONS = {
  Brain: Brain,
  Pill: Pill,
  Bot: Bot,
};

export type SubscriptionSettingsProps = object;

export function SubscriptionSettings() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<
    "MONTHLY" | "YEARLY"
  >("MONTHLY");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState("");
  const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(
    null,
  );

  // Context and stores
  const { currentTier } = usePermissionStore();
  const { clinic, refreshClinic } = useClinic();

  // Tier config from backend
  const {
    config,
    isLoading: isTierConfigLoading,
    getPlanPricing,
    getPlanLimits,
    getPlanDescription,
    getIntelligenceBundlePrice,
  } = useTierConfig();

  // Billing API hooks
  const { data: billingStatus, refetch: refetchBillingStatus } =
    apiHooks.useBillingStatus();
  const { data: _paymentHistory } = apiHooks.usePaymentHistory();
  const { data: referralCode } = apiHooks.useReferralCode();
  const { data: referralStats } = apiHooks.useReferralStats();
  const { data: referralHistory } = apiHooks.useReferralHistory();
  const { data: dashboardStats } = apiHooks.useDashboardStats();

  // Mutations
  const createCheckoutMutation = apiHooks.useCreateCheckout();
  const activateSubscriptionMutation = apiHooks.useActivateSubscription();
  const cancelSubscriptionMutation = apiHooks.useCancelSubscription();
  const applyReferralMutation = apiHooks.useApplyReferralCode();

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  // Calculate trial days left
  const trialDaysLeft = clinic?.trialEndsAt
    ? Math.max(
        0,
        Math.ceil(
          (new Date(clinic.trialEndsAt).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24),
        ),
      )
    : 0;

  // Usage stats
  const limits = getPlanLimits(currentTier);
  const usageStats = {
    patients: {
      used: dashboardStats?.totalPatients || 0,
      limit: limits.patients,
    },
    doctors: { used: dashboardStats?.totalDoctors || 0, limit: limits.doctors },
    storage: {
      used: dashboardStats?.storageUsed || 0,
      limit: limits.storageGB,
    },
  };

  // Intelligence addons
  const intelligenceAddons = useMemo(
    () =>
      config?.intelligenceAddons || [
        {
          feature: "AI_DIAGNOSIS_HINTS",
          name: "AI Diagnosis Assist",
          description: "Get AI-powered diagnosis suggestions based on symptoms",
          monthlyPrice: 1999,
          icon: "Brain",
        },
        {
          feature: "AI_PRESCRIPTION_ASSISTANT",
          name: "AI Prescription Assistant",
          description: "Smart prescription suggestions and drug interactions",
          monthlyPrice: 999,
          icon: "Pill",
        },
        {
          feature: "SMART_TASK_ENGINE",
          name: "Smart Task Engine",
          description: "AI-powered workflow automation and reminders",
          monthlyPrice: 1499,
          icon: "Bot",
        },
      ],
    [config],
  );

  // Event handlers
  const handleRefreshTier = async () => {
    setIsRefreshing(true);
    try {
      await refreshClinic();
      await refetchBillingStatus();
      toast.success("Subscription status refreshed");
    } catch {
      toast.error("Failed to refresh subscription status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpgrade = (tier: Tier) => {
    setSelectedTier(tier);
    setSelectedBillingCycle("MONTHLY");
    setAppliedReferralCode(null);
    setReferralCodeInput("");
    setShowUpgradeDialog(true);
  };

  const handleApplyReferralCode = useCallback(async () => {
    if (!referralCodeInput.trim()) return;

    try {
      const result = await applyReferralMutation.mutateAsync({
        referralCode: referralCodeInput.trim(),
      });
      if (result.success) {
        setAppliedReferralCode(referralCodeInput.trim());
        toast.success(
          `Referral code applied! You'll get ${result.discountPercent}% off your first month.`,
        );
      }
    } catch {
      toast.error("Invalid referral code");
    }
  }, [referralCodeInput, applyReferralMutation]);

  const handleConfirmUpgrade = async () => {
    if (!selectedTier || selectedTier === Tier.ENTERPRISE) {
      window.open(
        "mailto:sales@docita.in?subject=Enterprise Plan Inquiry",
        "_blank",
      );
      setShowUpgradeDialog(false);
      return;
    }

    setIsProcessingPayment(true);

    try {
      const tierName = Tier[selectedTier] as string;

      const checkoutData = await createCheckoutMutation.mutateAsync({
        tier: tierName,
        billingCycle: selectedBillingCycle,
        referralCode: appliedReferralCode || undefined,
      });

      const options: RazorpayOptions = {
        key: checkoutData.razorpayKeyId,
        amount: checkoutData.amount,
        currency: checkoutData.currency,
        name: "Docita",
        description: `${tierName} Plan - ${selectedBillingCycle === "YEARLY" ? "Annual" : "Monthly"}`,
        order_id: checkoutData.orderId,
        prefill: checkoutData.prefill,
        theme: { color: "#6366f1" },
        handler: async (response: RazorpayResponse) => {
          try {
            await activateSubscriptionMutation.mutateAsync({
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature,
              tier: tierName,
              billingCycle: selectedBillingCycle,
            });
            toast.success("Subscription activated successfully!");
            await refreshClinic();
            await refetchBillingStatus();
            setShowUpgradeDialog(false);
          } catch {
            toast.error(
              "Failed to activate subscription. Please contact support.",
            );
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: () => setIsProcessingPayment(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Unable to process upgrade. Please try again.";
      toast.error(errorMessage);
      setIsProcessingPayment(false);
    }
  };

  const _handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You'll have access until the end of your current billing period.",
      )
    ) {
      return;
    }

    try {
      await cancelSubscriptionMutation.mutateAsync({ immediate: false });
      toast.success(
        "Subscription will be cancelled at the end of the billing period.",
      );
      await refetchBillingStatus();
    } catch {
      toast.error("Failed to cancel subscription. Please contact support.");
    }
  };

  const handleCopyReferralCode = useCallback(() => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      toast.success("Referral code copied!");
    }
  }, [referralCode?.code]);

  const handleShareReferralLink = useCallback(() => {
    if (referralCode?.referralLink) {
      if (navigator.share) {
        navigator.share({
          title: "Join Docita",
          text: "Sign up for Docita using my referral link and get 25% off your first month!",
          url: referralCode.referralLink,
        });
      } else {
        navigator.clipboard.writeText(referralCode.referralLink);
        toast.success("Referral link copied!");
      }
    }
  }, [referralCode?.referralLink]);

  // Derived state
  const comparisonData = getFeatureComparisonData();
  const subscriptionStatus = billingStatus?.subscription;
  const isInGracePeriod = subscriptionStatus?.status === "GRACE_PERIOD";
  const isCancelledButActive = subscriptionStatus?.cancelAtPeriodEnd;

  return (
    <div className="space-y-8">
      {/* Status Alerts */}
      {isInGracePeriod && (
        <Card className="border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="flex-1">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Your subscription has expired
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Renew now to avoid being downgraded to the free tier.
              </p>
            </div>
            <Button onClick={() => handleUpgrade(currentTier)}>
              Renew Now
            </Button>
          </CardContent>
        </Card>
      )}

      {isCancelledButActive && (
        <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/30">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-orange-600" />
            <div className="flex-1">
              <p className="font-medium text-orange-800 dark:text-orange-200">
                Subscription scheduled for cancellation
              </p>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Access continues until end of billing period.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => handleUpgrade(currentTier)}
            >
              Reactivate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="plans" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    Current Plan
                    <Badge
                      className={cn(
                        "ml-2",
                        getTierInfo(currentTier).color === "gray" &&
                          "bg-gray-100 text-gray-700",
                        getTierInfo(currentTier).color === "blue" &&
                          "bg-blue-100 text-blue-700",
                        getTierInfo(currentTier).color === "green" &&
                          "bg-green-100 text-green-700",
                        getTierInfo(currentTier).color === "purple" &&
                          "bg-purple-100 text-purple-700",
                        getTierInfo(currentTier).color === "orange" &&
                          "bg-orange-100 text-orange-700",
                      )}
                    >
                      {getTierInfo(currentTier).name}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={handleRefreshTier}
                      disabled={isRefreshing}
                    >
                      <RefreshCw
                        className={cn(
                          "h-4 w-4",
                          isRefreshing && "animate-spin",
                        )}
                      />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Your subscription details and usage
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {billingStatus?.referralCredits &&
                    billingStatus.referralCredits > 0 && (
                      <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                      >
                        <Gift className="h-3 w-3 mr-1" />
                        {billingStatus.referralCredits} free month
                        {billingStatus.referralCredits > 1 ? "s" : ""}
                      </Badge>
                    )}
                  {trialDaysLeft > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-yellow-50 text-yellow-700 border-yellow-200"
                    >
                      <Clock className="h-3 w-3 mr-1" />
                      {trialDaysLeft} days trial
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Patients</span>
                    <span className="font-medium">
                      {usageStats.patients.used.toLocaleString()} /{" "}
                      {usageStats.patients.limit === 999999
                        ? "∞"
                        : usageStats.patients.limit.toLocaleString()}
                    </span>
                  </div>
                  <Progress
                    value={
                      usageStats.patients.limit === 999999
                        ? 0
                        : (usageStats.patients.used /
                            usageStats.patients.limit) *
                          100
                    }
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Doctors</span>
                    <span className="font-medium">
                      {usageStats.doctors.used} /{" "}
                      {usageStats.doctors.limit === 999
                        ? "∞"
                        : usageStats.doctors.limit}
                    </span>
                  </div>
                  <Progress
                    value={
                      usageStats.doctors.limit === 999
                        ? 0
                        : (usageStats.doctors.used / usageStats.doctors.limit) *
                          100
                    }
                    className="h-2"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Storage</span>
                    <span className="font-medium">
                      {usageStats.storage.used} GB / {usageStats.storage.limit}{" "}
                      GB
                    </span>
                  </div>
                  <Progress
                    value={
                      (usageStats.storage.used / usageStats.storage.limit) * 100
                    }
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4">
            <span
              className={cn(
                "text-sm font-medium",
                selectedBillingCycle === "MONTHLY"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Monthly
            </span>
            <button
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                selectedBillingCycle === "YEARLY"
                  ? "bg-primary"
                  : "bg-muted-foreground/30",
              )}
              onClick={() =>
                setSelectedBillingCycle(
                  selectedBillingCycle === "MONTHLY" ? "YEARLY" : "MONTHLY",
                )
              }
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  selectedBillingCycle === "YEARLY"
                    ? "translate-x-6"
                    : "translate-x-1",
                )}
              />
            </button>
            <span
              className={cn(
                "text-sm font-medium flex items-center gap-1",
                selectedBillingCycle === "YEARLY"
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              Yearly
              <Badge variant="secondary" className="text-xs">
                Save 10%
              </Badge>
            </span>
          </div>

          {/* Available Plans Grid */}
          {isTierConfigLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {DISPLAY_TIERS.map((tier) => {
                const isCurrentPlan = tier === currentTier;
                const isUpgrade = tier > currentTier;
                const pricing = getPlanPricing(tier);
                const description = getPlanDescription(tier);
                const highlights = getPlanHighlights(tier);
                const isPopular = tier === Tier.PLUS;
                const isEnterprise = tier === Tier.ENTERPRISE;

                const displayPrice =
                  selectedBillingCycle === "YEARLY"
                    ? pricing.yearly
                    : pricing.monthly;

                return (
                  <Card
                    key={tier}
                    className={cn(
                      "relative",
                      isPopular && "border-primary ring-1 ring-primary",
                      isCurrentPlan && "border-2 border-primary",
                    )}
                  >
                    {isPopular && !isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    {isCurrentPlan && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge variant="outline" className="bg-background">
                          Current Plan
                        </Badge>
                      </div>
                    )}

                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center gap-2">
                        {isEnterprise ? (
                          <Building2 className="h-5 w-5 text-purple-600" />
                        ) : tier >= Tier.PRO ? (
                          <Crown className="h-5 w-5 text-amber-500" />
                        ) : (
                          <Zap className="h-5 w-5 text-blue-500" />
                        )}
                        {getTierInfo(tier).name.replace("Docita ", "")}
                      </CardTitle>
                      <CardDescription className="min-h-10">
                        {description.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="mb-4">
                        {typeof displayPrice === "number" ? (
                          <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-bold">
                              {pricing.currency}
                              {selectedBillingCycle === "YEARLY"
                                ? Math.round(displayPrice / 12)
                                : displayPrice}
                            </span>
                            <span className="text-muted-foreground text-sm">
                              /month
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-2xl font-bold">Custom</span>
                            <p className="text-sm text-muted-foreground">
                              Contact us
                            </p>
                          </div>
                        )}
                        {selectedBillingCycle === "YEARLY" &&
                          typeof displayPrice === "number" && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Billed {pricing.currency}
                              {displayPrice}/year
                            </p>
                          )}
                      </div>

                      <ul className="space-y-2 text-sm">
                        {highlights.slice(0, 5).map((feature, idx) => (
                          <li
                            key={idx}
                            className={cn(
                              "flex items-center gap-2",
                              !feature.included && "text-muted-foreground",
                            )}
                          >
                            {feature.included ? (
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  feature.highlight
                                    ? "text-primary"
                                    : "text-green-600",
                                )}
                              />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground/50" />
                            )}
                            <span
                              className={cn(feature.highlight && "font-medium")}
                            >
                              {feature.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      {isCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : isUpgrade ? (
                        <Button
                          className="w-full"
                          onClick={() => handleUpgrade(tier)}
                        >
                          {isEnterprise ? "Contact Sales" : "Upgrade"}
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleUpgrade(tier)}
                        >
                          Downgrade
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Intelligence Add-ons */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    Intelligence Add-ons
                  </CardTitle>
                  <CardDescription>
                    Enhance your clinic with AI-powered features
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200"
                >
                  AI Features
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {intelligenceAddons.map((addon) => {
                  const IconComponent =
                    ADDON_ICONS[addon.icon as keyof typeof ADDON_ICONS] ||
                    Brain;
                  return (
                    <Card key={addon.feature} className="border-dashed">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                            <IconComponent className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium">{addon.name}</h4>
                            <p className="text-sm text-muted-foreground mt-1">
                              {addon.description}
                            </p>
                            <div className="flex items-center justify-between mt-3">
                              <span className="font-medium">
                                ₹{addon.monthlyPrice}/month
                              </span>
                              <Button size="sm" variant="outline">
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="mt-4 p-4 bg-linear-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-lg border border-purple-100 dark:border-purple-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Brain className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                    <div>
                      <h4 className="font-medium">Intelligence Bundle</h4>
                      <p className="text-sm text-muted-foreground">
                        Get all AI features at{" "}
                        {Math.round(
                          (config?.intelligenceBundleDiscount || 0.4) * 100,
                        )}
                        % discount
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">
                        ₹{getIntelligenceBundlePrice()}
                      </span>
                      <span className="text-muted-foreground line-through text-sm">
                        ₹
                        {intelligenceAddons.reduce(
                          (sum, a) => sum + a.monthlyPrice,
                          0,
                        )}
                      </span>
                    </div>
                    <Button size="sm" className="mt-2">
                      Get Bundle
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referrals Tab */}
        <TabsContent value="referrals" className="space-y-6">
          {/* Referral Code */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Your Referral Code
              </CardTitle>
              <CardDescription>
                Share your code and earn 1 free month for each successful
                referral (max 12 months/year)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 p-4 bg-muted rounded-lg font-mono text-2xl text-center">
                  {referralCode?.code || "Loading..."}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyReferralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleShareReferralLink}
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    Share your referral code with other clinics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    They get 25% off their first month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    You get 1 free month when they subscribe
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Referral Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Referral Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              {referralStats ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold">
                      {referralStats.totalReferrals}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Referrals
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-green-600">
                      {referralStats.convertedReferrals}
                    </p>
                    <p className="text-sm text-muted-foreground">Converted</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold text-primary">
                      {referralStats.remainingCredits}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Free Months Left
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-3xl font-bold">
                      {referralStats.totalCreditsEarned}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Total Earned
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral History */}
          <Card>
            <CardHeader>
              <CardTitle>Referral History</CardTitle>
            </CardHeader>
            <CardContent>
              {referralHistory && referralHistory.length > 0 ? (
                <div className="space-y-3">
                  {referralHistory.map((referral) => (
                    <div
                      key={referral.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">
                          {referral.referredClinicName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            referral.status === "CONVERTED"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {referral.status}
                        </Badge>
                        {referral.creditMonths > 0 && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700"
                          >
                            +{referral.creditMonths} month
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No referrals yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Share your code to start earning free months!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Features Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Feature Comparison</CardTitle>
              <CardDescription>
                See what&apos;s included in each plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 pr-4">Feature</th>
                      {DISPLAY_TIERS.map((tier) => (
                        <th
                          key={tier}
                          className={cn(
                            "text-center py-3 px-2",
                            tier === currentTier && "bg-primary/5",
                          )}
                        >
                          {getTierInfo(tier).name.replace("Docita ", "")}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((row, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="py-3 pr-4 font-medium">{row.name}</td>
                        {DISPLAY_TIERS.map((tier) => {
                          const value = row.values[tier];
                          return (
                            <td
                              key={tier}
                              className={cn(
                                "text-center py-3 px-2",
                                tier === currentTier && "bg-primary/5",
                              )}
                            >
                              {typeof value === "boolean" ? (
                                value ? (
                                  <Check className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <X className="h-4 w-4 text-muted-foreground/50 mx-auto" />
                                )
                              ) : (
                                <span>{value}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedTier !== null && selectedTier > currentTier
                ? "Upgrade"
                : "Change"}{" "}
              to {selectedTier !== null ? getTierInfo(selectedTier).name : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedTier !== null && selectedTier > currentTier
                ? "Unlock more features and higher limits."
                : "Your plan will change at the next billing cycle."}
            </DialogDescription>
          </DialogHeader>

          {selectedTier !== null && (
            <div className="space-y-4">
              {/* Billing Cycle Selection */}
              <div className="flex items-center justify-center gap-4 p-3 bg-muted rounded-lg">
                <button
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedBillingCycle === "MONTHLY"
                      ? "bg-background shadow"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setSelectedBillingCycle("MONTHLY")}
                >
                  Monthly
                </button>
                <button
                  className={cn(
                    "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                    selectedBillingCycle === "YEARLY"
                      ? "bg-background shadow"
                      : "text-muted-foreground",
                  )}
                  onClick={() => setSelectedBillingCycle("YEARLY")}
                >
                  Yearly (Save 10%)
                </button>
              </div>

              {/* Price Display */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {getTierInfo(selectedTier).name}
                  </span>
                  <span className="font-bold">
                    {(() => {
                      const pricing = getPlanPricing(selectedTier);
                      const price =
                        selectedBillingCycle === "YEARLY"
                          ? pricing.yearly
                          : pricing.monthly;
                      if (typeof price === "number") {
                        if (selectedBillingCycle === "YEARLY") {
                          return `${pricing.currency}${Math.round(price / 12)}/month (${pricing.currency}${price}/year)`;
                        }
                        return `${pricing.currency}${price}/month`;
                      }
                      return "Custom pricing";
                    })()}
                  </span>
                </div>
              </div>

              {/* Referral Code Input */}
              {!appliedReferralCode && (
                <div className="space-y-2">
                  <Label>Have a referral code?</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter code"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      onClick={handleApplyReferralCode}
                      disabled={!referralCodeInput.trim()}
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              )}

              {appliedReferralCode && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm">25% off first month applied!</span>
                </div>
              )}

              {/* Features */}
              <ul className="space-y-2">
                {getPlanHighlights(selectedTier)
                  .filter((f) => f.included && f.highlight)
                  .slice(0, 5)
                  .map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600" />
                      {feature.name}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              disabled={isProcessingPayment}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmUpgrade}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : selectedTier === Tier.ENTERPRISE ? (
                "Contact Sales"
              ) : (
                "Pay Now"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
