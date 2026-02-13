"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { PricingTierCard } from "@/components/pricing/pricing-tier-card";
import { PricingAddon } from "@/components/pricing/pricing-addon";
import { detectCurrencyFromTimezone, getCurrencyInfo } from "@/components/pricing/pricing-utils";
import { useTierConfig } from "@/app/hooks/use-tier-config";
import { ContactSalesModal } from "@/components/dialogs/contact-sales-modal";

export function PricingSection() {
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly"
  );
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const { isLoading, getPricing, getCurrencySymbol } = useTierConfig();

  // Detect currency after hydration
  useEffect(() => {
    const currency = detectCurrencyFromTimezone();
    queueMicrotask(() => {
      setDetectedCurrency(currency);
      setIsHydrated(true);
    });
  }, []);

  const formatPrice = (tierKey: string) => {
    const pricing = getPricing(tierKey, detectedCurrency);
    if (!pricing || pricing.isCustom) return "Custom";
    const symbol = getCurrencySymbol(detectedCurrency);

    if (billingPeriod === "annual") {
      const monthlyEquivalent = Math.round(pricing.yearly / 12);
      return `${symbol}${monthlyEquivalent.toLocaleString()}`;
    }
    return `${symbol}${pricing.monthly.toLocaleString()}`;
  };

  const formatYearlyTotal = (tierKey: string) => {
    const pricing = getPricing(tierKey, detectedCurrency);
    if (!pricing || pricing.isCustom) return "Custom";
    const symbol = getCurrencySymbol(detectedCurrency);
    return `${symbol}${pricing.yearly.toLocaleString()}`;
  };

  const getOriginalMonthly = (tierKey: string) => {
    const pricing = getPricing(tierKey, detectedCurrency);
    if (!pricing || pricing.isCustom) return null;
    return pricing.monthly;
  };

  const currencyInfo = getCurrencyInfo(detectedCurrency);

  const captureTierFeatures = [
    "50 patients",
    "Basic patient records",
    "Excel/PDF import",
    "Manual WhatsApp share",
  ];

  const coreTierFeatures = [
    "300 patients included",
    "500 appointments/mo",
    "Calendar & scheduling",
    "Digital prescriptions",
    "ICD-10 medical coding",
    "₹2/additional patient",
  ];

  const plusTierFeatures = [
    "1,000 patients included",
    "2,000 appointments/mo",
    "Everything in Core",
    "Prescription templates",
    "2 users included",
    "₹1.50/additional patient",
  ];

  const proTierFeatures = [
    "5,000 patients included",
    "8,000 appointments/mo",
    "Everything in Plus",
    "Up to 5 doctors",
    "Advanced analytics & API",
    "₹1/additional patient",
  ];

  const enterpriseTierFeatures = [
    "Unlimited patients",
    "Everything in Pro",
    "Unlimited doctors",
    "Multi-branch support",
    "Custom integrations",
    "Dedicated support",
  ];

  return (
    <section className="px-6 py-24 relative overflow-hidden" id="pricing">
      <div className="mx-auto max-w-7xl">
        {/* Pricing Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start for free, upgrade as you grow
          </p>
          {isHydrated && !isLoading && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pricing shown in {currencyInfo.symbol} ({currencyInfo.country})
            </p>
          )}

          {/* Billing Period Toggle */}
          <div className="mt-6 inline-flex items-center gap-3 rounded-full bg-muted p-1">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                billingPeriod === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod("annual")}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2 ${
                billingPeriod === "annual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Annual
              <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-semibold">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Tiers Grid */}
        <div className="grid gap-6 lg:grid-cols-5 items-start">
          <PricingTierCard
            tier="Tier 0"
            title="Capture"
            description="Paper-to-digital bridge"
            price={formatPrice("CAPTURE")}
            pricePerMonth="/mo"
            badgeColor="slate"
            features={captureTierFeatures}
            buttonText="Start Free Trial"
          />

          <PricingTierCard
            tier="Tier 1"
            title="Core"
            description="Full-function EHR"
            price={formatPrice("CORE")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("CORE")}/year`
                : undefined
            }
            badgeColor="blue"
            isPopular
            features={coreTierFeatures}
            isPrimary
            buttonText="Start Free Trial"
            buttonVariant="default"
          />

          <PricingTierCard
            tier="Tier 2"
            title="Plus"
            description="Scale & customize"
            price={formatPrice("PLUS")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("PLUS")}/year`
                : undefined
            }
            badgeColor="green"
            features={plusTierFeatures}
            buttonText="Start Free Trial"
          />

          <PricingTierCard
            tier="Tier 3"
            title="Pro"
            description="Multi-doctor clinic"
            price={formatPrice("PRO")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("PRO")}/year`
                : undefined
            }
            badgeColor="purple"
            features={proTierFeatures}
            buttonText="Start Free Trial"
          />

          <PricingTierCard
            tier="Tier 4"
            title="Enterprise"
            description="Hospital & chains"
            price="Custom"
            badgeColor="amber"
            features={enterpriseTierFeatures}
            isEnterprise
            buttonText="Contact Sales"
            onContactSales={() => setShowContactSalesModal(true)}
          />
        </div>

        {/* Add-ons Section */}
        <div className="mt-12 space-y-6">
          <div className="text-center mb-8">
            <h3 className="text-xl font-bold">Powerful Add-ons</h3>
            <p className="text-sm text-muted-foreground">
              Enhance your clinic with these optional modules
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <PricingAddon
              icon={<MessageSquare className="h-6 w-6" />}
              title="WhatsApp Integration"
              description="Automated patient communication"
              price="+₹499"
              priceNote="(from Core tier)"
              features={[
                { label: "500+ messages included", icon: <MessageSquare className="h-3 w-3" /> },
                { label: "Appointment reminders", icon: <MessageSquare className="h-3 w-3" /> },
                { label: "Prescription sharing", icon: <MessageSquare className="h-3 w-3" /> },
                { label: "Two-way messaging", icon: <MessageSquare className="h-3 w-3" /> },
                { label: "₹0.50/extra message", icon: <MessageSquare className="h-3 w-3" /> },
              ]}
              iconBgColor="green"
            />

            <PricingAddon
              icon={<Sparkles className="h-6 w-6" />}
              title="Docita Intelligence"
              description="AI-powered clinical assistant"
              price={`+${formatPrice("INTELLIGENCE")}`}
              priceNote="(from Core tier)"
              features={[
                { label: "500+ AI credits included", icon: <Sparkles className="h-3 w-3" /> },
                { label: "AI-assisted clinical notes", icon: <Sparkles className="h-3 w-3" /> },
                { label: "Smart prescriptions", icon: <Sparkles className="h-3 w-3" /> },
                { label: "Voice-to-text dictation", icon: <Sparkles className="h-3 w-3" /> },
                { label: "Predictive analytics", icon: <Sparkles className="h-3 w-3" /> },
              ]}
              iconBgColor="primary"
            />
          </div>
        </div>

        {/* Pricing Notes */}
        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>All plans include a 14-day free trial. No credit card required.</p>
          <p>
            Save 10% with annual billing. Loyalty discounts up to 10% after 3
            years.
          </p>
          <p className="text-xs">
            Usage-based pricing: Pay only for what you use beyond included
            quotas.
          </p>
        </div>
      </div>

      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </section>
  );
}
