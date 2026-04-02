"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  MessageSquare,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import { PricingTierCard } from "@/components/pricing/pricing-tier-card";
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
  const { isLoading, getPricing, getCurrencySymbol, getOverageRates } =
    useTierConfig(detectedCurrency);

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
  const regionPricingLabel =
    detectedCurrency === "INR"
      ? "India-competitive pricing"
      : "Premium international pricing";

  const starterFeatures = [
    "Up to 50 patients",
    "Up to 50 consultations/month",
    "Digital prescriptions with PDF",
    "Patient profiles & visit history",
    "Paper record scanning & archival",
    "Excel import & CSV export",
    "Single doctor",
  ];

  const essentialFeatures = [
    "Unlimited patients",
    "500 consultations/month included",
    "1 doctor included",
    "WhatsApp messaging (500 msgs/mo)",
    "Lab tests & inventory",
    "Queue management",
    "Advanced analytics",
    "Audit logs & compliance",
    "Insurance billing",
    "Digital intake forms",
    "Prescription templates",
    "AI features — Coming Soon",
  ];

  const professionalFeatures = [
    "Unlimited patients",
    "2,000 consultations/month included",
    "Up to 5 doctors",
    "WhatsApp messaging (2,000 msgs/mo)",
    "Broadcast campaigns",
    "Patient segmentation",
    "Full EHR (IPD, vitals, clinical notes)",
    "Custom branding on reports",
    "Multi-location analytics",
    "Bulk data import suite",
    "REST API access (10k calls/day)",
    "SSO (Google / Azure AD)",
    "Custom letterhead",
    "Priority support with SLA",
  ];

  const enterpriseFeatures = [
    "Unlimited patients, users & branches",
    "Everything in Professional",
    "Data warehouse export (BI tools)",
    "Custom contract & invoicing",
    "Dedicated account manager",
    "Custom SLA guarantee",
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
              {regionPricingLabel} shown in {sym} ({currencyInfo.country})
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
                2 months free
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 items-start">
          <PricingTierCard
            tier="Free"
            title="Free"
            description="Run your practice digitally with a simple free tier"
            price={formatPrice("STARTER")}
            badgeColor="slate"
            features={starterFeatures}
            buttonText="Start trial"
          />

          <PricingTierCard
            tier="Essential"
            title="Essential"
            description="For solo clinics that want clear limits and simple billing."
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
            buttonText="Start trial"
            buttonVariant="default"
          />

          <PricingTierCard
            tier="Professional"
            title="Professional"
            description="For growing clinics with advanced workflows and scale."
            price={formatPrice("PROFESSIONAL")}
            pricePerMonth="/mo"
            billingNote={
              billingPeriod === "annual"
                ? `Billed ${formatYearlyTotal("PROFESSIONAL")}/year`
                : undefined
            }
            badgeColor="purple"
            features={professionalFeatures}
            buttonText="Start trial"
          />

          <PricingTierCard
            tier="Enterprise"
            title="Enterprise"
            description="Hospital-grade with full customization"
            price="Custom"
            badgeColor="amber"
            features={enterpriseFeatures}
            isEnterprise
            buttonText="Contact Sales"
            onContactSales={() => setShowContactSalesModal(true)}
          />
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/30 p-6 flex items-start gap-4">
            <div className="rounded-lg bg-success/10 p-2 mt-0.5">
              <MessageSquare className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-semibold">WhatsApp Messaging — Included</p>
              <p className="text-sm text-muted-foreground mt-1">
                500 msgs/mo on Essential, 2,000 msgs/mo on Professional.
                Additional messages billed per use.
              </p>
            </div>
          </div>
          <div className="rounded-xl border bg-muted/30 p-6 flex items-start gap-4">
            <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold">AI Features — Coming Soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                AI-assisted notes, smart prescriptions, voice dictation, and
                predictive analytics — bundled into Essential and above.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center mb-8">
          <h3 className="text-xl font-bold">How billing works</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Simple, transparent — no surprises on your invoice.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 mb-16">
          <div className="rounded-xl border bg-background p-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
            <p className="font-semibold mb-1">Pick a plan</p>
            <p className="text-sm text-muted-foreground">
              Your base monthly fee covers the included quota - consultations, patients, users, and WhatsApp messages.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
            <p className="font-semibold mb-1">Use Docita freely</p>
            <p className="text-sm text-muted-foreground">
              No hard limits. When your usage exceeds the included quota, you continue working without interruption.
            </p>
          </div>
          <div className="rounded-xl border bg-background p-6 text-center">
            <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">3</div>
            <p className="font-semibold mb-1">Pay for extras monthly</p>
            <p className="text-sm text-muted-foreground">
              Any overage is calculated and billed at the start of the next month — even on annual plans.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-muted/30 overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-bold text-lg">Usage overage rates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Charged only when you exceed the included quota on your plan.
              {isHydrated && ` Rates shown in ${sym}.`}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-6 py-3 text-left font-medium text-muted-foreground">Usage type</th>
                  <th className="px-6 py-3 text-center font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                      Essential
                    </span>
                  </th>
                  <th className="px-6 py-3 text-center font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary inline-block" />
                      Professional
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(() => {
                  const rates = getOverageRates(detectedCurrency);
                  return (
                    <>
                      <tr className="bg-background hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                            Extra patient (per month)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{rates.pro.patient}</td>
                        <td className="px-6 py-4 text-center font-medium text-primary">{rates.clinic.patient}</td>
                      </tr>
                      <tr className="bg-background hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                            Extra consultation
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{rates.pro.appt}</td>
                        <td className="px-6 py-4 text-center font-medium text-primary">{rates.clinic.appt}</td>
                      </tr>
                      <tr className="bg-background hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                            Extra user (per month)
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{rates.pro.user}</td>
                        <td className="px-6 py-4 text-center font-medium text-primary">{rates.clinic.user}</td>
                      </tr>
                      <tr className="bg-background hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                            Extra WhatsApp message
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center font-medium">{rates.pro.wa}</td>
                        <td className="px-6 py-4 text-center font-medium text-primary">{rates.clinic.wa}</td>
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
          <div className="px-6 py-4 bg-muted/20 border-t flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              Professional rates are lower than Essential rates. The larger
              your plan, the less you pay per extra unit.
            </span>
            <a href="#pricing" className="inline-flex items-center gap-1 text-primary font-medium hover:underline whitespace-nowrap">
              See plans <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>All paid plans include a 14-day free trial. No credit card required.</p>
          <p>Annual billing gives you 2 months free. Loyalty discounts apply after 3 years.</p>
        </div>
      </div>

      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </section>
  );
}
