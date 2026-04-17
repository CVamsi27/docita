"use client";

import {
  Calendar,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";

export function ValuePropsSection() {
  return (
    <section className="px-6 py-20 bg-linear-to-b from-background to-muted/30">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:gap-16">
          {}
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-success/30 bg-success/10 px-4 py-2 text-sm text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium text-foreground">
                  Eco-Friendly Practice
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Complete Paperless Implementation
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Say goodbye to paper prescriptions, physical files, and storage
                headaches. Docita transforms your facility into a fully digital,
                eco-friendly practice.
              </p>
              <ul className="space-y-3">
                {[
                  "Digital prescriptions accessible anywhere, anytime",
                  "No more lost or damaged paper records",
                  "Instant sharing via WhatsApp or email",
                  "Reduce your facility's carbon footprint",
                  "Save on printing and storage costs",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl bg-linear-to-br from-success/20 to-success/10 p-8 backdrop-blur-sm border border-success/20">
                <div className="aspect-square rounded-xl bg-success p-12 flex items-center justify-center">
                  <FileText className="h-32 w-32 text-white" />
                </div>
                <div className="absolute -top-4 -right-4 rounded-full border border-success/30 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg">
                  100% Digital
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-info/30 bg-info/10 px-4 py-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-info" />
                <span className="font-medium text-foreground">
                  Complete Medical Timeline
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Track Entire Patient History
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Every visit, prescription, test result, and document in one
                unified timeline. Never lose track of a patient&apos;s medical
                journey again.
              </p>
              <ul className="space-y-3">
                {[
                  "Complete medical history at your fingertips",
                  "All visits, prescriptions, and reports in one place",
                  "Track treatment progress over time",
                  "Quick access to previous medications and allergies",
                  "Seamless continuity of care across visits",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1">
              <div className="relative rounded-2xl bg-linear-to-br from-info/20 to-info/10 p-8 backdrop-blur-sm border border-info/20">
                <div className="aspect-square rounded-xl bg-info p-12 flex items-center justify-center">
                  <Calendar className="h-32 w-32 text-white" />
                </div>
                <div className="absolute -top-4 -right-4 rounded-full border border-info/30 bg-background px-4 py-2 text-sm font-semibold text-foreground shadow-lg">
                  Complete Timeline
                </div>
              </div>
            </div>
          </div>

          {}
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full tier-pro px-4 py-2 text-sm mb-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary"> 
                  Zero Errors
                </span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4">
                Perfect Clinical Accuracy
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Eliminate handwriting interpretation errors completely. Every
                prescription is crystal clear, every dosage is precise, every
                instruction is legible.
              </p>
              <ul className="space-y-3">
                {[
                  "Digital prescriptions are always 100% legible",
                  "No more misread handwriting or dosage errors",
                  "Standardized medical coding (ICD-10 compliant)",
                  "Reduce medication errors to absolute zero",
                  "Improve patient safety and treatment outcomes",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-2xl bg-linear-to-br from-primary/20 to-primary/10 p-8 backdrop-blur-sm border border-primary/20">
                <div className="aspect-square rounded-xl bg-primary p-12 flex items-center justify-center">
                  <ShieldCheck className="h-32 w-32 text-white" />
                </div>
                <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold shadow-lg">
                  100% Accurate
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
