"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import {
  ClipboardList,
  FileSpreadsheet,
  Pill,
  Receipt,
  Stethoscope,
} from "lucide-react";

export function HowItWorksSection() {
  return (
    <section className="landing-section relative overflow-hidden bg-muted/30">
      <div className="ui-page-shell relative z-10">
        <SectionHeading
          align="center"
          size="section"
          title="A rollout your front desk can actually adopt"
          description="Start from the records and habits your clinic already has, then move day-to-day operations into one reliable workflow."
          className="mb-16"
          descriptionClassName="mx-auto max-w-2xl"
        />

        <div className="relative">
          <div className="absolute top-1/2 left-0 hidden h-px w-full -translate-y-1/2 bg-border lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5 relative z-10">
            {[
              {
                step: "01",
                title: "Import Existing Records",
                desc: "Bring over spreadsheets, paper scans, and your existing patient list before the team changes its daily routine.",
                icon: FileSpreadsheet,
              },
              {
                step: "02",
                title: "Check-in & Queue",
                desc: "Reception logs walk-ins and appointments in one queue instead of juggling paper registers and phone calls.",
                icon: ClipboardList,
              },
              {
                step: "03",
                title: "Consultation & Prescription",
                desc: "Doctors review history, capture clinical details, and generate clear digital prescriptions.",
                icon: Stethoscope,
              },
              {
                step: "04",
                title: "Billing & Follow-up",
                desc: "Send invoices, reminders, and follow-up instructions without leaving the clinic workflow.",
                icon: Pill,
              },
              {
                step: "05",
                title: "Collections & Audit Trail",
                desc: "Track payments, export data, and keep role-based records of sensitive actions.",
                icon: Receipt,
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <Card
                  interaction="interactive"
                  className="h-full border-border/70 bg-background/95 text-center shadow-lg transition-transform duration-300 group-hover:-translate-y-1"
                  density="spacious"
                >
                  <CardContent className="relative flex h-full flex-col items-center ui-section-stack px-8">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70 transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute top-4 right-4 select-none text-[var(--fs-3xl)] font-semibold text-muted/20 md:text-[var(--fs-4xl)]">
                      {item.step}
                    </div>
                    <div className="ui-copy-stack">
                      <h3 className="ui-section-title">{item.title}</h3>
                      <p className="ui-section-subtitle">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
