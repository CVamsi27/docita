"use client";

import Link from "next/link";
import { Button } from "@workspace/ui/components/button";
import { ArrowRight, CalendarCheck, Sparkles } from "lucide-react";

export function HeroSection() {
  return (
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
              Start trial
              <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button
              size="lg"
              variant="outline"
              className="h-12 px-8 text-lg bg-background/50 backdrop-blur-sm gap-2"
            >
              <CalendarCheck className="h-5 w-5" />
              Book a Demo
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          14-day free trial • No credit card required
        </p>
      </div>
    </section>
  );
}
