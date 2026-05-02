"use client";

import { Button } from "@workspace/ui/components/button";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function CtaBottomSection() {
  return (
    <section className="landing-cta-sheen landing-section relative overflow-hidden bg-primary text-primary-foreground">
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.12]" />
      <div className="ui-page-shell relative z-10">
        <div className="mx-auto max-w-4xl text-center">
          <SectionHeading
            align="center"
            size="section"
            title="Ready to get one clinic workflow live?"
            description="Book a guided setup for patient records, prescriptions, billing, WhatsApp follow-up, and the first staff workflow."
            className="text-primary-foreground"
            descriptionClassName="mx-auto mt-6 max-w-2xl text-primary-foreground/85 text-base leading-relaxed sm:text-lg"
          />
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
