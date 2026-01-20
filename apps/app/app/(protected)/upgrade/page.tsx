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
import { IntelligenceAddon } from "@/features/subscription/components/cards/IntelligenceAddon";
import { WhatsAppAddonCard } from "@/features/subscription/components/WhatsAppAddonCard";
import { cn } from "@workspace/ui/lib/utils";
import {
  CreditCard,
  Crown,
  Receipt,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import type { TierName } from "@workspace/types";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

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
  const [enableWhatsApp, setEnableWhatsApp] = useState(false);

  // Check if user can access this page (ADMIN, ADMIN_DOCTOR, or SUPER_ADMIN)
  const canAccessPage =
    user?.role === "ADMIN" ||
    user?.role === "ADMIN_DOCTOR" ||
    user?.role === "SUPER_ADMIN";

  // Check if user can change tier (same as canAccessPage)
  const canChangeTier = canAccessPage;

  // Handlers defined before early return to satisfy React Hooks rules
  const handleSelectTier = useCallback((tier: TierName) => {
    setSelectedTier(tier);
    setShowPricingDialog(false);
    setShowTierChangeDialog(true);
  }, []);

  const handleConfirmTierChange = useCallback(async () => {
    if (!selectedTier || !token) return;

    const apiUrl =
      process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
    const response = await fetch(`${apiUrl}/billing/change-tier`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        tier: selectedTier,
        addOns: enableWhatsApp ? ["WHATSAPP"] : [],
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Failed to change tier");
    }

    // Update local state immediately
    setTier(selectedTier);

    // Invalidate queries to refresh subscription status
    await queryClient.invalidateQueries({ queryKey: ["billing-status"] });
    await queryClient.invalidateQueries({ queryKey: ["subscription"] });

    toast.success(data.message || `Successfully upgraded to ${selectedTier}`);
  }, [selectedTier, token, setTier, enableWhatsApp, queryClient]);

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

  const currentTierInfo = getTierInfo(currentTier);

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 md:p-6 bg-linear-to-br from-background via-background to-muted/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800/30 min-h-screen">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
          Upgrade Your Plan
        </h1>
        <p className="text-muted-foreground">
          Unlock powerful features to grow your practice
        </p>
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
                Upgrade Plan
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

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-linear-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50 dark:border-blue-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 dark:bg-blue-500/30">
                <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {lockedFeatures.length}
                </p>
                <p className="text-sm text-blue-600/80 dark:text-blue-400/80">
                  Features to Unlock
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50 dark:border-emerald-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 dark:bg-emerald-500/30">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  {5 - currentTier}
                </p>
                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/80">
                  Tiers Available
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-linear-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/30 dark:to-violet-900/20 border-violet-200/50 dark:border-violet-800/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/20 dark:bg-violet-500/30">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">
                  {hasIntelligence ? "Active" : "Available"}
                </p>
                <p className="text-sm text-violet-600/80 dark:text-violet-400/80">
                  AI Intelligence
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

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

      {/* Intelligence Add-on */}
      {!hasIntelligence && (
        <IntelligenceAddon featuresByTier={featuresByTier} />
      )}

      {/* WhatsApp Add-on */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Add-ons</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <WhatsAppAddonCard
            currency="INR"
            isYearly={false}
            enabled={enableWhatsApp}
            onToggle={setEnableWhatsApp}
          />
        </div>
      </div>

      {/* All Tiers Comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">All Plans & Features</h2>
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
              />
            ))}
        </div>
      </div>

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
    </div>
  );
}
