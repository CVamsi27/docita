"use client";

import { Button } from "@workspace/ui/components/button";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import {
  ArrowRight,
  CalendarCheck,
  FileSpreadsheet,
  MessageSquare,
  ReceiptText,
  Shield,
} from "lucide-react";

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  return (
    <section className="hero-grid landing-section-hero relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_45rem_at_0%_0%,theme(colors.primary.100),transparent_55%),radial-gradient(40rem_28rem_at_100%_0%,theme(colors.info.100),transparent_45%)] dark:bg-[radial-gradient(60rem_45rem_at_0%_0%,theme(colors.primary.900),transparent_55%),radial-gradient(40rem_28rem_at_100%_0%,theme(colors.info.900),transparent_45%)]" />
      <div className="ui-page-shell">
        <div className="flex w-full flex-col items-center text-center">
          <div className="w-full">
            <div className="landing-chip mb-5">
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
                  Clinic software for OPD, billing, records, and follow-ups.
                </span>
              }
              description="Docita helps 1-5 doctor clinics move daily work out of paper files, Excel sheets, and WhatsApp threads into one practical workflow."
              className="max-w-none"
              titleClassName="mx-auto max-w-6xl text-3xl leading-tight min-[380px]:text-4xl sm:text-5xl lg:text-6xl"
              descriptionClassName="mx-auto max-w-4xl"
            />
            <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
              <Button
                asChild
                size="lg"
                className="w-full gap-2 shadow-lg shadow-primary/20 transition-shadow hover:shadow-primary/30 sm:w-auto"
              >
                <a href={`${appUrl}/onboarding`}>
                  Start clinic setup
                  <ArrowRight className="h-5 w-5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full gap-2 bg-background/60 backdrop-blur-sm sm:w-auto"
              >
                <a href="/contact">
                  <CalendarCheck className="h-5 w-5" />
                  Book guided demo
                </a>
              </Button>
            </div>
            <ul className="mt-7 grid w-full gap-3 text-sm text-muted-foreground sm:grid-cols-3">
              {[
                {
                  icon: FileSpreadsheet,
                  title: "Import records",
                  text: "Move Excel and paper lists into patient workflows.",
                },
                {
                  icon: ReceiptText,
                  title: "Run OPD",
                  text: "Queue, prescriptions, billing, and history stay together.",
                },
                {
                  icon: MessageSquare,
                  title: "Follow up",
                  text: "Send reminders and prescriptions through WhatsApp.",
                },
              ].map((item) => (
                <li
                  key={item.title}
                  className="landing-card flex flex-col items-center p-3 text-center sm:p-4"
                >
                  <item.icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 font-semibold text-foreground sm:mt-3">
                    {item.title}
                  </p>
                  <p className="mt-1 leading-6">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
