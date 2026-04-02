"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";

export function CtaBottomSection() {
  return (
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
              Start trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm opacity-90">
          14-day free trial • No credit card required
        </p>
      </div>
    </section>
  );
}
