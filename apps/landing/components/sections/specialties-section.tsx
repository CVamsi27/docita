"use client";

import { Stethoscope, Baby, CheckCircle2, Smile } from "lucide-react";
import { Card } from "@workspace/ui/components/card";

export function SpecialtiesSection() {
  return (
    <section className="px-6 py-24 bg-linear-to-b from-blue-50/50 to-white dark:from-blue-950/10 dark:to-background">
      <div className="mx-auto max-w-7xl">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-2 text-sm mb-4">
            <Stethoscope className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-700 dark:text-blue-300">
              Tailored for Your Specialty
            </span>
          </div>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
            Built for Specialized Care
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From dental charting to pediatric growth tracking, Docita adapts to
            your specific clinical needs.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Pediatric Card */}
          <Card className="overflow-hidden border-indigo-100 dark:border-indigo-900 bg-linear-to-br from-indigo-50/50 to-white dark:from-indigo-950/20 dark:to-background">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <Baby className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Pediatrics</h3>
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
                    <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="h-48 rounded-xl bg-white dark:bg-black/20 border p-4 flex items-end gap-2 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[url('/grid.svg')]" />
                <div className="w-full flex items-end justify-between gap-1 h-full pt-8">
                  {[30, 45, 52, 60, 68, 75, 82].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 bg-indigo-500 rounded-t-sm opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <div className="absolute top-4 left-4 text-xs font-semibold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                  Growth Tracker
                </div>
              </div>
            </div>
          </Card>

          {/* Dental Card */}
          <Card className="overflow-hidden border-teal-100 dark:border-teal-900 bg-linear-to-br from-teal-50/50 to-white dark:from-teal-950/20 dark:to-background">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-xl bg-teal-100 flex items-center justify-center">
                  <Smile className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Dental Care</h3>
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
                    <CheckCircle2 className="h-5 w-5 text-teal-600 shrink-0" />
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
              <div className="h-48 rounded-xl bg-white dark:bg-black/20 border p-4 flex items-center justify-center relative overflow-hidden">
                <div className="grid grid-cols-8 gap-2 w-full max-w-sm">
                  {[...Array(16)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-8 rounded-md flex items-center justify-center text-xs font-mono border ${
                        i % 3 === 0
                          ? "bg-teal-500 text-white border-teal-600"
                          : "bg-muted/50 border-muted"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="absolute top-4 left-4 text-xs font-semibold bg-teal-100 text-teal-700 px-2 py-1 rounded">
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
