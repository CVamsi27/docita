"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import { cn } from "@workspace/ui/lib/utils";

import { landingSpringTransition } from "@/lib/motion-prefs";

const fragmented = [
  "Registers, WhatsApp personal numbers, and Excel sheets each own part of the day.",
  "Same patient details retyped across tools; billing disconnected from the visit.",
  "Follow-ups depend on whoever remembers to send the message.",
];

const docitaRhythm = [
  "One queue and record layer from check-in through billing.",
  "Prescriptions and invoices stay tied to the same visit.",
  "WhatsApp sends from clinic workflows with consent-aware defaults.",
];

export function WorkflowCompareSection() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"today" | "docita">("today");

  return (
    <section
      className="landing-compare-strip landing-section landing-section-compact scroll-mt-24 border-y border-border/50 bg-background"
      aria-labelledby="workflow-compare-heading"
    >
      <div className="ui-page-shell max-w-4xl">
        <h2
          id="workflow-compare-heading"
          className="text-center font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:text-[11px]"
        >
          Control surface
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-balance text-center text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          Registers plus WhatsApp plus Excel versus one OPD rhythm
        </p>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-center text-sm text-muted-foreground">
          Text-only comparison—no patient screenshots, no fabricated logos.
        </p>

        <div
          role="tablist"
          aria-label="Workflow comparison"
          className="mt-10 flex justify-center gap-2"
        >
          {(
            [
              ["today", "Typical stack today"],
              ["docita", "With Docita"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cn(
                "rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                tab === id
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border/80 bg-muted/40 text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative mt-8 min-h-[200px] overflow-hidden rounded-2xl border border-border/70 bg-muted/20 p-6 sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={reduce === true ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce === true ? undefined : { opacity: 0, y: -8 }}
              transition={landingSpringTransition(reduce === true)}
              className="space-y-4"
            >
              <p className="font-mono text-xs font-semibold uppercase tracking-wide text-primary">
                {tab === "today" ? "Fragmented tools" : "Single layer"}
              </p>
              <ul className="space-y-3 text-pretty text-sm leading-relaxed text-foreground sm:text-base">
                {(tab === "today" ? fragmented : docitaRhythm).map((line) => (
                  <li key={line} className="flex gap-3">
                    <span
                      className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
