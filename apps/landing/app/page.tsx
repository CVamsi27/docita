"use client"

import Link from "next/link"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@workspace/ui/components/card"
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
} from "lucide-react"
import { useState, useEffect } from "react"

const PRICING_DATA = {
  INR: {
    symbol: "₹",
    country: "India",
    starter: "899",
    professional: "2,199",
  },
  USD: {
    symbol: "$",
    country: "USA/Canada",
    starter: "29",
    professional: "79",
  },
  GBP: {
    symbol: "£",
    country: "UK",
    starter: "25",
    professional: "65",
  },
  EUR: {
    symbol: "€",
    country: "Europe",
    starter: "27",
    professional: "75",
  },
  AUD: {
    symbol: "A$",
    country: "Australia",
    starter: "49",
    professional: "139",
  },
}

// Map country codes to currency
const COUNTRY_TO_CURRENCY: Record<string, keyof typeof PRICING_DATA> = {
  IN: "INR",
  US: "USD",
  CA: "USD",
  GB: "GBP",
  UK: "GBP",
  AU: "AUD",
  NZ: "AUD",
  // European countries
  DE: "EUR", FR: "EUR", IT: "EUR", ES: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", PT: "EUR", IE: "EUR", FI: "EUR",
  GR: "EUR", LU: "EUR", SI: "EUR", CY: "EUR", MT: "EUR",
  SK: "EUR", EE: "EUR", LV: "EUR", LT: "EUR",
}

