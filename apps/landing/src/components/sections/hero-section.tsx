"use client";

import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import { ArrowRight, CalendarCheck, Sparkles } from "lucide-react";

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:pb-40">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.100),white)] dark:bg-[radial-gradient(45rem_50rem_at_top,theme(colors.primary.900),var(--color-background))]" />
      <div className="ui-page-shell text-center">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-muted-foreground">
            The Future of Healthcare Management
          </span>
        </div>
        <SectionHeading
          align="center"
          size="hero"
          title={
            <span className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Modern Healthcare <br />
              <span className="text-primary">Simplified</span>
            </span>
          }
          description="From solo practitioners to multi-specialty hospitals. Docita bridges the gap between paper records and AI-powered care."
          className="mx-auto max-w-4xl"
          descriptionClassName="mx-auto max-w-3xl"
        />
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button
            asChild
            size="lg"
            className="gap-2 shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/30"
          >
            <a href={`${appUrl}/onboarding`}>
              Start trial
              <ArrowRight className="h-5 w-5" />
            </a>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="gap-2 bg-background/50 backdrop-blur-sm"
          >
            <a href="/contact">
              <CalendarCheck className="h-5 w-5" />
              Book a Demo
            </a>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          14-day free trial • No credit card required
        </p>
      </div>
    </section>
  );
}
