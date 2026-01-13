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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@workspace/ui/components/accordion";
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
  Shield,
  Lock,
  Server,
  ChevronLeft,
  ChevronRight,
  Quote,
  X,
  Baby,
  Smile,
  Mic,
  AlertTriangle,
  Brain,
} from "lucide-react";
import { useTierConfig } from "./hooks/use-tier-config";
import { LandingThemeToggle } from "@/components/theme-toggle";
import { ROICalculator } from "@/components/roi-calculator";
import { FeatureComparisonTable } from "@/components/feature-comparison";
import { CaseStudiesSection } from "@/components/case-studies";

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

// Testimonials data
const testimonials = [
  {
    quote:
      "Switching to Docita was the best decision for my practice. Patient documentation is faster, prescriptions are digital, and I can focus more on actual patient care. My practice has grown by 25% since implementing this system.",
    name: "Dr. Rajesh Kumar",
    title: "General Physician, MBBS, MD",
    location: "Mumbai, Maharashtra",
    image: "/testimonials/doctor-1.jpg",
    rating: 5,
  },
  {
    quote:
      "Managing a pediatric clinic with walk-ins was chaotic. Docita's queue management and appointment system brought order to the chaos. Parents love the WhatsApp reminders and the ability to access their child's medical history anytime.",
    name: "Dr. Priya Sharma",
    title: "Pediatrician, MBBS, DCH",
    location: "Delhi NCR",
    image: "/testimonials/doctor-2.jpg",
    rating: 5,
  },
  {
    quote:
      "I was skeptical about going paperless after 15 years of practice. The team helped migrate all our records seamlessly. Now I wonder how I ever managed without digital records. Insurance claims are processed 3x faster with proper ICD-10 coding.",
    name: "Dr. Arun Mehta",
    title: "Orthopedic Surgeon, MS Ortho",
    location: "Bangalore, Karnataka",
    image: "/testimonials/doctor-3.jpg",
    rating: 5,
  },
  {
    quote:
      "The AI-assisted diagnosis suggestions have been incredibly helpful for complex cases. Combined with comprehensive patient histories and lab integration, it's like having a medical assistant that never sleeps. Highly recommended for any modern practice.",
    name: "Dr. Sunita Patel",
    title: "Internal Medicine, MBBS, MD",
    location: "Ahmedabad, Gujarat",
    image: "/testimonials/doctor-4.jpg",
    rating: 5,
  },
];

// FAQ data
const faqs = [
  {
    question: "How long does it take to set up Docita?",
    answer:
      "Most clinics are up and running within 15 minutes. Our onboarding wizard guides you through clinic setup, and you can start seeing patients the same day. For data migration from paper records, we provide tools to import from Excel that take about 2-3 hours for 1000 patients.",
  },
  {
    question: "Is my patient data secure?",
    answer:
      "Absolutely. Your data is encrypted at rest (AES-256) and in transit (TLS 1.3). We follow HIPAA guidelines, perform regular security audits, and maintain SOC 2 compliance. Your data is stored in enterprise-grade data centers with 99.99% uptime. You own your data and can export it anytime.",
  },
  {
    question: "Can I import my existing patient records?",
    answer:
      "Yes! We support importing from Excel spreadsheets, CSV files, and common EMR formats. Our import wizard maps your fields automatically, and our support team can help with complex migrations at no extra cost.",
  },
  {
    question: "Does it work offline?",
    answer:
      "The web app requires an internet connection, but our mobile app supports offline mode for basic functions like viewing patient history and writing prescriptions. Data syncs automatically when you're back online.",
  },
  {
    question: "What if I need help during consultation hours?",
    answer:
      "We offer priority support via WhatsApp and phone for Pro and Enterprise tiers during clinic hours (8 AM - 10 PM IST). Core tier users get email support with 4-hour response time. We never leave you stuck during a busy clinic day.",
  },
  {
    question: "Can I customize prescription templates?",
    answer:
      "Yes! Create unlimited templates for common conditions, including medications, dosages, and instructions. Templates can include your clinic logo, doctor signature, and custom fields. Available from Core tier onwards.",
  },
  {
    question: "Is there a contract or can I cancel anytime?",
    answer:
      "No long-term contracts. Pay monthly and cancel anytime with no penalties. Annual billing saves you 10% and locks in your price for the year. Your data remains yours and can be exported before cancellation.",
  },
  {
    question: "Do you support multi-location clinics?",
    answer:
      "Yes! Pro and Enterprise tiers support multiple branches with centralized reporting. Each location can have its own settings while sharing patient records across branches. Perfect for clinic chains and hospital networks.",
  },
];

