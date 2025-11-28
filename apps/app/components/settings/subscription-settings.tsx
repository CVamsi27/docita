"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
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
import {
  Check,
  X,
  Crown,
  Zap,
  Building2,
  Sparkles,
  FileText,
  Shield,
  Brain,
  Pill,
  Bot,
  ArrowRight,
  Clock,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useClinic } from "@/lib/clinic-context";
import { apiHooks } from "@/lib/api-hooks";
import { apiFetch } from "@/lib/api-client";
import { toast } from "sonner";
import { Tier, getTierInfo, getPlanHighlights, getFeatureComparisonData } from "@/lib/tier-config";
import { useTierConfig } from "@/lib/tier-config-context";

// Plan tiers to display (excluding INTELLIGENCE which is an add-on)
const DISPLAY_TIERS = [Tier.CAPTURE, Tier.CORE, Tier.PLUS, Tier.PRO, Tier.ENTERPRISE];

// Icon mapping for intelligence addons
const ADDON_ICONS = {
  Brain: Brain,
  Pill: Pill,
  Bot: Bot,
};

export function SubscriptionSettings() {
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Get current tier from permission store and clinic from context
  const { currentTier } = usePermissionStore();
  const { clinic, refreshClinic } = useClinic();
  
  // Use tier config from single source of truth (backend API)
  const { 
    config, 
    isLoading: isTierConfigLoading, 
    getPlanPricing, 
    getPlanLimits,
    getPlanDescription,
    getIntelligenceBundlePrice 
  } = useTierConfig();

  // Use dashboard stats to get usage data
  const { data: dashboardStats } = apiHooks.useDashboardStats();
  const { data: patients = [] } = apiHooks.usePatients();
  const { data: doctors = [] } = apiHooks.useDoctors();

  // Calculate trial days left from clinic data
  const trialDaysLeft = clinic?.trialEndsAt 
    ? Math.max(0, Math.ceil((new Date(clinic.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Get limits from single source of truth (backend API via context)
  const limits = getPlanLimits(currentTier);
  
  const usageStats = {
    patients: { used: patients.length || 0, limit: limits.patients },
    doctors: { used: doctors.length || 0, limit: limits.doctors },
    storage: { used: dashboardStats?.storageUsed || 0, limit: limits.storageGB },
  };

  // Intelligence addons from backend config
  const intelligenceAddons = useMemo(() => 
    config?.intelligenceAddons || [
      { feature: 'AI_DIAGNOSIS_HINTS', name: 'AI Diagnosis Assist', description: 'Get AI-powered diagnosis suggestions based on symptoms', monthlyPrice: 1999, icon: 'Brain' },
      { feature: 'AI_PRESCRIPTION_ASSISTANT', name: 'AI Prescription Assistant', description: 'Smart prescription suggestions and drug interactions', monthlyPrice: 999, icon: 'Pill' },
      { feature: 'SMART_TASK_ENGINE', name: 'Smart Task Engine', description: 'AI-powered workflow automation and reminders', monthlyPrice: 1499, icon: 'Bot' },
    ], 
  [config]);

  const handleRefreshTier = async () => {
    setIsRefreshing(true);
    try {
      await refreshClinic();
      toast.success("Subscription status refreshed");
    } catch {
      toast.error("Failed to refresh subscription status");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpgrade = (tier: Tier) => {
    setSelectedTier(tier);
    setShowUpgradeDialog(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedTier) return;

    try {
      // In a real implementation, this would redirect to Stripe or payment gateway
      const response = await apiFetch<{ url?: string; message?: string }>('/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier: Tier[selectedTier] }),
      });

      if (response.url) {
        window.open(response.url, '_blank');
      } else {
        toast.info(response.message || "Billing portal integration coming soon. Contact support to upgrade.");
      }
    } catch {
      toast.error("Unable to process upgrade. Please contact support.");
    }
    
    setShowUpgradeDialog(false);
  };

  const handleBillingPortal = async () => {
    try {
      const response = await apiFetch<{ url?: string; message?: string }>('/billing/portal');

      if (response.url) {
        window.open(response.url, '_blank');
      } else {
        toast.info(response.message || "Billing portal integration coming soon. Contact support for billing inquiries.");
      }
    } catch {
      toast.info("Billing portal integration coming soon. Contact support for billing inquiries.");
    }
  };

  // Get feature comparison data from single source of truth
  const comparisonData = getFeatureComparisonData();

  return (
    <div className="space-y-8">
      {/* Current Plan Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Current Plan
                <Badge
                  className={cn(
                    "ml-2",
                    getTierInfo(currentTier).color === 'gray' && "bg-gray-100 text-gray-700",
                    getTierInfo(currentTier).color === 'blue' && "bg-blue-100 text-blue-700",
                    getTierInfo(currentTier).color === 'green' && "bg-green-100 text-green-700",
                    getTierInfo(currentTier).color === 'purple' && "bg-purple-100 text-purple-700",
                    getTierInfo(currentTier).color === 'orange' && "bg-orange-100 text-orange-700",
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
                  <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                </Button>
              </CardTitle>
              <CardDescription>
                Your subscription details and usage
              </CardDescription>
            </div>
            {trialDaysLeft > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  {trialDaysLeft} days left in trial
                </span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Patients Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Patients</span>
                <span className="font-medium">
                  {usageStats.patients.used.toLocaleString()} / {usageStats.patients.limit === 999999 ? '∞' : usageStats.patients.limit.toLocaleString()}
                </span>
              </div>
              <Progress
                value={usageStats.patients.limit === 999999 ? 0 : (usageStats.patients.used / usageStats.patients.limit) * 100}
                className="h-2"
              />
            </div>

            {/* Doctors Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Doctors</span>
                <span className="font-medium">
                  {usageStats.doctors.used} / {usageStats.doctors.limit === 999 ? '∞' : usageStats.doctors.limit}
                </span>
              </div>
              <Progress
                value={usageStats.doctors.limit === 999 ? 0 : (usageStats.doctors.used / usageStats.doctors.limit) * 100}
                className="h-2"
              />
            </div>

            {/* Storage Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Storage</span>
                <span className="font-medium">
                  {usageStats.storage.used} GB / {usageStats.storage.limit} GB
                </span>
              </div>
              <Progress
                value={(usageStats.storage.used / usageStats.storage.limit) * 100}
                className="h-2"
              />
            </div>
          </div>

          {/* Usage Warning */}
          {usageStats.patients.limit !== 999999 && usageStats.patients.used / usageStats.patients.limit > 0.8 && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">
                  Approaching patient limit
                </p>
                <p className="text-sm text-yellow-700">
                  Upgrade to add more patients to your clinic.
                </p>
              </div>
              <Button size="sm" onClick={() => handleUpgrade(Tier.PRO)}>
                Upgrade
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Available Plans</h3>
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

              return (
                <Card
                  key={tier}
                  className={cn(
                    "relative",
                    isPopular && "border-primary ring-1 ring-primary",
                    isCurrentPlan && "border-2 border-primary"
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
                      {getTierInfo(tier).name.replace('Docita ', '')}
                    </CardTitle>
                    <CardDescription className="min-h-[40px]">
                      {description.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="mb-4">
                      {typeof pricing.monthly === "number" ? (
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-bold">{pricing.currency}{pricing.monthly}</span>
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
                    </div>

                    <ul className="space-y-2 text-sm">
                      {highlights.slice(0, 5).map((feature, idx) => (
                        <li
                          key={idx}
                          className={cn(
                            "flex items-center gap-2",
                            !feature.included && "text-muted-foreground"
                          )}
                        >
                          {feature.included ? (
                            <Check
                              className={cn(
                                "h-4 w-4",
                                feature.highlight
                                  ? "text-primary"
                                  : "text-green-600"
                              )}
                            />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground/50" />
                          )}
                          <span className={cn(feature.highlight && "font-medium")}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                      {highlights.length > 5 && (
                        <li className="text-muted-foreground text-xs pt-1">
                          + {highlights.length - 5} more features
                        </li>
                      )}
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
                        {isEnterprise ? 'Contact Sales' : 'Upgrade'}
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
      </div>

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
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              AI Features
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {intelligenceAddons.map((addon) => {
              const IconComponent = ADDON_ICONS[addon.icon as keyof typeof ADDON_ICONS] || Brain;
              return (
                <Card key={addon.feature} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-purple-100">
                        <IconComponent className="h-5 w-5 text-purple-600" />
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

          <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Brain className="h-8 w-8 text-purple-600" />
                <div>
                  <h4 className="font-medium">Intelligence Bundle</h4>
                  <p className="text-sm text-muted-foreground">
                    Get all AI features at {Math.round((config?.intelligenceBundleDiscount || 0.4) * 100)}% discount
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold">₹{getIntelligenceBundlePrice()}</span>
                  <span className="text-muted-foreground line-through text-sm">
                    ₹{intelligenceAddons.reduce((sum, a) => sum + a.monthlyPrice, 0)}
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

      {/* Feature Comparison - Using Single Source of Truth */}
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
                        tier === currentTier && "bg-primary/5"
                      )}
                    >
                      {getTierInfo(tier).name.replace('Docita ', '')}
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
                            tier === currentTier && "bg-primary/5"
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

      {/* Billing Info */}
      <Card>
        <CardHeader>
          <CardTitle>Billing Information</CardTitle>
          <CardDescription>Manage your payment method and billing details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  {clinic?.subscriptionStatus === 'active' ? '•••• •••• •••• 4242' : 'No payment method on file'}
                </p>
              </div>
            </div>
            <Button variant="outline" onClick={handleBillingPortal}>Update</Button>
          </div>
          <div className="mt-4 flex gap-4">
            <Button variant="outline" className="flex-1" onClick={handleBillingPortal}>
              <FileText className="h-4 w-4 mr-2" />
              View Invoices
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleBillingPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Billing Portal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedTier !== null && selectedTier > currentTier
                ? "Upgrade"
                : "Change"}{" "}
              to {selectedTier !== null ? getTierInfo(selectedTier).name : ''}
            </DialogTitle>
            <DialogDescription>
              {selectedTier !== null && selectedTier > currentTier
                ? "Unlock more features and higher limits."
                : "Your plan will change at the next billing cycle."}
            </DialogDescription>
          </DialogHeader>

          {selectedTier !== null && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{getTierInfo(selectedTier).name}</span>
                  <span className="font-bold">
                    {(() => {
                      const selectedPricing = getPlanPricing(selectedTier);
                      return typeof selectedPricing.monthly === "number"
                        ? `${selectedPricing.currency}${selectedPricing.monthly}/month`
                        : "Custom pricing";
                    })()}
                  </span>
                </div>
              </div>

              <ul className="space-y-2">
                {getPlanHighlights(selectedTier)
                  .filter((f) => f.included && f.highlight)
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
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmUpgrade}>
              {selectedTier === Tier.ENTERPRISE
                ? "Contact Sales"
                : "Confirm Upgrade"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
