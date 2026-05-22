"use client";

import {
  Calendar,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SectionHeading } from "@workspace/ui/components/layout/section-heading";

export function ValuePropsSection() {
  return (
    <section className="landing-section bg-background">
      <div className="ui-page-shell">
        <div className="grid gap-12 lg:gap-16">
          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="badge-success mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span className="font-medium text-foreground">
                  Paper-to-cloud rollout
                </span>
              </div>
              <SectionHeading
                size="section"
                title="Start from your current records, not from a blank screen"
                description="Move from registers, loose sheets, and Excel exports into a single workflow without forcing the clinic to relearn everything at once."
                className="mb-6"
              />
              <ul className="space-y-3">
                {[
                  "Import patients from Excel or CSV with duplicate checks",
                  "Archive paper documents and keep them attached to patient history",
                  "Share digital prescriptions and reports over WhatsApp or email",
                  "Run the front desk and doctor workflow from one place",
                  "Keep the switch manageable for staff who already work from registers",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-[var(--radius)] border border-success/20 bg-success/5 p-5 sm:p-8">
                <div className="aspect-square rounded-[var(--radius)] bg-success p-12 flex items-center justify-center">
                  <FileText className="h-32 w-32 text-white" />
                </div>
                <div className="absolute right-3 top-3 rounded-full border border-success/30 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg sm:-right-4 sm:-top-4 sm:px-4 sm:py-2 sm:text-sm">
                  Migration-ready
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2">
              <div className="badge-info mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm">
                <Users className="h-4 w-4 text-info" />
                <span className="font-medium text-foreground">
                  One patient timeline
                </span>
              </div>
              <SectionHeading
                size="section"
                title="See the full patient journey without hunting across files"
                description="Appointments, prescriptions, vitals, documents, lab results, and notes stay together so the next visit starts with context."
                className="mb-6"
              />
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
              <div className="relative rounded-[var(--radius)] border border-info/20 bg-info/5 p-5 sm:p-8">
                <div className="aspect-square rounded-[var(--radius)] bg-info p-12 flex items-center justify-center">
                  <Calendar className="h-32 w-32 text-white" />
                </div>
                <div className="absolute right-3 top-3 rounded-full border border-info/30 bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg sm:-right-4 sm:-top-4 sm:px-4 sm:py-2 sm:text-sm">
                  Complete Timeline
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2 items-center">
            <div className="order-2 lg:order-1">
              <div className="inline-flex items-center gap-2 rounded-full tier-pro px-4 py-2 text-sm mb-4">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-medium text-primary">Zero Errors</span>
              </div>
              <SectionHeading
                size="section"
                title="Cleaner prescriptions, clearer billing, fewer handoff mistakes"
                description="Legible prescriptions, standardized coding support, and structured records reduce the operational mess that slows small clinics down."
                className="mb-6"
              />
              <ul className="space-y-3">
                {[
                  "Digital prescriptions are always 100% legible",
                  "No more misread handwriting or dosage errors",
                  "Standardized medical coding (ICD-10 compliant)",
                  "Send invoices and receipts from the same visit workflow",
                  "Keep a traceable record of what was prescribed, billed, and shared",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="order-1 lg:order-2">
              <div className="relative rounded-[var(--radius)] border border-primary/20 bg-primary/5 p-5 sm:p-8">
                <div className="aspect-square rounded-[var(--radius)] bg-primary p-12 flex items-center justify-center">
                  <ShieldCheck className="h-32 w-32 text-white" />
                </div>
                <div className="absolute right-3 top-3 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg sm:-right-4 sm:-top-4 sm:px-4 sm:py-2 sm:text-sm">
                  Clear workflow
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
