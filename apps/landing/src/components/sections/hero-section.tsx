"use client";

import { Button } from "@workspace/ui/components/button";
import {
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  MessageSquare,
  Shield,
  Sparkles,
  Stethoscope,
} from "lucide-react";

interface HeroSectionProps {
  appUrl: string;
}

export function HeroSection({ appUrl }: HeroSectionProps) {
  return (
    <section className="landing-hero-origin landing-section-hero relative overflow-hidden">
      <div className="ui-page-shell relative z-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
          <div className="landing-chip mb-5">
            <Shield className="h-4 w-4 text-primary" />
            <span className="font-medium text-muted-foreground">
              Built for Indian private clinics
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </div>

          <h1 className="ui-hero-title max-w-5xl text-balance text-foreground">
            Run your clinic with clarity.
          </h1>

          <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            Docita brings OPD queues, appointments, prescriptions, billing,
            documents, and WhatsApp follow-ups into one calm workspace for
            growing clinics.
          </p>

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <Button
              asChild
              size="pill"
              className="w-full gap-2 sm:w-auto"
            >
              <a href={`${appUrl}/onboarding`}>
                Start clinic setup
                <ArrowRight className="h-5 w-5" />
              </a>
            </Button>
            <Button
              asChild
              size="pill"
              variant="outline"
              className="w-full gap-2 sm:w-auto"
            >
              <a href="/contact">
                <CalendarCheck className="h-5 w-5" />
                Book guided demo
              </a>
            </Button>
          </div>

          <div className="landing-command-bar mt-9 w-full max-w-2xl">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <span className="min-w-0 flex-1 text-left text-sm font-medium text-foreground sm:text-base">
              What needs attention in clinic today?
            </span>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              Ask Docita
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          <div className="landing-product-stage mt-10 w-full text-left">
            <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
              <div className="ui-card-surface p-4 shadow-md">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Today at Sunrise Clinic
                    </p>
                    <p className="text-xs text-muted-foreground">
                      OPD flow, payments, and follow-ups in one view
                    </p>
                  </div>
                  <div className="badge-success inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Live queue healthy
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  {[
                    ["18", "Appointments"],
                    ["9", "Checked in"],
                    ["6", "Prescriptions"],
                    ["₹24,350", "Outstanding"],
                  ].map(([value, label]) => (
                    <div
                      key={label}
                      className="ui-panel-muted p-3"
                    >
                      <p className="ui-section-title text-[var(--fs-2xl)] text-foreground">
                        {value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
                  {[
                    ["09:30 AM", "Rohit Sharma", "Follow-up", "Checked in"],
                    ["10:00 AM", "Meera Iyer", "Consultation", "Confirmed"],
                    ["10:30 AM", "Arun Patel", "Vaccination", "Waiting"],
                  ].map(([time, patient, visit, status]) => (
                    <div
                      key={`${time}-${patient}`}
                      className="grid grid-cols-[72px_1fr_auto] items-center gap-3 border-b border-border/60 bg-background px-3 py-3 text-sm last:border-b-0"
                    >
                      <span className="text-xs font-medium text-muted-foreground">
                        {time}
                      </span>
                      <span>
                        <span className="block font-medium text-foreground">
                          {patient}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {visit}
                        </span>
                      </span>
                      <span className="badge-muted rounded-full px-2.5 py-1 text-xs font-semibold">
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="ui-card-surface p-4 shadow-md">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
                    <Stethoscope className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Patient follow-up
                    </p>
                    <p className="text-xs text-muted-foreground">
                      WhatsApp-ready after visit
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-3 text-sm">
                  <div className="rounded-xl bg-muted/60 p-3 text-muted-foreground">
                    Hi Ritu, your follow-up is tomorrow at 10:00 AM.
                  </div>
                  <div className="ml-auto rounded-xl bg-success/15 p-3 font-medium text-foreground">
                    Yes, confirmed
                  </div>
                  <div className="rounded-xl border border-border/70 bg-background p-3 text-muted-foreground">
                    Prescription PDF attached after consultation.
                  </div>
                </div>
                <Button asChild className="mt-4 w-full gap-2">
                  <a href="/whatsapp-workflows">
                    <MessageSquare className="h-4 w-4" />
                    See workflows
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
