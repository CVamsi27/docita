"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, X } from "lucide-react";

import {
  landingFadeUpVariants,
  landingInViewViewport,
} from "@/lib/motion-prefs";

interface CompareRow {
  label: string;
  before: string;
  after: string;
}

const COMPARE_ROWS: CompareRow[] = [
  {
    label: "Patient list",
    before: "Excel + paper register, version confusion",
    after: "One patient record, audit-logged edits",
  },
  {
    label: "Prescription",
    before: "Word template, manual PDF, manual share",
    after: "Template + dose rules, shareable PDF in two clicks",
  },
  {
    label: "WhatsApp messages",
    before: "Personal number, no consent, no audit",
    after: "Clinic sender, consent on file, every send logged",
  },
  {
    label: "Billing",
    before: "Detached from the visit, manual totals",
    after: "Tied to the visit, line items, UPI-ready receipt",
  },
  {
    label: "Follow-up",
    before: "Whoever remembers, on whatever day",
    after: "Scheduled at end of visit, sent from the workflow",
  },
  {
    label: "Day close",
    after: "Daybook, collections, and audit close in one step",
    before: "Reception + doctor reconcile at 9pm",
  },
];

export function ComparisonStripSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);

  return (
    <section
      id="comparison-strip"
      className="r2-section r2-section-tight r2-band-base"
      aria-labelledby="r2-cs-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Side by side</span>
        </div>
        <h2
          id="r2-cs-heading"
          className="mt-4 max-w-3xl r2-display-sm text-foreground"
        >
          Fragmented tools <em>versus</em> one operating layer.
        </h2>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
          A factual comparison, not a smear campaign. Most practices start
          with a mix of these tools&mdash;and pay for it in retyped fields and
          lost follow-ups.
        </p>

        <motion.div
          variants={item}
          initial="hidden"
          whileInView="visible"
          viewport={landingInViewViewport}
          className="mt-10 r2-compare-strip"
          role="table"
          aria-label="Before Docita versus with Docita"
        >
          <div className="r2-compare-cell r2-compare-cell--before order-2 sm:order-1" role="rowheader">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-destructive/25 bg-destructive/10 px-2 py-0.5 text-[var(--fs-2xs)] font-mono font-semibold uppercase tracking-wider text-destructive">
                <X className="h-3 w-3" aria-hidden />
                Before
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-foreground">
              Fragmented tools
            </p>
            {COMPARE_ROWS.map((row) => (
              <div
                key={row.label}
                className="r2-compare-row -mx-1.5 rounded-md px-1.5 transition-colors duration-150 hover:bg-muted/40"
                role="row"
              >
                <p className="r2-compare-row-label" role="rowheader">
                  {row.label}
                </p>
                <p className="r2-compare-row-value" role="cell">
                  {row.before}
                </p>
              </div>
            ))}
          </div>

          <div className="r2-compare-cell r2-compare-cell--after order-1 sm:order-2" role="rowheader">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[var(--fs-2xs)] font-mono font-semibold uppercase tracking-wider text-primary">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                With Docita
              </span>
            </div>
            <p className="mt-1 text-base font-semibold text-foreground">
              Single operating layer
            </p>
            {COMPARE_ROWS.map((row) => (
              <div
                key={row.label}
                className="r2-compare-row -mx-1.5 rounded-md px-1.5 transition-colors duration-150 hover:bg-primary/[0.04]"
                role="row"
              >
                <p className="r2-compare-row-label font-medium text-foreground" role="rowheader">
                  {row.label}
                </p>
                <p className="r2-compare-row-value font-medium text-foreground" role="cell">
                  {row.after}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
