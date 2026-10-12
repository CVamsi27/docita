"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileText,
  type LucideIcon,
  Receipt,
  ScanText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserRound,
} from "lucide-react";

import { Button } from "@workspace/ui/components/form/button";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";
import { DifferentiatorCard } from "./differentiator-card";

const TRUST_BADGES = [
  "India residency · Mumbai",
  "DPDP-aware consent",
  "Role-based access",
  "Audit logs",
  "Encryption in transit + at rest",
  "Data export · CSV",
];

type PortalRow = { icon: LucideIcon; label: string };

function PortalListRow({ row }: { row: PortalRow }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-md border border-border/40 bg-muted px-2.5 py-1.5">
      <row.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1 truncate text-foreground">{row.label}</span>
    </li>
  );
}

export function DifferentiatorsSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.07, 0.04);

  return (
    <section
      id="differentiators"
      className="r2-section r2-section-quiet r2-band-base"
      aria-labelledby="r2-diff-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">What sets Docita apart</span>
        </div>

        <h2
          id="r2-diff-heading"
          className="mt-4 max-w-3xl r2-display-sm text-foreground"
        >
          Three things <em>local tools</em> usually skip&mdash;and we lead with.
        </h2>

        <motion.div
          className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          <DifferentiatorCard
            icon={UserRound}
            eyebrow="Patient portal"
            title="Your patients log in too."
            description="A real patient portal&mdash;not a WhatsApp link. Patients see upcoming visits, past prescriptions, bills, and consent settings in one place."
            variants={item}
          >
            <div className="r2-diff-surface">
              <div className="mb-3 flex items-center justify-between">
                <p className="r2-mono text-[var(--fs-2xs)] uppercase tracking-[0.12em] text-muted-foreground">
                  PORTAL &middot; R. IYER
                </p>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              </div>
              <ul className="space-y-2 text-xs">
                {[
                  { icon: CalendarCheck, label: "Next visit · 28 May · 11:30" },
                  { icon: FileText, label: "Prescription · Metformin 500mg" },
                  { icon: Receipt, label: "Receipt · \u20B9700 · Paid · UPI" },
                  { icon: ShieldCheck, label: "Consent · WhatsApp granted" },
                ].map((row) => (
                  <PortalListRow key={row.label} row={row} />
                ))}
              </ul>
            </div>
          </DifferentiatorCard>

          <DifferentiatorCard
            icon={Sparkles}
            eyebrow="AI Assist"
            title="AI that helps&mdash;without diagnosing."
            description="Narrow, reviewable assistance for the things that slow reception and clinicians down: digitising old records, capturing scans from a phone, and an Ask AI overlay scoped to whatever surface you are on."
            variants={item}
          >
            <div className="r2-diff-surface">
              <ul className="space-y-2 text-xs">
                {[
                  { icon: ScanText, label: "OCR for old prescriptions & case sheets" },
                  { icon: Smartphone, label: "Mobile camera upload to patient record" },
                  { icon: Brain, label: "Ask AI overlay, scoped to current surface" },
                  { icon: FileText, label: "Prescription templates with auto dose rules" },
                ].map((row) => (
                  <PortalListRow key={row.label} row={row} />
                ))}
              </ul>
              <p className="mt-3 rounded-md border border-border/40 bg-muted px-2.5 py-2 text-xs leading-snug text-muted-foreground">
                AI suggestions are reviewed and signed off by the doctor.
                We do not generate diagnoses.
              </p>
            </div>
          </DifferentiatorCard>

          <DifferentiatorCard
            icon={ShieldCheck}
            eyebrow="Trust posture"
            title="Controls we can stand behind today."
            description="We describe what we operate&mdash;not unsupported certifications. India-hosted backend, role-based access, audit logs, consent on every WhatsApp send, and full data export."
            variants={item}
          >
            <div className="r2-diff-surface">
              <ul className="grid grid-cols-2 gap-1.5 text-[var(--fs-2xs)]">
                {TRUST_BADGES.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-1.5 rounded-md border border-border/40 bg-muted px-2 py-1.5"
                  >
                    <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                    <span className="leading-tight text-foreground">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </DifferentiatorCard>
        </motion.div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button asChild variant="outline" className="gap-2">
            <a href="/trust">
              See trust details
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <a href="/whatsapp-workflows">
              WhatsApp workflows
              <ArrowRight className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
}
