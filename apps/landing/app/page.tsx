"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { useState, useEffect } from "react";
import { ContactSalesModal } from "@/components/dialogs/contact-sales-modal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@workspace/ui/components/card";
import {
  Stethoscope,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Upload,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Code2,
  Activity,
  ClipboardList,
  FlaskConical,
  Package,
  Clock,
  BarChart3,
  Bell,
  Building2,
  UserCog,
  Receipt,
  Pill,
  Keyboard,
  Star,
  TrendingUp,
} from "lucide-react";
import { useTierConfig } from "./hooks/use-tier-config";
import { LandingThemeToggle } from "@/components/theme-toggle";

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

export default function Page() {
  // Start with USD on server and client to avoid hydration mismatch
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [showDemoModal, setShowDemoModal] = useState(false);
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
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Docita</span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link
              href="#features"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Features
            </Link>
            <Link
              href="#pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <LandingThemeToggle />
            <Link
              href={
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"
              }
            >
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:pb-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.900),var(--color-background))]" />
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-muted-foreground">
              The Future of Clinic Management
            </span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Modern Healthcare <br />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            From solo practitioners to multi-specialty hospitals. Docita bridges
            the gap between paper records and AI-powered care.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link
              href={
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"
              }
            >
              <Button
                size="lg"
                className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg bg-background/50 backdrop-blur-sm"
              onClick={() => setShowDemoModal(true)}
            >
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/30 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Streamlined Clinical Workflow
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From patient check-in to final billing, Docita optimizes every
              step of your practice.
            </p>
          </div>

          <div className="relative">
            {/* Connecting Line */}
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden lg:block" />

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative z-10">
              {[
                {
                  step: "01",
                  title: "Check-in & Queue",
                  desc: "Patient arrives, gets a token, and enters the smart queue system.",
                  icon: ClipboardList,
                },
                {
                  step: "02",
                  title: "Consultation",
                  desc: "Doctor reviews history, records vitals, and adds clinical notes.",
                  icon: Stethoscope,
                },
                {
                  step: "03",
                  title: "Prescription",
                  desc: "Digital prescription generated instantly with AI assistance.",
                  icon: Pill,
                },
                {
                  step: "04",
                  title: "Billing & Leave",
                  desc: "Automated invoice generation and payment collection.",
                  icon: Receipt,
                },
              ].map((item, i) => (
                <div key={i} className="relative group">
                  <div className="bg-background rounded-2xl p-8 shadow-lg border border-muted group-hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute top-4 right-4 text-4xl font-bold text-muted/20 select-none">
                      {item.step}
                    </div>
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Key Value Propositions */}
      <section className="px-6 py-20 bg-linear-to-b from-background to-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:gap-16">
            {/* 1. Complete Paperless Implementation */}
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm mb-4">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-300">
                    Eco-Friendly Practice
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Complete Paperless Implementation
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Say goodbye to paper prescriptions, physical files, and
                  storage headaches. Docita transforms your clinic into a fully
                  digital, eco-friendly practice.
                </p>
                <ul className="space-y-3">
                  {[
                    "Digital prescriptions accessible anywhere, anytime",
                    "No more lost or damaged paper records",
                    "Instant sharing via WhatsApp or email",
                    "Reduce your clinic's carbon footprint",
                    "Save on printing and storage costs",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative rounded-2xl bg-linear-to-br from-green-500/20 to-emerald-500/20 p-8 backdrop-blur-sm border border-green-500/20">
                  <div className="aspect-square rounded-xl bg-linear-to-br from-green-500 to-emerald-600 p-12 flex items-center justify-center">
                    <FileText className="h-32 w-32 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 bg-green-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    100% Digital
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Track Entire Patient History */}
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="order-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm mb-4">
                  <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    Complete Medical Timeline
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Track Entire Patient History
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Every visit, prescription, test result, and document in one
                  unified timeline. Never lose track of a patient&apos;s medical
                  journey again.
                </p>
                <ul className="space-y-3">
                  {[
                    "Complete medical history at your fingertips",
                    "All visits, prescriptions, and reports in one place",
                    "Track treatment progress over time",
                    "Quick access to previous medications and allergies",
                    "Seamless continuity of care across visits",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1">
                <div className="relative rounded-2xl bg-linear-to-br from-blue-500/20 to-cyan-500/20 p-8 backdrop-blur-sm border border-blue-500/20">
                  <div className="aspect-square rounded-xl bg-linear-to-br from-blue-500 to-cyan-600 p-12 flex items-center justify-center">
                    <Calendar className="h-32 w-32 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    Complete Timeline
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Perfect Clinical Accuracy */}
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm mb-4">
                  <ShieldCheck className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-purple-700 dark:text-purple-300">
                    Zero Errors
                  </span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Perfect Clinical Accuracy
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Eliminate handwriting interpretation errors completely. Every
                  prescription is crystal clear, every dosage is precise, every
                  instruction is legible.
                </p>
                <ul className="space-y-3">
                  {[
                    "Digital prescriptions are always 100% legible",
                    "No more misread handwriting or dosage errors",
                    "Standardized medical coding (ICD-10 compliant)",
                    "Reduce medication errors to absolute zero",
                    "Improve patient safety and treatment outcomes",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative rounded-2xl bg-linear-to-br from-purple-500/20 to-pink-500/20 p-8 backdrop-blur-sm border border-purple-500/20">
                  <div className="aspect-square rounded-xl bg-linear-to-br from-purple-500 to-pink-600 p-12 flex items-center justify-center">
                    <ShieldCheck className="h-32 w-32 text-white" />
                  </div>
                  <div className="absolute -top-4 -right-4 bg-purple-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                    100% Accurate
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Queue Management Section */}
      <section className="px-6 py-24 bg-background relative overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1 relative">
              <div className="rounded-2xl bg-linear-to-br from-orange-500/20 to-amber-500/20 p-8 backdrop-blur-sm border border-orange-500/20">
                <div className="bg-background rounded-xl p-6 shadow-lg space-y-4">
                  <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-3">
                      <Clock className="h-5 w-5 text-orange-600" />
                      <span className="font-semibold">Live Queue Status</span>
                    </div>
                    <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium animate-pulse">
                      Live
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg text-center border border-orange-100 dark:border-orange-900/50">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Current Token
                      </div>
                      <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                        A-012
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        In Consultation
                      </div>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center border border-blue-100 dark:border-blue-900/50">
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        Next Token
                      </div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                        A-013
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Est. Wait: 10m
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-muted-foreground">
                      Waiting List
                    </div>
                    {[
                      {
                        token: "A-013",
                        name: "Sarah Johnson",
                        status: "Next",
                        time: "10:30 AM",
                      },
                      {
                        token: "A-014",
                        name: "Michael Chen",
                        status: "Waiting",
                        time: "10:45 AM",
                      },
                      {
                        token: "A-015",
                        name: "Emma Davis",
                        status: "Waiting",
                        time: "11:00 AM",
                      },
                    ].map((patient, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-sm bg-background px-2 py-1 rounded border">
                            {patient.token}
                          </span>
                          <span className="text-sm">{patient.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {patient.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-500/10 px-4 py-2 text-sm mb-4">
                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  Smart Queue Management
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Reduce Wait Times & Chaos
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Manage patient flow efficiently with our real-time token system.
                Handle walk-ins and scheduled appointments seamlessly while
                keeping patients informed.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    title: "Real-time Tracking",
                    desc: "Live dashboard for reception and doctors",
                  },
                  {
                    title: "Smart Estimates",
                    desc: "AI-calculated wait times based on history",
                  },
                  {
                    title: "TV Display Mode",
                    desc: "Dedicated view for waiting room screens",
                  },
                  {
                    title: "Walk-in Support",
                    desc: "Seamlessly integrate walk-ins with appointments",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="rounded-full bg-orange-500/10 p-1.5 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Medical Coding Feature Section */}
      <section className="px-6 py-24 bg-linear-to-b from-muted/30 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 px-4 py-2 text-sm mb-4">
                <Code2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                <span className="font-medium text-teal-700 dark:text-teal-300">
                  ICD-10 Compliant
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Standardized Medical Coding
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Document diagnoses and procedures with internationally
                recognized ICD-10 and CPT codes. Improve billing accuracy,
                insurance claims processing, and clinical documentation quality.
              </p>
              <ul className="space-y-4 mb-8">
                {[
                  {
                    title: "ICD-10 Diagnosis Codes",
                    desc: "Search and assign standardized diagnosis codes for accurate documentation",
                  },
                  {
                    title: "CPT Procedure Codes",
                    desc: "Track procedures with proper coding for billing and insurance claims",
                  },
                  {
                    title: "Coding Queue",
                    desc: "Review and finalize codes before submission with built-in workflow",
                  },
                  {
                    title: "Insurance Ready",
                    desc: "Generate properly coded claims for faster insurance reimbursement",
                  },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="rounded-full bg-teal-500/10 p-1.5 mt-0.5">
                      <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <span className="font-medium">{item.title}</span>
                      <p className="text-sm text-muted-foreground">
                        {item.desc}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground border-l-2 border-teal-500/50 pl-4">
                Available from{" "}
                <span className="font-semibold text-foreground">Core tier</span>{" "}
                and above. AI-assisted coding suggestions available with{" "}
                <span className="font-semibold text-foreground">
                  Docita Intelligence
                </span>{" "}
                add-on.
              </p>
            </div>
            <div className="relative">
              <div className="rounded-2xl bg-linear-to-br from-teal-500/20 to-cyan-500/20 p-8 backdrop-blur-sm border border-teal-500/20">
                <div className="bg-background rounded-xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                    <Activity className="h-5 w-5 text-teal-600" />
                    <span className="font-semibold">Medical Coding</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Diagnosis
                        </div>
                        <div className="font-mono text-sm font-medium">
                          J06.9
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-medium">
                          Upper respiratory infection
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Acute
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Diagnosis
                        </div>
                        <div className="font-mono text-sm font-medium">
                          R50.9
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-medium">Fever, unspecified</div>
                        <div className="text-xs text-muted-foreground">
                          Primary
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Procedure
                        </div>
                        <div className="font-mono text-sm font-medium">
                          99213
                        </div>
                      </div>
                      <div className="text-sm text-right">
                        <div className="font-medium">
                          Office visit - Established
                        </div>
                        <div className="text-xs text-teal-600 dark:text-teal-400">
                          Level 3
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-teal-500 text-white px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                ICD-10 & CPT
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lab & Inventory Section */}
      <section className="px-6 py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-2 text-sm mb-4">
                <FlaskConical className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                <span className="font-medium text-cyan-700 dark:text-cyan-300">
                  Lab & Inventory
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Complete Clinic Operations
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Manage your in-house lab tests and pharmacy inventory in one
                place. Track stock levels, expiry dates, and test results
                effortlessly.
              </p>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center">
                      <FlaskConical className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Lab Management</h3>
                    <p className="text-sm text-muted-foreground">
                      Order tests, track sample status, and deliver digital
                      reports directly to patients.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Smart Inventory</h3>
                    <p className="text-sm text-muted-foreground">
                      Track medicine stock, get low-inventory alerts, and manage
                      supplier orders.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="grid gap-4">
                <Card className="bg-background/60 backdrop-blur-sm border-cyan-200 dark:border-cyan-800">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Lab Orders
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        {
                          test: "Complete Blood Count",
                          status: "Completed",
                          color: "text-green-600 bg-green-100",
                        },
                        {
                          test: "Lipid Profile",
                          status: "Processing",
                          color: "text-blue-600 bg-blue-100",
                        },
                        {
                          test: "Thyroid Function",
                          status: "Sample Collected",
                          color: "text-amber-600 bg-amber-100",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">{item.test}</span>
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${item.color} dark:bg-opacity-20`}
                          >
                            {item.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-background/60 backdrop-blur-sm border-amber-200 dark:border-amber-800 ml-8">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Low Stock Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        {
                          item: "Paracetamol 500mg",
                          stock: "45 strips",
                          status: "Low",
                        },
                        {
                          item: "Amoxicillin 250mg",
                          stock: "12 strips",
                          status: "Critical",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="font-medium">{item.item}</span>
                          <div className="text-right">
                            <div className="text-xs font-medium text-red-500">
                              {item.status}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.stock}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Section */}
      <section className="px-6 py-24 bg-background">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-4 py-2 text-sm mb-4">
              <BarChart3 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span className="font-medium text-indigo-700 dark:text-indigo-300">
                Data-Driven Insights
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Grow Your Practice with Analytics
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Understand your clinic&apos;s performance with comprehensive
              reports on revenue, patient trends, and operational efficiency.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Card className="bg-linear-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-background border-indigo-100 dark:border-indigo-900">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Monthly Revenue
                </CardTitle>
                <div className="text-2xl font-bold flex items-baseline gap-2">
                  $45,231
                  <span className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" /> +12%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-24 flex items-end gap-1">
                  {[40, 65, 45, 80, 55, 90, 75].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-indigo-500/20 rounded-t hover:bg-indigo-500 transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-background border-purple-100 dark:border-purple-900">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Patient Growth
                </CardTitle>
                <div className="text-2xl font-bold flex items-baseline gap-2">
                  1,204
                  <span className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" /> +8%
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-24 flex items-end gap-1">
                  {[30, 45, 55, 60, 75, 85, 95].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-purple-500/20 rounded-t hover:bg-purple-500 transition-colors"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-linear-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-background border-pink-100 dark:border-pink-900">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Top Diagnoses
                </CardTitle>
                <div className="text-2xl font-bold">Disease Trends</div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 pt-2">
                  {[
                    { name: "Viral Fever", val: 45, color: "bg-pink-500" },
                    { name: "Hypertension", val: 30, color: "bg-purple-500" },
                    { name: "Diabetes T2", val: 25, color: "bg-indigo-500" },
                  ].map((item, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span>{item.name}</span>
                        <span>{item.val}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color}`}
                          style={{ width: `${item.val}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* WhatsApp Integration */}
      <section className="px-6 py-24 bg-green-50 dark:bg-green-950/10 relative overflow-hidden">
        <div className="mx-auto max-w-7xl relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm mb-4">
                <MessageSquare className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-700 dark:text-green-300">
                  WhatsApp Integration
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Connect Where Your Patients Are
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Send prescriptions, appointment reminders, and follow-up
                instructions directly to your patients&apos; WhatsApp. No more
                lost paper slips.
              </p>
              <ul className="space-y-4">
                {[
                  "Instant prescription delivery via WhatsApp",
                  "Automated appointment reminders",
                  "Follow-up care instructions",
                  "Payment receipts and invoices",
                  "Two-way patient communication",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2 flex justify-center">
              <div className="relative w-[280px] h-[560px] bg-slate-900 rounded-[3rem] border-8 border-slate-900 shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-900 rounded-b-xl z-20" />
                <div className="w-full h-full bg-[#e5ddd5] overflow-hidden flex flex-col">
                  <div className="bg-[#075e54] p-4 pt-12 text-white flex items-center gap-3 shadow-md z-10">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <Stethoscope className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        Dr. Smith Clinic
                      </div>
                      <div className="text-[10px] opacity-80">
                        Business Account
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-4 overflow-hidden">
                    <div className="bg-white p-3 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs">
                      <p>
                        Hello Sarah, your appointment is confirmed for tomorrow
                        at 10:00 AM.
                      </p>
                      <div className="text-[10px] text-gray-400 text-right mt-1">
                        09:30 AM
                      </div>
                    </div>
                    <div className="bg-[#dcf8c6] p-3 rounded-lg rounded-tr-none shadow-sm max-w-[85%] ml-auto text-xs">
                      <p>Thank you doctor! I&apos;ll be there.</p>
                      <div className="text-[10px] text-gray-500 text-right mt-1">
                        09:32 AM
                      </div>
                    </div>
                    <div className="bg-white p-2 rounded-lg rounded-tl-none shadow-sm max-w-[85%] text-xs">
                      <div className="flex items-center gap-3 bg-gray-100 p-2 rounded mb-2">
                        <FileText className="h-8 w-8 text-red-500" />
                        <div>
                          <div className="font-medium">Prescription.pdf</div>
                          <div className="text-[10px] text-gray-500">
                            1 page • 120 KB
                          </div>
                        </div>
                      </div>
                      <p>
                        Here is your digital prescription from today&apos;s
                        visit.
                      </p>
                      <div className="text-[10px] text-gray-400 text-right mt-1">
                        10:45 AM
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comprehensive Features Grid */}
      <section className="px-6 py-24 bg-muted/50" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to run a modern clinic
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete operating system for your medical practice, packed with
              powerful features.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Drag-and-drop calendar with automated reminders to reduce no-shows.",
                color: "text-blue-600",
                bg: "bg-blue-100 dark:bg-blue-900/30",
              },
              {
                icon: Users,
                title: "Patient Records (EMR)",
                desc: "Comprehensive history, vitals, allergies, and digital prescriptions in one timeline.",
                color: "text-indigo-600",
                bg: "bg-indigo-100 dark:bg-indigo-900/30",
              },
              {
                icon: Receipt,
                title: "Billing & Invoicing",
                desc: "Generate professional invoices, track payments, and manage insurance claims.",
                color: "text-green-600",
                bg: "bg-green-100 dark:bg-green-900/30",
              },
              {
                icon: MessageSquare,
                title: "Patient Communication",
                desc: "Integrated WhatsApp messaging for prescriptions, reminders, and follow-ups.",
                color: "text-teal-600",
                bg: "bg-teal-100 dark:bg-teal-900/30",
              },
              {
                icon: Upload,
                title: "Easy Data Migration",
                desc: "Import your existing patient data from Excel or paper records in minutes.",
                color: "text-orange-600",
                bg: "bg-orange-100 dark:bg-orange-900/30",
              },
              {
                icon: ShieldCheck,
                title: "Enterprise Security",
                desc: "Role-based access control and encrypted data storage to keep patient info safe.",
                color: "text-red-600",
                bg: "bg-red-100 dark:bg-red-900/30",
              },
              {
                icon: FlaskConical,
                title: "Lab Management",
                desc: "Order tests, track samples, and manage results with integrated lab workflows.",
                color: "text-cyan-600",
                bg: "bg-cyan-100 dark:bg-cyan-900/30",
              },
              {
                icon: Package,
                title: "Pharmacy Inventory",
                desc: "Track medicine stock, manage suppliers, and get low-inventory alerts.",
                color: "text-amber-600",
                bg: "bg-amber-100 dark:bg-amber-900/30",
              },
              {
                icon: Star,
                title: "Patient Feedback",
                desc: "Collect and analyze patient feedback to improve your clinic's service quality.",
                color: "text-yellow-600",
                bg: "bg-yellow-100 dark:bg-yellow-900/30",
              },
              {
                icon: Building2,
                title: "Multi-Clinic Support",
                desc: "Manage multiple branches and doctors from a single admin dashboard.",
                color: "text-purple-600",
                bg: "bg-purple-100 dark:bg-purple-900/30",
              },
              {
                icon: Bell,
                title: "Smart Reminders",
                desc: "Automated SMS and email reminders to keep patients on track with their care.",
                color: "text-pink-600",
                bg: "bg-pink-100 dark:bg-pink-900/30",
              },
              {
                icon: Keyboard,
                title: "Keyboard Shortcuts",
                desc: "Power-user shortcuts to navigate and manage your clinic at lightning speed.",
                color: "text-slate-600",
                bg: "bg-slate-100 dark:bg-slate-800",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="border-none shadow-sm hover:shadow-md transition-all hover:-translate-y-1 bg-background"
              >
                <CardHeader>
                  <div
                    className={`mb-4 inline-block rounded-lg p-3 w-fit ${feature.bg}`}
                  >
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { label: "Active Clinics", value: "500+", icon: Building2 },
              { label: "Doctors", value: "1,200+", icon: UserCog },
              { label: "Patients Managed", value: "2.5M+", icon: Users },
              { label: "Prescriptions", value: "5M+", icon: FileText },
            ].map((stat, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-center mb-4 opacity-80">
                  <stat.icon className="h-8 w-8" />
                </div>
                <div className="text-4xl font-bold">{stat.value}</div>
                <div className="text-primary-foreground/80 font-medium">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
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
                <Button
                  className="w-full"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    (window.location.href =
                      process.env.NEXT_PUBLIC_APP_URL ||
                      "http://localhost:3000/login")
                  }
                >
                  Get Started
                </Button>
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
                    <span>500 patients</span>
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
                    <span>WhatsApp integration</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>ICD-10 medical coding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Basic analytics</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="sm">
                  Start Free Trial
                </Button>
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
                    <span>2,000 patients</span>
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
                    <span>Custom form fields</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Clinic branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" size="sm">
                  Start Free Trial
                </Button>
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
                  <span className="text-3xl font-bold">
                    {formatPrice("PRO")}
                  </span>
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
                    <span>10,000 patients</span>
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
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>Revenue reports</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>API access</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" size="sm">
                  Start Free Trial
                </Button>
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
                <Button className="w-full" variant="outline" size="sm">
                  Contact Sales
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Intelligence Add-on */}
          <div className="mt-12">
            <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 bg-linear-to-br from-primary/5 via-background to-purple-500/5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-primary/10 to-transparent" />
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="rounded-xl bg-linear-to-br from-primary to-purple-600 p-3">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      Docita Intelligence
                    </CardTitle>
                    <CardDescription>
                      AI-powered add-on for any tier
                    </CardDescription>
                  </div>
                  <div className="ml-auto text-right">
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
                    {billingPeriod === "annual" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Billed {formatYearlyTotal("INTELLIGENCE")}/year
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 mt-4">
                  {[
                    "AI-assisted clinical notes",
                    "Smart prescription suggestions",
                    "Predictive no-show alerts",
                    "Voice-to-text dictation",
                    "Patient risk segmentation",
                    "Anomaly detection",
                    "Treatment insights",
                    "Automated coding suggestions",
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Sparkles className="h-4 w-4 text-primary shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Note */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className="mt-2">Save 10% with annual billing.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Ready to transform your practice?
          </h2>
          <p className="mt-6 text-xl opacity-90 max-w-2xl mx-auto">
            Join thousands of doctors who have switched to Docita for a smarter,
            more efficient clinic.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link
              href={
                process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"
              }
            >
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-lg gap-2"
              >
                Start Free Trial
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-12 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2">
                <Stethoscope className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold">Docita</span>
            </div>
            <div className="flex gap-8 text-sm text-muted-foreground">
              <Link
                href="/privacy"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/contact"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Docita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Demo Modal */}
      <Dialog open={showDemoModal} onOpenChange={setShowDemoModal}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Docita Demo</DialogTitle>
          </DialogHeader>
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <iframe
              width="100%"
              height="100%"
              src={
                process.env.NEXT_PUBLIC_DEMO_VIDEO_URL ||
                "https://www.youtube.com/embed/dQw4w9WgXcQ"
              }
              title="Docita Demo"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Sales Modal */}
      <ContactSalesModal
        open={showContactSalesModal}
        onOpenChange={setShowContactSalesModal}
      />
    </div>
  );
}
