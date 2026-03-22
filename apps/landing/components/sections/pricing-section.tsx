"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Sparkles } from "lucide-react";
import { PricingTierCard } from "@/components/pricing/pricing-tier-card";
import { PricingAddon } from "@/components/pricing/pricing-addon";
import {
  detectCurrencyFromIP,
  getCurrencyInfo,
} from "@/components/pricing/pricing-utils";
import { useTierConfig } from "@/app/hooks/use-tier-config";
import { ContactSalesModal } from "@/components/dialogs/contact-sales-modal";

export function PricingSection() {
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const { isLoading, getPricing, getCurrencySymbol } = useTierConfig();

  useEffect(() => {
    detectCurrencyFromIP().then((currency) => {
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

  const currencyInfo = getCurrencyInfo(detectedCurrency);
  const sym = currencyInfo.symbol;

  const starterFeatures = [
    "Up to 50 patients",
    "Calendar & appointment scheduling",
    "Digital prescriptions with PDF",
    "Patient profiles & visit history",
    "Paper record scanning & archival",
    "Excel import & CSV export",
    "Single doctor",
  ];

  const essentialFeatures = [
    "500 active patients included",
    "1,000 appointments/month",
    "Everything in Starter",
    "Invoicing & billing",
    "Basic analytics dashboard",
    "ICD-10/CPT medical coding",
    "Prescription templates",
    "Digital consent management",
    "Doctor signature on prescriptions",
    "3 users included",
  ];

  const professionalFeatures = [
    "10,000 active patients included",
    "20,000 appointments/month",
    "Everything in Essential",
    "Unlimited doctors",
    "Multi-clinic branching (up to 5)",
    "Lab tests catalog & tracking",
    "Inventory & pharmacy module",
    "Token queue management",
    "Audit logs & compliance",
    "Advanced analytics",
    "15 users included",
  ];

  const enterpriseFeatures = [
    "Unlimited patients & appointments",
    "Everything in Professional",
    "Unlimited doctors & branches",
    "Full EHR capabilities",
    "API access (10k calls/day)",
    "SSO & advanced security",
    "Custom branding & white-label",
    "Data warehouse export",
    "Dedicated account manager",
    "SLA guarantee",
  ];

  return (
    <section className="px-6 py-24 relative overflow-hidden" id="pricing">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Pricing That Scales With Your Clinic
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start free, add capabilities as your team and patient volume grow.
          </p>
          {isHydrated && !isLoading && (
            <p className="mt-2 text-sm text-muted-foreground">
              Pricing shown in {sym} ({currencyInfo.country})
            </p>
          )}

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
              <span className="text-xs bg-success text-success dark:text-success px-2 py-0.5 rounded-full font-semibold">
                Save 10%
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 items-start">
          <PricingTierCard
            tier="Starter"
            title="Docita Starter"
            description="Free forever — run your practice digitally"
            price={formatPrice("STARTER")}
            badgeColor="slate"
            features={starterFeatures}
            buttonText="Start Free"
          />

          <PricingTierCard
            tier="Essential"
            title="Docita Essential"
            description="Professional tools for solo clinics"
            price={formatPrice("ESSENTIAL")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("ESSENTIAL")}/year`
                : undefined
            }
            badgeColor="blue"
            isPopular
            features={essentialFeatures}
            isPrimary
            buttonText="Start Free Trial"
            buttonVariant="default"
          />

          <PricingTierCard
            tier="Professional"
            title="Docita Professional"
            description="Full-featured for multi-doctor clinics"
            price={formatPrice("PROFESSIONAL")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("PROFESSIONAL")}/year`
                : undefined
            }
            badgeColor="purple"
            features={professionalFeatures}
            buttonText="Start Free Trial"
          />

          <PricingTierCard
            tier="Enterprise"
            title="Docita Enterprise"
            description="Hospital-grade with full customization"
            price="Custom"
            badgeColor="amber"
            features={enterpriseFeatures}
            isEnterprise
            buttonText="Contact Sales"
            onContactSales={() => setShowContactSalesModal(true)}
          />
        </div>

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
              price={`+${sym}${({ INR: "499", USD: "9", EUR: "8", GBP: "7", AUD: "15" })[detectedCurrency] ?? "9"}`}
              priceNote="(from Essential tier)"
              features={[
                {
                  label: "500 messages included",
                  icon: <MessageSquare className="h-3 w-3" />,
                },
                {
                  label: "Appointment reminders",
                  icon: <MessageSquare className="h-3 w-3" />,
                },
                {
                  label: "Prescription sharing",
                  icon: <MessageSquare className="h-3 w-3" />,
                },
                {
                  label: "Two-way messaging",
                  icon: <MessageSquare className="h-3 w-3" />,
                },
                {
                  label: `${sym}${({ INR: "0.50", USD: "0.015", EUR: "0.013", GBP: "0.012", AUD: "0.022" })[detectedCurrency] ?? "0.015"}/extra message`,
                  icon: <MessageSquare className="h-3 w-3" />,
                },
              ]}
              iconBgColor="green"
            />

            <PricingAddon
              icon={<Sparkles className="h-6 w-6" />}
              title="Docita Intelligence"
              description="AI-powered clinical assistant"
              price={`+${formatPrice("INTELLIGENCE")}`}
              priceNote="(from Essential tier)"
              features={[
                {
                  label: "500 AI credits included",
                  icon: <Sparkles className="h-3 w-3" />,
                },
                {
                  label: "AI-assisted clinical notes",
                  icon: <Sparkles className="h-3 w-3" />,
                },
                {
                  label: "Smart prescriptions",
                  icon: <Sparkles className="h-3 w-3" />,
                },
                {
                  label: "Voice-to-text dictation",
                  icon: <Sparkles className="h-3 w-3" />,
                },
                {
                  label: "Predictive analytics",
                  icon: <Sparkles className="h-3 w-3" />,
                },
              ]}
              iconBgColor="primary"
            />
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>All paid plans include a 14-day free trial. No credit card required.</p>
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
