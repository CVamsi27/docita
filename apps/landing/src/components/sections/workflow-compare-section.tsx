"use client";

import { LayoutGroup, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Check, X } from "lucide-react";

import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/form/toggle-group";
import { cn } from "@workspace/ui/lib/utils";

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
const COMPARE_TAB_KEYS: CompareKey[] = ["today", "docita"];

export function WorkflowCompareSection() {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<CompareKey>("docita");

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
              aria-label="Emphasise a workflow"
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
                  {COMPARE_TAB_KEYS.map((id) => (
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
  const isDocita = tone === "docita";
  const Icon = isDocita ? Check : X;

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-5 transition-[opacity,border-color,box-shadow] duration-200 sm:p-6",
        isActive
          ? isDocita
            ? "border-primary/35 shadow-md"
            : "border-foreground/20 shadow-md"
          : "border-border/60 opacity-65",
      )}
    >
      {isDocita ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-2xl bg-gradient-to-r from-primary via-primary/60 to-transparent"
        />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="r2-eyebrow">{data.label}</p>
          <p className="mt-1.5 text-base font-semibold tracking-tight text-foreground">
            {data.eyebrow}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
            isDocita
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-border text-muted-foreground",
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <ul className="mt-5 space-y-3" role="list">
        {data.points.map((line) => (
          <li
            key={line}
            className="flex gap-3 text-sm leading-relaxed text-muted-foreground"
          >
            <Icon
              className={cn(
                "mt-0.5 h-4 w-4 shrink-0",
                isDocita ? "text-primary" : "text-muted-foreground/70",
              )}
              aria-hidden
            />
            <span className={isDocita ? "text-foreground/90" : undefined}>
              {line}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