export default function Page() {
  const [currency, setCurrency] = useState<keyof typeof PRICING_DATA>("USD") // Default to USD
  const [loading, setLoading] = useState(true)
  const pricing = PRICING_DATA[currency]

  useEffect(() => {
    // Detect user's country and set appropriate currency
    const detectCurrency = async () => {
      try {
        // Try to get country from timezone first (works offline)
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
        if (timezone.includes("Asia/Kolkata") || timezone.includes("Asia/Calcutta")) {
          setCurrency("INR")
        } else if (timezone.includes("Europe")) {
          setCurrency("EUR")
        } else if (timezone.includes("Australia")) {
          setCurrency("AUD")
        } else if (timezone.includes("America/New_York") || timezone.includes("America/Los_Angeles")) {
          setCurrency("USD")
        } else {
          // Fallback to IP-based geolocation
          const response = await fetch("https://ipapi.co/json/")
          const data = await response.json()
          const countryCode = data.country_code
          setCurrency(COUNTRY_TO_CURRENCY[countryCode] || "USD")
        }
      } catch {
        console.log("Using default currency (USD)")
        setCurrency("USD")
      } finally {
        setLoading(false)
      }
    }

    detectCurrency()
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Docita</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"}>
              <Button>Login</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:pb-40">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.900),theme(colors.background))]" />
        <div className="mx-auto max-w-7xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="font-medium text-muted-foreground">The Future of Clinic Management</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            Modern Healthcare <br />
            <span className="text-primary">Simplified.</span>
          </h1>
          <p className="mt-6 text-xl leading-8 text-muted-foreground max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            From solo practitioners to multi-specialty hospitals. Docita bridges the gap between paper records and AI-powered care.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <Link href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"}>
              <Button size="lg" className="h-12 px-8 text-lg gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Get Started Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-8 text-lg bg-background/50 backdrop-blur-sm">
              View Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Key Value Propositions */}
      <section className="px-6 py-20 bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:gap-16">
            
            {/* 1. Complete Paperless Implementation */}
            <div className="grid gap-8 lg:grid-cols-2 items-center">
              <div className="order-2 lg:order-1">
                <div className="inline-flex items-center gap-2 rounded-full bg-green-500/10 px-4 py-2 text-sm mb-4">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-green-700 dark:text-green-300">Eco-Friendly Practice</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Complete Paperless Implementation
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Say goodbye to paper prescriptions, physical files, and storage headaches. Docita transforms your clinic into a fully digital, eco-friendly practice.
                </p>
                <ul className="space-y-3">
                  {[
                    "Digital prescriptions accessible anywhere, anytime",
                    "No more lost or damaged paper records",
                    "Instant sharing via WhatsApp or email",
                    "Reduce your clinic's carbon footprint",
                    "Save on printing and storage costs"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 p-8 backdrop-blur-sm border border-green-500/20">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 p-12 flex items-center justify-center">
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
                  <span className="font-medium text-blue-700 dark:text-blue-300">Complete Medical Timeline</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Track Entire Patient History
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Every visit, prescription, test result, and document in one unified timeline. Never lose track of a patient's medical journey again.
                </p>
                <ul className="space-y-3">
                  {[
                    "Complete medical history at your fingertips",
                    "All visits, prescriptions, and reports in one place",
                    "Track treatment progress over time",
                    "Quick access to previous medications and allergies",
                    "Seamless continuity of care across visits"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1">
                <div className="relative rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 p-8 backdrop-blur-sm border border-blue-500/20">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 p-12 flex items-center justify-center">
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
                  <span className="font-medium text-purple-700 dark:text-purple-300">Zero Errors</span>
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                  Perfect Clinical Accuracy
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Eliminate handwriting interpretation errors completely. Every prescription is crystal clear, every dosage is precise, every instruction is legible.
                </p>
                <ul className="space-y-3">
                  {[
                    "Digital prescriptions are always 100% legible",
                    "No more misread handwriting or dosage errors",
                    "Standardized medical coding (ICD-10 compliant)",
                    "Reduce medication errors to absolute zero",
                    "Improve patient safety and treatment outcomes"
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <div className="relative rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 backdrop-blur-sm border border-purple-500/20">
                  <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 p-12 flex items-center justify-center">
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

      {/* Features Grid */}
      <section className="px-6 py-24 bg-muted/50">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful features designed for modern medical practices
            </p>
          </div>
          
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Calendar,
                title: "Smart Scheduling",
                desc: "Drag-and-drop calendar with automated reminders to reduce no-shows."
              },
              {
                icon: Users,
                title: "Patient Records",
                desc: "Comprehensive EMR with history, vitals, and digital prescriptions."
              },
              {
                icon: FileText,
                title: "Digital Billing",
                desc: "Generate professional invoices and track payments effortlessly."
              },
              {
                icon: MessageSquare,
                title: "Patient Communication",
                desc: "Integrated WhatsApp messaging for prescriptions and follow-ups."
              },
              {
                icon: Upload,
                title: "Easy Migration",
                desc: "Import your existing data from Excel or paper records in minutes."
              },
              {
                icon: ShieldCheck,
                title: "Secure & Private",
                desc: "Enterprise-grade security ensuring your patient data is safe."
              }
            ].map((feature, i) => (
              <Card key={i} className="border-none shadow-md bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors">
                <CardHeader>
                  <div className="mb-4 inline-block rounded-lg bg-primary/10 p-3 w-fit">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.desc}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="px-6 py-24 relative overflow-hidden">
        <div className="mx-auto max-w-7xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, Transparent Pricing</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start for free, upgrade as you grow
            </p>
            {!loading && (
              <p className="mt-2 text-sm text-muted-foreground">
                Pricing shown in {pricing.symbol} ({pricing.country})
              </p>
            )}
          </div>

          <div className="grid gap-8 lg:grid-cols-4 items-start">
            {/* FREE Tier */}
            <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">Free</CardTitle>
                <CardDescription>For solo doctors just starting</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{pricing.symbol}0</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Up to 100 patients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Basic appointments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Digital prescriptions</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline" onClick={() => window.location.href = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"}>Get Started</Button>
              </CardFooter>
            </Card>

            {/* STARTER Tier */}
            <Card className="relative flex flex-col h-full border-primary shadow-lg scale-105 z-10 bg-background">
              <div className="absolute -top-4 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
                Most Popular
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Starter</CardTitle>
                <CardDescription>For growing clinics</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{pricing.symbol}{pricing.starter}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Unlimited patients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>WhatsApp reminders</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Basic analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Email support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Start Free Trial</Button>
              </CardFooter>
            </Card>

            {/* PROFESSIONAL Tier */}
            <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">Professional</CardTitle>
                <CardDescription>For multi-doctor clinics</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{pricing.symbol}{pricing.professional}</span>
                  <span className="text-muted-foreground">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Multi-doctor support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Custom templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">Contact Sales</Button>
              </CardFooter>
            </Card>

            {/* ENTERPRISE Tier */}
            <Card className="relative flex flex-col h-full border-muted hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-xl">Enterprise</CardTitle>
                <CardDescription>For hospitals & chains</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">Custom</span>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Unlimited doctors</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>Dedicated account manager</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>SLA & Uptime guarantee</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">Contact Sales</Button>
              </CardFooter>
            </Card>
          </div>

          {/* Pricing Note */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>All plans include a 14-day free trial. No credit card required.</p>
            <p className="mt-2">Save 15% with annual billing.</p>
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
            Join thousands of doctors who have switched to Docita for a smarter, more efficient clinic.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Link href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000/login"}>
              <Button size="lg" variant="secondary" className="h-12 px-8 text-lg gap-2">
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
              <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="#" className="hover:text-foreground transition-colors">Contact</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Docita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
