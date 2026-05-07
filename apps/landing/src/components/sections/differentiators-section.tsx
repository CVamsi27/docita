"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  FileText,
  Mic,
  Receipt,
  ScanText,
  ShieldCheck,
  Smartphone,
  Smile,
  Sparkles,
} from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

const TRUST_BADGES = [
  "India residency · Mumbai",
  "DPDP-aware consent",
  "Role-based access",
  "Audit logs",
  "Encryption in transit + at rest",
  "Data export · CSV",
];

export function DifferentiatorsSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.07, 0.04);

  return (
    <section
      id="differentiators"
      className="r2-section r2-band-base"
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
          Three things <em>local CMS</em> usually skip&mdash;and we lead with.
        </h2>

        <motion.div
          className="mt-10 grid gap-6 lg:grid-cols-3"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
        >
          <motion.article variants={item} className="r2-diff-col">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <Smile className="h-4 w-4" />
              </span>
              <p className="r2-eyebrow r2-eyebrow-accent">Patient Portal</p>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Your patients log in too.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              A real patient portal&mdash;not a WhatsApp link. They see their
              upcoming visits, past prescriptions, bills, and consent settings
              in one place.
            </p>
            <div className="r2-diff-surface">
              <div className="mb-3 flex items-center justify-between">
                <p className="r2-mono text-[var(--fs-2xs)] uppercase tracking-[0.12em] text-muted-foreground">
                  PORTAL · R. IYER
                </p>
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
              </div>
              <ul className="space-y-2 text-xs">
                {[
                  { icon: CalendarCheck, label: "Next visit · 28 May · 11:30" },
                  { icon: FileText, label: "Prescription · Metformin 500mg" },
                  { icon: Receipt, label: "Receipt · ₹700 · Paid · UPI" },
                  { icon: ShieldCheck, label: "Consent · WhatsApp granted" },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-2 rounded-md border border-border/40 bg-muted px-2.5 py-1.5"
                  >
                    <row.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate text-foreground">{row.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          <motion.article variants={item} className="r2-diff-col">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <Sparkles className="h-4 w-4" />
              </span>
              <p className="r2-eyebrow r2-eyebrow-accent">AI Assist</p>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              AI that helps&mdash;without diagnosing.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Narrow, reviewable assistance: OCR for old prescriptions, mobile
              upload of scans, and a prescription assistant the doctor signs
              off. No broad diagnosis claims.
            </p>
            <div className="r2-diff-surface">
              <ul className="space-y-2 text-xs">
                {[
                  {
                    icon: ScanText,
                    label: "OCR digitization",
                    badge: "Live",
                    tone: "done" as const,
                  },
                  {
                    icon: Smartphone,
                    label: "Mobile upload (phone camera)",
                    badge: "Live",
                    tone: "done" as const,
                  },
                  {
                    icon: Brain,
                    label: "Prescription drafting & checks",
                    badge: "Planned",
                    tone: "wait" as const,
                  },
                  {
                    icon: Mic,
                    label: "Voice dictation to notes",
                    badge: "Planned",
                    tone: "wait" as const,
                  },
                ].map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-2 rounded-md border border-border/40 bg-muted px-2.5 py-1.5"
                  >
                    <row.icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="flex-1 truncate text-foreground">
                      {row.label}
                    </span>
                    <span
                      className={
                        row.tone === "done"
                          ? "r2-status-pill r2-status-pill--done"
                          : "r2-status-pill r2-status-pill--waiting"
                      }
                    >
                      {row.badge}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          <motion.article variants={item} className="r2-diff-col">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
                aria-hidden
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
              <p className="r2-eyebrow r2-eyebrow-accent">Trust posture</p>
            </div>
            <h3 className="text-lg font-semibold tracking-tight text-foreground">
              Controls we can stand behind today.
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              We describe what we operate&mdash;not unsupported certifications.
              India-hosted backend, role-based access, audit logs, consent on
              every WhatsApp send, and full data export.
            </p>
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
          </motion.article>
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
