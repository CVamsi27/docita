"use client";

import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Check, X } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import { cn } from "@workspace/ui/lib/utils";

import { landingSpringTransition } from "@/lib/motion-prefs";

const COMPARE = {
  today: {
    label: "Typical stack today",
    eyebrow: "Fragmented tools",
    points: [
      "Registers, WhatsApp personal numbers, and Excel sheets each own part of the day.",
      "Patient details retyped between tools; billing disconnected from the visit.",
      "Follow-ups depend on whoever remembers to send the message.",
    ],
  },
  docita: {
    label: "With Docita",
    eyebrow: "Single layer",
    points: [
      "One queue and record layer from check-in through billing.",
      "Prescriptions and invoices stay tied to the same visit.",
      "WhatsApp sends from clinic workflows with consent-aware defaults.",
    ],
  },
} as const;

type CompareKey = keyof typeof COMPARE;

export function WorkflowCompareSection() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<CompareKey>("docita");
  const active = COMPARE[tab];

  return (
    <section
      id="workflow-compare"
      className="r2-section r2-section-tight r2-compare"
      aria-labelledby="r2-compare-heading"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">Control surface</span>
        </div>

        <div className="mt-4 grid items-end gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,auto)] lg:gap-10">
          <h2
            id="r2-compare-heading"
            className="max-w-3xl r2-display-sm text-foreground"
          >
            Registers, WhatsApp, Excel <em>versus</em> one OPD rhythm.
          </h2>

          <LayoutGroup id="r2-compare-toggle">
            <div
              className="w-full max-w-sm justify-self-start lg:justify-self-end"
              role="group"
              aria-label="Workflow comparison"
            >
              <div className="relative rounded-xl border border-border/60 bg-card p-1 shadow-sm">
                {!reduce ? (
                  <motion.div
                    aria-hidden
                    className="absolute top-1 bottom-1 rounded-lg bg-foreground shadow-md"
                    layout
                    layoutId="r2-compare-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                    style={{
                      width: "calc(50% - 4px)",
                      left: tab === "today" ? 4 : "calc(50% + 0px)",
                    }}
                  />
                ) : null}
                <ToggleGroup
                  type="single"
                  value={tab}
                  onValueChange={(next) => {
                    if (next === "today" || next === "docita") {
                      setTab(next);
                    }
                  }}
                  className="relative z-[1] flex w-full gap-0"
                >
                  {(Object.keys(COMPARE) as CompareKey[]).map((id) => (
                    <ToggleGroupItem
                      key={id}
                      value={id}
                      className={cn(
                        "relative z-[1] min-h-11 flex-1 rounded-lg border-0 bg-transparent py-2.5 text-sm shadow-none transition-colors",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        tab === id
                          ? "font-semibold text-background"
                          : "font-medium text-muted-foreground hover:text-foreground/90",
                      )}
                    >
                      {COMPARE[id].label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </LayoutGroup>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <CompareColumn
            tone="today"
            data={COMPARE.today}
            isActive={tab === "today"}
          />
          <CompareColumn
            tone="docita"
            data={COMPARE.docita}
            isActive={tab === "docita"}
          />
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={landingSpringTransition(reduce ?? false)}
            >
              <p className="r2-eyebrow r2-eyebrow-accent">{active.eyebrow}</p>
              <ul className="mt-4 space-y-3 text-base leading-relaxed text-muted-foreground">
                {active.points.map((line) => (
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

interface CompareColumnProps {
  tone: CompareKey;
  data: (typeof COMPARE)[CompareKey];
  isActive: boolean;
}

function CompareColumn({ tone, data, isActive }: CompareColumnProps) {
  const Icon = tone === "today" ? X : Check;
  const accentClass =
    tone === "today" ? "text-muted-foreground" : "text-primary";

  return (
    <div
      className={cn(
        "relative rounded-2xl border bg-card p-5 transition-colors sm:p-6",
        isActive
          ? "border-foreground/20 shadow-md"
          : "border-border/60 opacity-70",
      )}
    >
      <div className="flex items-center justify-between">
        <p className="r2-eyebrow">{data.label}</p>
        <span
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-full border border-current",
            accentClass,
          )}
          aria-hidden
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {data.eyebrow}
      </p>
    </div>
  );
}
