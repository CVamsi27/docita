"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { usePermissionStore } from "@/lib/stores/permission-store";
import {
  Feature,
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
} from "@/lib/tier-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { ContactSalesModal } from "@/features/dialogs/components/ContactSalesModalContainer";
import { PricingDialog } from "@/features/subscription/components/PricingDialog";
import { TierChangeDialog } from "@/features/subscription/components/TierChangeDialog";
import { TierCard } from "@/features/subscription/components/TierCard";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import { LockedFeatures } from "@/features/subscription/components/cards/LockedFeatures";
import { NextTierPromotion } from "@/features/subscription/components/cards/NextTierPromotion";
import {
  Crown,
  FileText,
  MessageCircle,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  AddonCard,
  AddonFeature,
} from "@/features/subscription/components/AddonCard";
import { cn } from "@workspace/ui/lib/utils";
import type { TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { useRazorpay } from "@/hooks/use-razorpay";
import { useClinic } from "@/lib/clinic-context";
import { usePricingConfig } from "@/hooks/api/use-pricing";
import { TrustSection } from "@/features/subscription/components/TrustSection";
import { FaqSection } from "@/features/subscription/components/FaqSection";
import { ComparisonTable } from "@/features/subscription/components/ComparisonTable";
import { PaymentSuccessModal } from "@/features/subscription/components/PaymentSuccessModal";
import { InvoiceHistoryDialog } from "@/features/subscription/components/InvoiceHistoryDialog";

export default function UpgradePage() {
  const { currentTier, hasIntelligence, canAccess, setTier } =
    usePermissionStore();
  const { user, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<TierName | null>(null);
  const [purchasingAddon, setPurchasingAddon] = useState<string | null>(null);

  // Phase 3 States
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successData, setSuccessData] = useState<{
    planName: string;
    amount?: number;
    transactionId?: string;
    isAddon?: boolean;
  }>({ planName: "" });
  const [showInvoiceHistory, setShowInvoiceHistory] = useState(false);

  const { isLoaded, openCheckout } = useRazorpay();
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );

  const { clinic } = useClinic();
  const { pricingConfig } = usePricingConfig("INR");

  const currentTierInfo = getTierInfo(currentTier);

  // Determine if clinic has WhatsApp add-on
  // We check features overrides or whatsappAutomation settings
  const hasWhatsApp =
    !!clinic?.features?.["WHATSAPP"] || !!clinic?.whatsappAutomation?.enabled;

  // Calculate WhatsApp Price
  const whatsappAddon = pricingConfig?.addOns?.find(
    (addon) =>
      addon.id === "WHATSAPP" || addon.name?.toLowerCase().includes("whatsapp"),
  );

  // Get pricing for current tier
  const tierKey = currentTierInfo.name.toUpperCase();
  const waPricingByTier = whatsappAddon?.pricingByTier;
  const waTierPricing = waPricingByTier?.[tierKey];

  let whatsappPrice = 799; // Default fallback

  if (waTierPricing) {
    const base = Number(waTierPricing.monthly);
    if (!isNaN(base)) {
      whatsappPrice = base;
    }
  } else if (whatsappAddon?.pricing?.monthly) {
    whatsappPrice = whatsappAddon.pricing.monthly;
  }

  const handlePurchaseAddon = useCallback(
    async (addonId: string, cycle: "MONTHLY" | "YEARLY") => {
      if (!token) return;
      setPurchasingAddon(addonId);

      const apiUrl =
        process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

      try {
        // 1. Create Checkout Session
        const createRes = await fetch(
          `${apiUrl}/subscription/billing/checkout`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              billingCycle: cycle,
              addOns: [addonId],
              // Pass current tier to ensure we don't accidentally upgrade tier
              tier: currentTier,
            }),
          },
        );

        const createData = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createData.message || "Failed to initiate checkout");
        }

        const { orderId, amountCents, currency, razorpayKeyId } = createData;

        // 2. Open Razorpay Checkout
        await openCheckout({
          key: razorpayKeyId,
          amount: amountCents,
          currency: currency,
          name: "Docita Subscription",
          description: `Add-on: ${addonId}`,
          order_id: orderId,
          handler: async (response: Record<string, unknown>) => {
            const data = response as {
              razorpay_payment_id: string;
              razorpay_order_id: string;
              razorpay_signature: string;
            };
            try {
              // 3. Activate Subscription
              const activateRes = await fetch(
                `${apiUrl}/subscription/billing/activate`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    razorpayPaymentId: data.razorpay_payment_id,
                    razorpayOrderId: data.razorpay_order_id,
                    razorpaySignature: data.razorpay_signature,
                    billingCycle: cycle,
                    addOns: [addonId],
                    tier: currentTier,
                  }),
                },
              );

              const activateData = await activateRes.json();
              if (!activateRes.ok) {
                throw new Error(activateData.message || "Activation failed");
              }

              // Success Update
              await queryClient.invalidateQueries({
                queryKey: ["billing-status"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["subscription"],
              });

              // Show Success Modal
              setSuccessData({
                planName: addonId,
                amount: amountCents ? amountCents / 100 : undefined,
                transactionId: data.razorpay_payment_id,
                isAddon: true,
              });
              setShowSuccessModal(true);
            } catch (err: unknown) {
              const errorMessage =
                err instanceof Error
                  ? err.message
                  : "Payment verification failed";
              toast.error(errorMessage);
            }
          },
          prefill: {
            name: user?.name || "Clinic Admin",
            email: user?.email || "",
          },
          theme: {
            color: "#0F172A",
          },
        });
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to process purchase";
        toast.error(errorMessage);
      } finally {
        setPurchasingAddon(null);
      }
    },
    [token, currentTier, openCheckout, user, queryClient],
  );

  // Check if user can access this page (ADMIN, ADMIN_DOCTOR, or SUPER_ADMIN)
  const canAccessPage =
    user?.role === "ADMIN" ||
    user?.role === "ADMIN_DOCTOR" ||
    user?.role === "SUPER_ADMIN";

  // Check if user can change tier (same as canAccessPage)
  const canChangeTier = canAccessPage;

  // Handlers defined before early return to satisfy React Hooks rules
  const handleSelectTier = useCallback(
    (tier: TierName, cycle: "MONTHLY" | "YEARLY") => {
      setSelectedTier(tier);
      setSelectedCycle(cycle);
      setShowPricingDialog(false);
      setShowTierChangeDialog(true);
    },
    [],
  );

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier || !token) return;

    const apiUrl =
      process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";

    try {
      // 1. Create Checkout Session
      const createRes = await fetch(`${apiUrl}/subscription/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedTier,
          billingCycle: selectedCycle,
          addOns: [], // Tier change doesn't include addons by default in new flow
        }),
      });

      const createData = await createRes.json();
      if (!createRes.ok) {
        throw new Error(createData.message || "Failed to initiate checkout");
      }

      const { orderId, amountCents, currency, razorpayKeyId } = createData;

      // 2. Open Razorpay Checkout
      await openCheckout({
        key: razorpayKeyId,
        amount: amountCents,
        currency: currency,
        name: "Docita Subscription",
        description: `Upgrade to ${selectedTier} Plan`,
        order_id: orderId,
        handler: async (response: unknown) => {
          const data = response as {
            razorpay_payment_id: string;
            razorpay_order_id: string;
            razorpay_signature: string;
          };
          try {
            // 3. Activate Subscription
            const activateRes = await fetch(
              `${apiUrl}/subscription/billing/activate`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  razorpayPaymentId: data.razorpay_payment_id,
                  razorpayOrderId: data.razorpay_order_id,
                  razorpaySignature: data.razorpay_signature,
                  tier: selectedTier,
                  billingCycle: selectedCycle,
                  addOns: [],
                }),
              },
            );

            const activateData = await activateRes.json();
            if (!activateRes.ok) {
              throw new Error(activateData.message || "Activation failed");
            }

            // Success Update
            setTier(selectedTier);
            setShowTierChangeDialog(false);
            await queryClient.invalidateQueries({
              queryKey: ["billing-status"],
            });
            await queryClient.invalidateQueries({ queryKey: ["subscription"] });

            // Show Success Modal
            setSuccessData({
              planName: `${selectedTier} Plan`,
              amount: amountCents ? amountCents / 100 : undefined,
              transactionId: data.razorpay_payment_id,
              isAddon: false,
            });
            setShowSuccessModal(true);
          } catch (err: unknown) {
            const errorMessage =
              err instanceof Error
                ? err.message
                : "Payment verification failed";
            toast.error(errorMessage);
          }
        },
        prefill: {
          name: user?.name || "Clinic Admin",
          email: user?.email || "",
        },
        theme: {
          color: "#0F172A", // Slate 900
        },
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process upgrade";
      toast.error(errorMessage);
    }
  }, [
    selectedTier,
    selectedCycle,
    token,
    setTier,
    queryClient,
    openCheckout,
    user,
  ]);

  // Redirect non-admin users to dashboard
  useEffect(() => {
    if (user && !canAccessPage) {
      router.push("/dashboard");
    }
  }, [user, canAccessPage, router]);

  // Don't render page for non-admins (while redirecting)
  if (!user || !canAccessPage) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Ensure Razorpay script is loaded before allowing interactions
  if (!isLoaded) {
    // Optional: show loading state for script
  }

  // Get all features grouped by tier
  const featuresByTier = Object.values(Tier)
    .filter((t): t is Tier => typeof t === "number")
    .map((tier) => ({
      tier,
      info: getTierInfo(tier),
      features: Object.entries(FEATURE_TIER_MAP)
        .filter(([, requiredTier]) => requiredTier === tier)
        .map(([feature]) => ({
          feature: feature as Feature,
          details: getFeatureDetails(feature as Feature),
          hasAccess: canAccess(feature as Feature),
        })),
    }));

  // Get locked features for current tier
  const lockedFeatures = Object.entries(FEATURE_TIER_MAP)
    .filter(([feature]) => !canAccess(feature as Feature))
    .map(([feature, requiredTier]) => ({
      feature: feature as Feature,
      requiredTier,
      details: getFeatureDetails(feature as Feature),
    }));

  const nextTier = currentTier < Tier.ENTERPRISE ? currentTier + 1 : null;

  // Prepare Feature Lists for Addons
  const intelligenceFeatures = featuresByTier
    .find((t) => t.tier === Tier.INTELLIGENCE)
    ?.features.map((f) => ({
      feature: f.feature,
      details: f.details,
    })) as AddonFeature[];

  const whatsappFeatures: AddonFeature[] = [
    {
      feature: "WA_MESSAGING" as Feature,
      details: {
        name: "WhatsApp Messaging",
        description: "Send automated messages to patients on WhatsApp",
        icon: MessageCircle,
      },
    },
    {
      feature: "WA_REMINDERS" as Feature,
      details: {
        name: "Appointment Reminders",
        description: "Reduce no-shows with automated reminders",
        icon: MessageCircle,
      },
    },
    {
      feature: "WA_DOCUMENT_SHARING" as Feature,
      details: {
        name: "Document Sharing",
        description: "Share prescriptions and reports instantly",
        icon: MessageCircle,
      },
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 bg-linear-to-br from-background via-background to-muted/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/30 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Upgrade Your Plan
          </h1>
          <p className="text-muted-foreground">
            Unlock powerful features to grow your practice
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInvoiceHistory(true)}
        >
          <FileText className="mr-2 h-4 w-4" />
          Billing History
        </Button>
      </div>

      {/* Current Plan Card */}
      <Card className="relative overflow-hidden border-2 border-primary/20 bg-linear-to-br from-primary/5 via-background to-background dark:from-primary/10 dark:via-slate-900 dark:to-slate-800/50">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br shadow-lg",
                  currentTierInfo.color === "gray" &&
                    "from-slate-500 to-slate-600",
                  currentTierInfo.color === "blue" &&
                    "from-blue-500 to-blue-600",
                  currentTierInfo.color === "green" &&
                    "from-emerald-500 to-emerald-600",
                  currentTierInfo.color === "purple" &&
                    "from-violet-500 to-purple-600",
                  currentTierInfo.color === "orange" &&
                    "from-amber-500 to-orange-600",
                )}
              >
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {currentTierInfo.name} Plan
                </CardTitle>
                <CardDescription>{currentTierInfo.description}</CardDescription>
              </div>
            </div>
            <Badge
              variant="secondary"
              className={cn(
                "text-sm px-3 py-1",
                currentTierInfo.color === "gray" &&
                  "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                currentTierInfo.color === "blue" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
                currentTierInfo.color === "green" &&
                  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                currentTierInfo.color === "purple" &&
                  "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
                currentTierInfo.color === "orange" &&
                  "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
              )}
            >
              Tier {currentTier}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasIntelligence && (
            <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">
                Intelligence Add-on Active
              </span>
            </div>
          )}

          {/* Quick Actions */}
          {canChangeTier && (
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                onClick={() => setShowPricingDialog(true)}
                className="bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                <TrendingUp className="mr-2 h-4 w-4" />
                Change Plan
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPricingDialog(true)}
              >
                <Receipt className="mr-2 h-4 w-4" />
                View All Plans
              </Button>
            </div>
          )}

          {!canChangeTier && (
            <p className="text-sm text-muted-foreground">
              Contact your clinic administrator to change plans.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Trust Section */}
      <TrustSection />

      {/* Locked Features Summary */}
      <LockedFeatures lockedFeatures={lockedFeatures} />

      {/* Next Tier Promotion */}
      {nextTier !== null && (
        <NextTierPromotion
          nextTier={nextTier}
          featuresByTier={featuresByTier}
          onContactSales={() => setShowContactSalesModal(true)}
        />
      )}

      {/* Add-ons Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Powerful Add-ons</h2>
          <p className="text-sm text-muted-foreground">
            Enhance your plan with premium features
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Intelligence Add-on */}
          <AddonCard
            title="Docita Intelligence"
            description="AI-Powered Add-on available for any tier. Smarter clinic management."
            icon={Sparkles}
            colorScheme="pink"
            features={intelligenceFeatures || []}
            isPurchased={hasIntelligence}
            pricing={{ monthly: 499, yearly: 4999 }}
            onPurchase={(cycle) => handlePurchaseAddon("INTELLIGENCE", cycle)}
            isLoading={purchasingAddon === "INTELLIGENCE"}
            currency={pricingConfig?.currency?.code || "INR"}
          />

          {/* WhatsApp Add-on */}
          <AddonCard
            title="WhatsApp Integration"
            description="Connect with patients on their favorite platform. Automate communication."
            icon={MessageCircle}
            colorScheme="green"
            features={whatsappFeatures}
            isPurchased={hasWhatsApp}
            pricing={{
              monthly: whatsappPrice,
              yearly: whatsappPrice * 10,
            }}
            onPurchase={(cycle) => handlePurchaseAddon("WHATSAPP", cycle)}
            isLoading={purchasingAddon === "WHATSAPP"}
            currency={pricingConfig?.currency?.code || "INR"}
          />
        </div>
      </div>

      {/* All Tiers Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">All Plans & Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {featuresByTier
            .filter((t) => t.tier !== Tier.INTELLIGENCE)
            .map(({ tier, info, features }) => (
              <TierCard
                key={tier}
                tier={tier}
                info={info}
                features={features}
                isCurrentTier={tier === currentTier}
                isLocked={tier > currentTier}
                currentTierValue={currentTier}
                onSelect={
                  canChangeTier
                    ? () => handleSelectTier(Tier[tier] as TierName, "MONTHLY")
                    : undefined
                }
              />
            ))}
        </div>
      </div>

      {/* Detailed Comparison */}
      <ComparisonTable currentTier={currentTier} />

      {/* Contact CTA */}
      <Card className="bg-linear-to-r from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-slate-900/50 border-primary/20">
        <CardContent className="flex flex-col md:flex-row items-center justify-between gap-4 py-6">
          <div>
            <h3 className="text-lg font-semibold">Need help choosing?</h3>
            <p className="text-sm text-muted-foreground">
              Our team can help you find the perfect plan for your practice
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowPricingDialog(true)}
            >
              View Pricing
            </Button>
            <Button onClick={() => setShowContactSalesModal(true)}>
              Contact Sales
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />

      <PricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        currentTier={currentTier}
        onSelectTier={handleSelectTier}
      />

      <TierChangeDialog
        open={showTierChangeDialog}
        onOpenChange={setShowTierChangeDialog}
        currentTier={currentTier}
        selectedTier={selectedTier}
        onConfirm={handleConfirmTierChange}
      />

      <PaymentSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        {...successData}
      />

      <InvoiceHistoryDialog
        open={showInvoiceHistory}
        onOpenChange={setShowInvoiceHistory}
      />

      {/* Terms and Tax Info */}
      <div className="max-w-4xl mx-auto text-center text-xs text-muted-foreground pt-4 pb-2">
        <p>
          By upgrading, you agree to our{" "}
          <a href="#" className="underline hover:text-foreground">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline hover:text-foreground">
            Privacy Policy
          </a>
          .
          <br />
          Prices are exclusive of applicable taxes. Tax breakdown will be shown
          at checkout.
        </p>
      </div>

      {/* FAQ Section */}
      <div className="pb-10">
        <FaqSection />
      </div>
    </div>
  );
}
