"use client";

import Link from "next/link";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { Button } from "@workspace/ui/components/button";


export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/10 p-2">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">Docita</span>
          </Link>
          <Link href="/">
            <Button variant="ghost" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <h1 className="mb-2 text-4xl font-bold tracking-tight">Refund Policy</h1>
          <p className="mb-8 text-muted-foreground">Last updated: March 09, 2026</p>

          <div className="space-y-8">
            <section>
              <h2 className="mb-3 text-2xl font-semibold">1. Scope</h2>
              <p className="text-muted-foreground">
                This Refund Policy applies to paid Docita subscriptions and paid
                add-ons purchased directly from Docita.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">2. Free Trial</h2>
              <p className="text-muted-foreground">
                New subscriptions may include a trial period. You can cancel
                during the trial to avoid billing.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">3. Monthly Plans</h2>
              <p className="text-muted-foreground">
                Monthly subscriptions are billed in advance and are generally
                non-refundable after billing, except where required by law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">4. Annual Plans</h2>
              <p className="text-muted-foreground">
                Annual subscriptions are billed in advance. You may request a
                refund within 14 days of the first annual charge if your account
                has not exceeded normal onboarding and evaluation usage.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">5. Add-ons and Usage Charges</h2>
              <p className="text-muted-foreground">
                Usage-based charges (for example messaging or AI credits already
                consumed) are non-refundable. Unused prepaid add-on balances may
                be reviewed case-by-case.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-2xl font-semibold">6. How to Request a Refund</h2>
              <p className="text-muted-foreground">
                Send your request to billing@docita.work with your clinic name,
                registered email, invoice reference, and reason for the request.
                Refund decisions are typically completed within 7 business days.
              </p>
            </section>
          </div>
        </div>
      </main>

      <footer className="border-t px-6 py-8 bg-muted/30">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
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
              <Link href="/refund-policy" className="text-foreground font-medium">
                Refund Policy
              </Link>
              <Link
                href="/contact"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Docita. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
