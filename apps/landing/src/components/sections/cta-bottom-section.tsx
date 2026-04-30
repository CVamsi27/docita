"use client";

import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";

export function CtaBottomSection() {
  return (
    <section className="landing-section relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
      <div className="ui-page-shell relative z-10">
        <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-4xl font-bold tracking-normal sm:text-5xl">
          Ready to get one clinic workflow live?
        </h2>
        <p className="mt-6 text-xl opacity-90 max-w-2xl mx-auto">
          Book a guided setup for patient records, prescriptions, billing,
          WhatsApp follow-up, and the first staff workflow.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="h-12 px-8 text-lg gap-2"
          >
            <a href="/contact">
              Book clinic setup
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm opacity-90">
          Setup from INR 4,999 • Software plans from INR 499/month
        </p>
        </div>
      </div>
    </section>
  );
}