export default function Page() {
  // Start with USD on server and client to avoid hydration mismatch
  const [detectedCurrency, setDetectedCurrency] = useState("USD");
  const [isHydrated, setIsHydrated] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">(
    "monthly",
  );
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [showContactSalesModal, setShowContactSalesModal] = useState(false);
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [stickyDismissed, setStickyDismissed] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
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

  // Show sticky CTA after scrolling past hero section
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      // Show after scrolling 600px (past hero)
      setShowStickyCTA(scrollY > 600 && !stickyDismissed);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [stickyDismissed]);

  // Auto-rotate testimonials
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
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
              href="#testimonials"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Testimonials
            </Link>
            <Link
              href="#faq"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              FAQ
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
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/login`}
            >
              <Button variant="outline">Login</Button>
            </Link>
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
            >
              <Button>Start Free Trial</Button>
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
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
            >
              <Button
                size="lg"
                className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              >
                Start Free Trial
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

      {/* Specialized Care Section */}
      <section className="px-6 py-24 bg-linear-to-b from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm mb-4">
              <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Tailored for Your Specialty
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Built for Specialized Care
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From dental charting to pediatric growth tracking, Docita adapts
              to your specific clinical needs.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Pediatric Card */}
            <Card className="overflow-hidden border-indigo-100 dark:border-indigo-900 bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Baby className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Pediatrics</h3>
                    <p className="text-muted-foreground">
                      Comprehensive child care tools
                    </p>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "WHO Standard Growth Charts (Height/Weight/BMI)",
                    "Automated Vaccination Schedules & Reminders",
                    "Developmental Milestones Tracking",
                    "Pediatric-specific Dosage Calculators",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="h-48 rounded-xl bg-white dark:bg-black/20 border p-4 flex items-end gap-2 relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')]" />
                  <div className="w-full flex items-end justify-between gap-1 h-full pt-8">
                    {[30, 45, 52, 60, 68, 75, 82].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-indigo-500 rounded-t-sm opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="absolute top-4 left-4 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                    Growth Tracker
                  </div>
                </div>
              </div>
            </Card>

            {/* Dental Card */}
            <Card className="overflow-hidden border-teal-100 dark:border-teal-900 bg-linear-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-background">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center">
                    <Smile className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Dental Care</h3>
                    <p className="text-muted-foreground">
                      Advanced dental practice management
                    </p>
                  </div>
                </div>
                <ul className="space-y-4 mb-8">
                  {[
                    "Interactive Tooth Numbering & Charting",
                    "Procedure Mapping (CDT Codes)",
                    "Dental History Visualization",
                    "Treatment Planning & Cost Estimation",
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                      <span className="font-medium">{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="h-48 rounded-xl bg-white dark:bg-black/20 border p-4 flex items-center justify-center relative overflow-hidden">
                  <div className="grid grid-cols-8 gap-2 w-full max-w-sm">
                    {[...Array(16)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-8 rounded-md flex items-center justify-center text-xs font-mono border ${
                          i % 3 === 0
                            ? "bg-teal-500 text-white border-teal-600"
                            : "bg-muted/50 border-muted"
                        }`}
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <div className="absolute top-4 left-4 text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-1 rounded">
                    Dental Charting
                  </div>
                </div>
              </div>
            </Card>
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

      {/* AI & Automation Section */}
      <section className="px-6 py-24 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/40 via-slate-950 to-slate-950" />

        <div className="mx-auto max-w-7xl relative z-10">
          <div className="grid gap-16 lg:grid-cols-2 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-2 text-sm mb-6 border border-purple-500/20">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="font-medium text-purple-300">
                  Powered by Docita Intelligence
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-5xl mb-6 bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                Experience the Future of Care
              </h2>
              <p className="text-xl text-slate-400 mb-8 leading-relaxed">
                Let our advanced AI handle the tedious tasks so you can focus
                entirely on your patients.
              </p>

              <div className="space-y-8">
                {/* Voice Recorder Feature */}
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                    <Mic className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Voice-to-Text Dictation
                    </h3>
                    <p className="text-slate-400">
                      Record consultations and let our AI transcribe and format
                      them into structured clinical notes automatically.
                    </p>
                  </div>
                </div>

                {/* Drug Interaction Feature */}
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Drug Interaction Safety
                    </h3>
                    <p className="text-slate-400">
                      Real-time alerts for potential drug-drug and drug-allergy
                      interactions while you prescribe.
                    </p>
                  </div>
                </div>

                {/* Smart Suggestions */}
                <div className="flex gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/20">
                    <Brain className="h-5 w-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2">
                      Clinical Decision Support
                    </h3>
                    <p className="text-slate-400">
                      Get smart suggestions for diagnoses and treatment plans
                      based on patient history and symptoms.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Side */}
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl opacity-20 blur-xl" />
              <Card className="relative bg-slate-900 border-slate-800 shadow-2xl overflow-hidden">
                <CardHeader className="border-b border-slate-800 bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50" />
                    <span className="ml-2 text-xs text-slate-500 font-mono">
                      AI_Assistant.tsx
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Chat Bubbles */}
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <Mic className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="bg-slate-800 rounded-2xl rounded-tl-none p-3 text-sm text-slate-300 max-w-[85%]">
                      Patient complains of severe headache and nausea for past 2
                      days. History of migraines.
                    </div>
                  </div>

                  <div className="flex gap-3 flex-row-reverse">
                    <div className="h-8 w-8 rounded-full bg-purple-600 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-purple-900/30 border border-purple-500/30 rounded-2xl rounded-tr-none p-3 text-sm text-purple-100 max-w-[85%]">
                      <p className="mb-2 font-semibold text-purple-300">
                        Suggested Assessment:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-xs">
                        <li>Acute Migraine without aura (G43.009)</li>
                        <li>Tension-type headache (G44.2)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="bg-amber-950/30 border border-amber-500/30 rounded-lg p-3 mt-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-amber-400">
                          Interaction Warning
                        </h4>
                        <p className="text-xs text-amber-200/80 mt-1">
                          Potential risk between <strong>Sumatriptan</strong>{" "}
                          and <strong>SSRI</strong> (current med).
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
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
              { label: "Active Clinics", value: "25+", icon: Building2 },
              { label: "Doctors", value: "50+", icon: UserCog },
              { label: "Patients Managed", value: "10K+", icon: Users },
              { label: "Prescriptions", value: "25K+", icon: FileText },
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
            <p>
              All plans include a 14-day free trial. No credit card required.
            </p>
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
      </section>

      {/* Testimonials Section */}
      <section className="px-6 py-24 bg-muted/30" id="testimonials">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-4 py-2 text-sm mb-4">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-medium text-amber-700 dark:text-amber-300">
                Trusted by 500+ Clinics
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              What Doctors Are Saying
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join thousands of healthcare providers who have transformed their
              practice with Docita
            </p>
          </div>

          <div className="relative max-w-4xl mx-auto">
            {/* Testimonial Card */}
            <div className="relative overflow-hidden rounded-2xl bg-background border shadow-lg p-8 md:p-12">
              <Quote className="absolute top-6 left-6 h-12 w-12 text-primary/10" />

              <div className="relative z-10">
                <p className="text-xl md:text-2xl text-foreground mb-8 leading-relaxed">
                  &ldquo;{testimonials[activeTestimonial].quote}&rdquo;
                </p>

                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-xl">
                      {testimonials[activeTestimonial].name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">
                        {testimonials[activeTestimonial].name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {testimonials[activeTestimonial].title},{" "}
                        {testimonials[activeTestimonial].location}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    {[...Array(testimonials[activeTestimonial].rating)].map(
                      (_, i) => (
                        <Star
                          key={i}
                          className="h-5 w-5 text-amber-500 fill-amber-500"
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() =>
                  setActiveTestimonial(
                    (prev) =>
                      (prev - 1 + testimonials.length) % testimonials.length,
                  )
                }
                className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Previous testimonial"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveTestimonial(i)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                      i === activeTestimonial
                        ? "bg-primary"
                        : "bg-muted-foreground/30"
                    }`}
                    aria-label={`Go to testimonial ${i + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={() =>
                  setActiveTestimonial(
                    (prev) => (prev + 1) % testimonials.length,
                  )
                }
                className="p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
                aria-label="Next testimonial"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Case Studies Section */}
      <CaseStudiesSection />

      {/* Trust & Security Section */}
      <section className="px-6 py-24 bg-background" id="security">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm mb-4">
              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-300">
                Enterprise-Grade Security
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Your Data is Safe With Us
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We take data security seriously. Your patient information is
              protected by industry-leading security measures.
            </p>
          </div>

          {/* Trust Badges */}
          <div className="flex flex-wrap items-center justify-center gap-8 mb-16">
            {[
              { label: "HIPAA", sublabel: "Compliant" },
              { label: "ISO 27001", sublabel: "Certified" },
              { label: "SOC 2", sublabel: "Type II" },
              { label: "GDPR", sublabel: "Ready" },
              { label: "256-bit", sublabel: "Encryption" },
            ].map((badge, i) => (
              <div
                key={i}
                className="flex flex-col items-center justify-center w-28 h-28 rounded-xl border-2 border-muted bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400 mb-2" />
                <span className="font-bold text-sm">{badge.label}</span>
                <span className="text-xs text-muted-foreground">
                  {badge.sublabel}
                </span>
              </div>
            ))}
          </div>

          {/* Security Features Grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Lock,
                title: "End-to-End Encryption",
                description:
                  "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). Your patient information is never exposed.",
              },
              {
                icon: Shield,
                title: "Role-Based Access Control",
                description:
                  "Define who can see what. Doctors, receptionists, and admins each have appropriate access levels.",
              },
              {
                icon: Activity,
                title: "Complete Audit Trail",
                description:
                  "Every action is logged. Know who accessed what data and when for full accountability.",
              },
              {
                icon: Server,
                title: "Enterprise Data Centers",
                description:
                  "Hosted on AWS/GCP with 99.99% uptime SLA, redundant backups, and disaster recovery.",
              },
              {
                icon: Clock,
                title: "Daily Encrypted Backups",
                description:
                  "Automatic daily backups with 30-day retention. Your data is safe even in worst-case scenarios.",
              },
              {
                icon: Users,
                title: "Your Data, Your Control",
                description:
                  "Export your data anytime in standard formats. No vendor lock-in, ever.",
              },
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-sm bg-muted/30">
                <CardHeader>
                  <div className="mb-2 inline-block rounded-lg bg-green-500/10 p-2 w-fit">
                    <feature.icon className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="px-6 py-24 bg-muted/30" id="faq">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground">
              Everything you need to know about Docita
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-4">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-background rounded-lg border px-6 data-[state=open]:shadow-md transition-shadow"
              >
                <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center mt-12">
            <p className="text-muted-foreground mb-4">Still have questions?</p>
            <Button
              variant="outline"
              onClick={() => setShowContactSalesModal(true)}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <section className="px-6 py-24 bg-background" id="calculator">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm mb-4">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium text-primary">
                Calculate Your ROI
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              See How Much You Can Save
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Use our calculator to estimate your time and cost savings with
              Docita
            </p>
          </div>

          <ROICalculator />
        </div>
      </section>

      {/* Feature Comparison Section */}
      <section className="px-6 py-24 bg-muted/30" id="comparison">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm mb-4">
              <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                Feature Comparison
              </span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
              Why Doctors Choose Docita
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See how Docita compares to other practice management solutions
            </p>
          </div>

          <FeatureComparisonTable className="hidden md:block" />

          {/* Mobile-friendly version */}
          <div className="md:hidden text-center">
            <p className="text-muted-foreground mb-4">
              View comparison table on desktop for full details
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-primary/5 border-2 border-primary">
                <div className="font-bold text-primary mb-1">Docita</div>
                <div className="text-muted-foreground">Free tier available</div>
                <div className="text-xs mt-2">✓ All features included</div>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <div className="font-bold mb-1">Competitors</div>
                <div className="text-muted-foreground">₹5,999+/month</div>
                <div className="text-xs mt-2">Limited features</div>
              </div>
            </div>
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
              href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
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

      {/* Sticky CTA Bar */}
      {showStickyCTA && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-primary text-primary-foreground py-3 px-4 shadow-lg animate-in slide-in-from-bottom duration-300">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 hidden sm:block" />
              <span className="text-sm sm:text-base font-medium">
                Start your free 14-day trial today. No credit card required.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/onboarding`}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  className="whitespace-nowrap"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <button
                onClick={() => setStickyDismissed(true)}
                className="p-1.5 hover:bg-primary-foreground/10 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
