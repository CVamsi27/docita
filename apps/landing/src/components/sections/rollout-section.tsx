"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";

import { Button } from "@workspace/ui/components/button";

import {
  landingFadeUpVariants,
  landingInViewViewport,
  landingStaggerContainer,
} from "@/lib/motion-prefs";

interface Milestone {
  marker: string;
  title: string;
  detail: string;
  artifacts: string[];
}

const MILESTONES: Milestone[] = [
  {
    marker: "Day 0 · Discovery",
    title: "Walk the current workflow",
    detail:
      "We map how the clinic actually runs today: registers, Excel sheets, prescription PDFs, and WhatsApp habits. Nothing is asked to change yet.",
    artifacts: [
      "Workflow walkthrough call",
      "Records sample (CSV / scans)",
      "Decision: tier and setup scope",
    ],
  },
  {
    marker: "Day 2 · First workflow live",
    title: "Queue + records + prescriptions",
    detail:
      "We import the patient list, set up the doctor templates, and the clinic runs its first OPD day on Docita. Old register stays as a safety net for the first week.",
    artifacts: [
      "Patient list imported (CSV review)",
      "Prescription template configured",
      "Reception + 1 doctor trained",
    ],
  },
  {
    marker: "Week 1 · Billing + WhatsApp",
    title: "Close the loop on every visit",
    detail:
      "Invoices stay tied to the visit, receipts go out on UPI, and follow-ups send from the same workflow. Audit trails light up.",
    artifacts: [
      "Billing templates and tax setup",
      "WhatsApp templates + consent posture",
      "Daily collections report wired",
    ],
  },
  {
    marker: "Week 2 · Hand-off",
    title: "Clinic runs Docita unaided",
    detail:
      "Reception, doctors, and admin each have their own day-to-day flow. Office hours support stays available, but the clinic owns the rhythm.",
    artifacts: [
      "Role-based access reviewed",
      "Backup + export configured",
      "30-day check-in scheduled",
    ],
  },
];

export function RolloutSection() {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const stagger = landingStaggerContainer(reduce ?? false, 0.06, 0.04);

  return (
    <section
      id="rollout"
      className="r2-section r2-band-tint"
      aria-labelledby="r2-rollout-heading"
    >
      <div className="ui-page-shell">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <div className="flex items-center gap-3 r2-section-marker">
              <span aria-hidden>R2 / 06</span>
              <span aria-hidden className="h-px w-10 bg-current opacity-40" />
              <span className="r2-eyebrow">Rollout</span>
            </div>
            <h2
              id="r2-rollout-heading"
              className="mt-4 r2-display-sm text-foreground"
            >
              From paper to live in <em>two weeks</em>&mdash;not two quarters.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">
              We lead with migration and usability, not a six-month
              implementation. The first OPD day on Docita is targeted within 48
              hours of the discovery call.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild className="gap-2">
                <a href="/paper-to-cloud">
                  Read the rollout playbook
                  <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="/contact">Talk about migration</a>
              </Button>
            </div>
          </div>

          <motion.ol
            className="r2-rollout-rail"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={landingInViewViewport}
            role="list"
          >
            {MILESTONES.map((m) => (
              <motion.li
                key={m.marker}
                className="r2-rollout-step"
                variants={item}
              >
                <p className="r2-rollout-step-marker">{m.marker}</p>
                <h3 className="mt-2 text-xl font-semibold text-foreground">
                  {m.title}
                </h3>
                <p className="mt-2 max-w-xl text-base leading-relaxed text-muted-foreground">
                  {m.detail}
                </p>
                <ul className="mt-4 grid gap-2 text-sm text-foreground sm:grid-cols-3">
                  {m.artifacts.map((a) => (
                    <li
                      key={a}
                      className="rounded-lg border border-border/60 bg-muted px-3 py-2 r2-mono text-xs leading-snug"
                    >
                      {a}
                    </li>
                  ))}
                </ul>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
