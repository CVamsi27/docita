"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, MessageSquare, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { useState, useEffect } from "react";
import { useTierConfig } from "@/app/hooks/use-tier-config";
import { ContactSalesModal } from "@/components/dialogs/contact-sales-modal";

// Currency conversion rates (approximate, for display purposes)
const CURRENCY_RATES: Record<
  string,
  { symbol: string; rate: number; country: string }
> = {
  INR: { symbol: "₹", rate: 1, country: "India" },
  USD: { symbol: "$", rate: 0.012, country: "USA/Canada" },
  GBP: { symbol: "£", rate: 0.0095, country: "UK" },
  EUR: { symbol: "€", rate: 0.011, country: "Europe" },
  AUD: { symbol: "A$", rate: 0.018, country: "Australia" },
};

// Detect currency from timezone synchronously
function detectCurrencyFromTimezone(): string {
  if (typeof window === "undefined") return "USD";

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      timezone.includes("Asia/Kolkata") ||
      timezone.includes("Asia/Calcutta")
    ) {
      return "INR";
    } else if (timezone.includes("Europe")) {
      return "EUR";
    } else if (timezone.includes("Australia")) {
      return "AUD";
    } else if (
      timezone.includes("America/New_York") ||
      timezone.includes("America/Los_Angeles")
    ) {
      return "USD";
    }
  } catch {
    // Fallback to USD
  }
  return "USD";
}

