"use client";

import { Card, CardContent } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";
import { ClipboardList, Pill, Receipt, Stethoscope } from "lucide-react";

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-muted/30 relative overflow-hidden">
      <div className="ui-page-shell relative z-10 px-6">
        <SectionHeading
          align="center"
          size="section"
          title="Streamlined Clinical Workflow"
          description="From patient check-in to final billing, Docita optimizes every step of your practice."
          className="mb-16"
          descriptionClassName="mx-auto max-w-2xl"
        />

        <div className="relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-linear-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2 hidden lg:block" />

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 relative z-10">
            {[
              {
                step: "01",
                title: "Check-in & Queue",
                desc: "Patient arrives, gets a token, and enters the smart queue system",
                icon: ClipboardList,
              },
              {
                step: "02",
                title: "Consultation",
                desc: "Doctor reviews history, records vitals, and adds clinical notes",
                icon: Stethoscope,
              },
              {
                step: "03",
                title: "Prescription",
                desc: "Digital prescription generated instantly with AI assistance",
                icon: Pill,
              },
              {
                step: "04",
                title: "Billing & Leave",
                desc: "Automated invoice generation and payment collection",
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
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-transform duration-300 group-hover:scale-110">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="absolute top-4 right-4 text-4xl font-bold text-muted/20 select-none">
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
