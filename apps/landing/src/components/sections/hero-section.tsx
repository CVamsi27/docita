"use client";

import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  FileSpreadsheet,
  MessageSquare,
  Shield,
} from "lucide-react";

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  return (
    <section className="hero-grid relative overflow-hidden px-6 py-20 sm:py-24 lg:py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_45rem_at_0%_0%,theme(colors.primary.100),transparent_55%),radial-gradient(40rem_28rem_at_100%_0%,theme(colors.info.100),transparent_45%)] dark:bg-[radial-gradient(60rem_45rem_at_0%_0%,theme(colors.primary.900),transparent_55%),radial-gradient(40rem_28rem_at_100%_0%,theme(colors.info.900),transparent_45%)]" />
      <div className="ui-page-shell">
        <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-background/75 px-4 py-2 text-sm backdrop-blur-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium text-muted-foreground">
                Built for Indian private clinics
              </span>
            </div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Docita
            </p>
            <SectionHeading
              size="hero"
              title={
                <span className="bg-linear-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
                  From paper files, Excel, and WhatsApp chaos to one reliable
                  clinic workflow.
                </span>
              }
              description="Built for multi-specialty clinics with 1-5 doctors. Import your records, run OPD and billing cleanly, and get reception, doctor, and follow-up workflows live in days."
              className="max-w-4xl"
              descriptionClassName="max-w-2xl"
            />
            <ul className="mt-8 space-y-3 text-sm text-muted-foreground sm:text-base">
              {[
                {
                  icon: FileSpreadsheet,
                  text: "Import existing Excel and paper-based records without starting from scratch.",
                },
                {
                  icon: MessageSquare,
                  text: "Use receptionist-friendly reminders, prescription sharing, and patient follow-ups over WhatsApp.",
                },
                {
                  icon: CheckCircle2,
                  text: "Keep prescriptions, billing, queue, and patient history in one dependable clinic workflow.",
                },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-3">
                  <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
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
                className="gap-2 bg-background/60 backdrop-blur-sm"
              >
                <a href="/contact">
                  <CalendarCheck className="h-5 w-5" />
                  Book a guided demo
                </a>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              14-day free trial • No credit card required • India-first rollout
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-x-8 -top-5 h-24 rounded-full bg-primary/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-background/90 p-3 shadow-[0_30px_120px_-32px_rgba(15,23,42,0.35)] backdrop-blur">
              <img
                src="/demo-thumbnail.png"
                alt="Docita product tour preview showing the clinic workflow"
                className="w-full rounded-[1.35rem] border border-border/60 object-cover"
                loading="eager"
              />
              <div className="mt-4 flex items-center justify-between gap-4 px-2 pb-1">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    90-second product walkthrough
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Import, queue, prescriptions, billing, and patient history.
                  </p>
                </div>
                <a
                  href="#tour"
                  className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
                >
                  See what is live
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