export function PricingSection() {
  // Start with USD on server and client to avoid hydration mismatch
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const { isLoading, getPricing, getCurrencySymbol } = useTierConfig();

  // Detect currency after hydration to avoid mismatch
  useEffect(() => {
    const currency = detectCurrencyFromTimezone();
    // Use a microtask to defer state updates
    queueMicrotask(() => {
      setDetectedCurrency(currency);
      setIsHydrated(true);
    });
  }, []);

  // Helper to format price from backend config based on billing period
  const formatPrice = (tierKey: string) => {
    const pricing = getPricing(tierKey, detectedCurrency);
    if (!pricing || pricing.isCustom) return "Custom";
    const symbol = getCurrencySymbol(detectedCurrency);

    if (billingPeriod === "annual") {
      // Show monthly equivalent of annual price
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

  const currencyInfo = CURRENCY_RATES[detectedCurrency] || CURRENCY_RATES.USD;

  return (
    <section className="px-6 py-24 relative overflow-hidden" id="pricing">
      <div className="mx-auto max-w-7xl">
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

        <div className="grid gap-6 lg:grid-cols-5 items-start">
          {/* CAPTURE Tier (Free) */}
          <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-500/10 px-3 py-1 text-xs mb-2 w-fit">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Tier 0
                </span>
              </div>
              <CardTitle className="text-lg">Capture</CardTitle>
              <CardDescription className="text-xs">
                Paper-to-digital bridge
              </CardDescription>
              <div className="mt-3">
                <span className="text-3xl font-bold">
                  {formatPrice("CAPTURE")}
                </span>
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>50 patients</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Basic patient records</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Excel/PDF import</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Manual WhatsApp share</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
                className="w-full"
              >
                <Button className="w-full" variant="outline" size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* CORE Tier */}
          <Card className="relative flex flex-col h-full border-primary shadow-lg scale-105 z-10 bg-background">
            <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
              Most Popular
            </div>
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-3 py-1 text-xs mb-2 w-fit">
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  Tier 1
                </span>
              </div>
              <CardTitle className="text-lg">Core</CardTitle>
              <CardDescription className="text-xs">
                Full-function EHR
              </CardDescription>
              <div className="mt-3">
                {billingPeriod === "annual" && getOriginalMonthly("CORE") ? (
                  <span className="text-sm text-muted-foreground line-through mr-2">
                    {getCurrencySymbol(detectedCurrency)}
                    {getOriginalMonthly("CORE")?.toLocaleString()}
                  </span>
                ) : null}
                <span className="text-3xl font-bold">
                  {formatPrice("CORE")}
                </span>
                <span className="text-muted-foreground text-sm">/mo</span>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed {formatYearlyTotal("CORE")}/year
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>300 patients included</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>500 appointments/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Calendar & scheduling</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Digital prescriptions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>ICD-10 medical coding</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="ml-6">₹2/additional patient</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
                className="w-full"
              >
                <Button className="w-full" size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* PLUS Tier */}
          <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs mb-2 w-fit">
                <span className="font-medium text-green-700 dark:text-green-300">
                  Tier 2
                </span>
              </div>
              <CardTitle className="text-lg">Plus</CardTitle>
              <CardDescription className="text-xs">
                Scale & customize
              </CardDescription>
              <div className="mt-3">
                {billingPeriod === "annual" && getOriginalMonthly("PLUS") ? (
                  <span className="text-sm text-muted-foreground line-through mr-2">
                    {getCurrencySymbol(detectedCurrency)}
                    {getOriginalMonthly("PLUS")?.toLocaleString()}
                  </span>
                ) : null}
                <span className="text-3xl font-bold">
                  {formatPrice("PLUS")}
                </span>
                <span className="text-muted-foreground text-sm">/mo</span>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed {formatYearlyTotal("PLUS")}/year
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>1,000 patients included</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>2,000 appointments/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Everything in Core</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Prescription templates</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>2 users included</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="ml-6">₹1.50/additional patient</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
                className="w-full"
              >
                <Button className="w-full" variant="outline" size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* PRO Tier */}
          <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs mb-2 w-fit">
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Tier 3
                </span>
              </div>
              <CardTitle className="text-lg">Pro</CardTitle>
              <CardDescription className="text-xs">
                Multi-doctor clinic
              </CardDescription>
              <div className="mt-3">
                {billingPeriod === "annual" && getOriginalMonthly("PRO") ? (
                  <span className="text-sm text-muted-foreground line-through mr-2">
                    {getCurrencySymbol(detectedCurrency)}
                    {getOriginalMonthly("PRO")?.toLocaleString()}
                  </span>
                ) : null}
                <span className="text-3xl font-bold">{formatPrice("PRO")}</span>
                <span className="text-muted-foreground text-sm">/mo</span>
                {billingPeriod === "annual" && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Billed {formatYearlyTotal("PRO")}/year
                  </p>
                )}
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>5,000 patients included</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>8,000 appointments/mo</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Everything in Plus</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Up to 5 doctors</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Advanced analytics & API</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="ml-6">₹1/additional patient</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
                className="w-full"
              >
                <Button className="w-full" variant="outline" size="sm">
                  Start Free Trial
                </Button>
              </Link>
            </CardFooter>
          </Card>

          {/* ENTERPRISE Tier */}
          <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors bg-linear-to-b from-background to-muted/30">
            <CardHeader className="pb-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs mb-2 w-fit">
                <span className="font-medium text-amber-700 dark:text-amber-300">
                  Tier 4
                </span>
              </div>
              <CardTitle className="text-lg">Enterprise</CardTitle>
              <CardDescription className="text-xs">
                Hospital & chains
              </CardDescription>
              <div className="mt-3">
                <span className="text-3xl font-bold">Custom</span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 pt-0">
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Unlimited patients</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Unlimited doctors</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Multi-branch support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Custom integrations</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                variant="outline"
                size="sm"
                onClick={() => setShowContactSalesModal(true)}
              >
                Contact Sales
              </Button>
            </CardFooter>
          </Card>
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
            {/* WhatsApp Add-on */}
            <Card className="relative overflow-hidden border-2 border-dashed border-green-500/30 bg-linear-to-br from-green-500/5 via-background to-emerald-500/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-green-500/10 to-transparent" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="rounded-xl bg-linear-to-br from-green-500 to-emerald-600 p-3">
                    <MessageSquare className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      WhatsApp Integration
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Automated patient communication
                    </CardDescription>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold">+₹499</span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (from Core tier)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 mt-2">
                  {[
                    "500+ messages included",
                    "Appointment reminders",
                    "Prescription sharing",
                    "Two-way messaging",
                    "₹0.50/extra message",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-3 w-3 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Intelligence Add-on */}
            <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 bg-linear-to-br from-primary/5 via-background to-purple-500/5">
              <div className="absolute top-0 right-0 w-24 h-24 bg-linear-to-bl from-primary/10 to-transparent" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="rounded-xl bg-linear-to-br from-primary to-purple-600 p-3">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      Docita Intelligence
                    </CardTitle>
                    <CardDescription className="text-xs">
                      AI-powered clinical assistant
                    </CardDescription>
                  </div>
                </div>
                <div className="mt-3">
                  {billingPeriod === "annual" &&
                  getOriginalMonthly("INTELLIGENCE") ? (
                    <span className="text-sm text-muted-foreground line-through mr-2">
                      +{getCurrencySymbol(detectedCurrency)}
                      {getOriginalMonthly("INTELLIGENCE")?.toLocaleString()}
                    </span>
                  ) : null}
                  <span className="text-2xl font-bold">
                    +{formatPrice("INTELLIGENCE")}
                  </span>
                  <span className="text-muted-foreground text-sm">/mo</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    (from Core tier)
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid gap-2 mt-2">
                  {[
                    "500+ AI credits included",
                    "AI-assisted clinical notes",
                    "Smart prescriptions",
                    "Voice-to-text dictation",
                    "Predictive analytics",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-3 w-3 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Pricing Note */}
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
