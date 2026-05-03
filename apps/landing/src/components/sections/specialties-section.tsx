"use client";

import { Baby, CheckCircle2, Smile, Stethoscope } from "lucide-react";
import { Card } from "@workspace/ui/components/card";
import { SectionHeading } from "@workspace/ui/components/section-heading";

export function SpecialtiesSection() {
  return (
    <section className="landing-section bg-muted/30">
      <div className="ui-page-shell">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full badge-info px-4 py-2 text-sm mb-4">
            <Stethoscope className="h-4 w-4 text-info" />
            <span className="font-medium text-info">
              Tailored for Your Specialty
            </span>
          </div>
          <SectionHeading
            align="center"
            size="section"
            title="Built for Specialized Care"
            description="From dental charting to pediatric growth tracking, Docita adapts to your specific clinical needs."
            descriptionClassName="mx-auto max-w-2xl"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <Card className="overflow-hidden border-border bg-card">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full border border-border/70 bg-muted flex items-center justify-center">
                  <Baby className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="ui-section-title text-[var(--fs-2xl)]">
                    Pediatrics
                  </h3>
                  <p className="text-muted-foreground">
                    Comprehensive child care tools
                  </p>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "WHO Standard Growth Charts (Height/Weight/BMI)",
                  "Automated Vaccination Schedules & Reminders",
                  "Developmental Milestones Tracking",
                  "Pediatric-specific Dosage Calculators",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-info shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="h-48 rounded-[var(--radius)] bg-background border border-border p-4 flex items-end gap-2 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')]" />
                <div className="w-full flex items-end justify-between gap-1 h-full pt-8">
                  {[30, 45, 52, 60, 68, 75, 82].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-info rounded-t-sm opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="absolute top-4 left-4 text-xs font-semibold badge-info px-2 py-1 rounded">
                  Growth Tracker
                </div>
              </div>
            </div>
          </Card>

          <Card className="overflow-hidden border-border bg-card">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full border border-border/70 bg-muted flex items-center justify-center">
                  <Smile className="h-6 w-6 text-success" />
                </div>
                <div>
                  <h3 className="ui-section-title text-[var(--fs-2xl)]">
                    Dental Care
                  </h3>
                  <p className="text-muted-foreground">
                    Advanced dental practice management
                  </p>
                </div>
              </div>
              <ul className="space-y-4 mb-8">
                {[
                  "Interactive Tooth Numbering & Charting",
                  "Procedure Mapping (CDT Codes)",
                  "Dental History Visualization",
                  "Treatment Planning & Cost Estimation",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="h-48 rounded-[var(--radius)] bg-background border border-border p-4 flex items-center justify-center relative overflow-hidden">
                <div className="grid grid-cols-8 gap-2 w-full max-w-sm">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-8 rounded-[var(--radius)] flex items-center justify-center border text-xs font-mono ${
                        i % 3 === 0
                          ? "border-success/30 bg-success/10 text-foreground"
                          : "bg-muted/50 border-muted"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="absolute top-4 left-4 rounded border border-success/30 bg-success/10 px-2 py-1 text-xs font-semibold text-foreground">
                  Dental Charting
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
