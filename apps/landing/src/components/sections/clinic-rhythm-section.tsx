"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CheckCircle2, ClipboardList, FileText, type LucideIcon, MessageSquare, Receipt, Stethoscope } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";

interface RhythmStep {
  time: string;
  title: string;
  detail: string;
  icon: LucideIcon;
  badge: string;
}

const STEPS: RhythmStep[] = [
  {
    time: "09:00",
    title: "Walk-in checks in",
    detail:
      "Reception drops the patient on the live patient queue with a token. No duplicate register.",
    icon: ClipboardList,
    badge: "Queue & Triage",
  },
  {
    time: "10:30",
    title: "Doctor opens the chart",
    detail:
      "Last visit, vitals, prescriptions, uploads—on one timeline tied to this token.",
    icon: Stethoscope,
    badge: "Clinical Timeline",
  },
  {
    time: "11:00",
    title: "Prescription drafted",
    detail:
      "Templates, allergy flags, doses snap into a clean PDF the patient can save or receive.",
    icon: FileText,
    badge: "Smart Rx Builder",
  },
  {
    time: "11:05",
    title: "Billing closes the visit",
    detail:
      "Invoice picks up the same procedures. Receipt generated, UPI-ready, audit-logged.",
    icon: Receipt,
    badge: "Visit Billing",
  },
  {
    time: "11:10",
    title: "WhatsApp follow-up sent",
    detail:
      "Receipt, prescription, and the next-visit reminder go out from the same workflow.",
    icon: MessageSquare,
    badge: "Patient Dispatch",
  },
];

const STEP_DURATION_MS = 4800;

export function ClinicRhythmSection() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number>(reduce ? 2 : 0);
  const [paused, setPaused] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    if (reduce === true || paused) {
      return;
    }
    const id = window.setInterval(() => {
      indexRef.current = (indexRef.current + 1) % STEPS.length;
      setActive(indexRef.current);
    }, STEP_DURATION_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const handleSelect = (i: number) => {
    indexRef.current = i;
    setActive(i);
  };

  return (
    <section
      className="r2-section r2-section-lead r2-rhythm"
      aria-labelledby="r2-rhythm-heading"
      id="rhythm"
    >
      <div className="ui-page-shell">
        <div className="flex items-center gap-3">
          <span className="r2-eyebrow">A practice day, in rhythm</span>
        </div>

        <h2
          id="r2-rhythm-heading"
          className="mt-4 max-w-3xl r2-display-md text-foreground"
        >
          Watch <em>one visit</em> flow from front desk to follow-up
          &mdash;without a single re-typed field.
        </h2>
        <p className="mt-4 max-w-xl text-base text-muted-foreground">
          The same token carries through queue, EMR, prescription, billing, and
          WhatsApp&mdash;tap any step to preview, or let it play.
        </p>
      </div>

      <div
        className="ui-page-shell mt-10"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        <div className="sr-only" aria-live="polite">
          {`Showing step ${active + 1} of ${STEPS.length}: ${STEPS[active].title}. ${STEPS[active].detail}`}
        </div>

        <div className="r2-rhythm-grid">
          <ol
            className="r2-rhythm-list"
            role="list"
            aria-label="Practice day timeline"
          >
            {STEPS.map((step, i) => {
              const isActive = i === active;
              const StepIcon = step.icon;
              return (
                <li
                  key={step.time}
                  className="r2-rhythm-step"
                  data-active={isActive ? "true" : "false"}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(i)}
                    aria-current={isActive ? "step" : undefined}
                    aria-label={`Show step ${i + 1}: ${step.title}`}
                    className={cn(
                      "r2-rhythm-step-button text-left transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      isActive && "border-primary/30 bg-primary/[0.04] shadow-xs",
                    )}
                  >
                    <span className="r2-rhythm-step-rail" aria-hidden>
                      <span className="r2-rhythm-step-dot" />
                    </span>
                    <span className="r2-rhythm-step-body min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="r2-rhythm-step-time">{step.time}</span>
                        <span
                          className={cn(
                            "rounded-md border px-1.5 py-0.5 text-[var(--fs-2xs)] font-medium transition-colors duration-150",
                            isActive
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border/60 bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {step.badge}
                        </span>
                      </div>
                      <span className="r2-rhythm-step-title flex items-center gap-2">
                        <StepIcon
                          className={cn(
                            "h-4 w-4 shrink-0 transition-colors duration-150",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                          aria-hidden
                        />
                        <span className="truncate">{step.title}</span>
                      </span>
                      <span className="r2-rhythm-step-detail">
                        {step.detail}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          <RhythmStage active={active} />
        </div>
      </div>
    </section>
  );
}

function RhythmStage({ active }: { active: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="r2-rhythm-stage"
      data-active={active}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-15%" }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, ease: "easeOut" }}
    >
      <div className="r2-rhythm-frame" data-frame="0">
        <RhythmCard
          stepIndex={0}
          totalSteps={STEPS.length}
          chrome="PATIENT QUEUE · 09:00"
          rows={[
            ["07", "R. Iyer", "Follow-up", "in"],
            ["08", "K. Patel", "New patient", "waiting"],
            ["09", "P. Rao", "Walk-in", "waiting"],
            ["10", "S. Khan", "Imaging review", "waiting"],
          ]}
          footer="One queue · reception + doctors share status · no register duplication."
          icon={ClipboardList}
        />
      </div>

      <div className="r2-rhythm-frame" data-frame="1">
        <RhythmCard
          stepIndex={1}
          totalSteps={STEPS.length}
          chrome="PATIENT TIMELINE · TOKEN 07"
          rows={[
            ["12 Apr", "HbA1c 7.2 · BP 138/86", "Visit", "done"],
            ["28 Mar", "Lipid panel uploaded", "Doc", "done"],
            ["02 Mar", "Metformin 500mg started", "Rx", "done"],
            ["Today", "Active consult opened", "Now", "in"],
          ]}
          footer="Same record across visits. Doctor sees the full thread, not a fresh page."
          icon={Stethoscope}
        />
      </div>

      <div className="r2-rhythm-frame" data-frame="2">
        <RhythmCard
          stepIndex={2}
          totalSteps={STEPS.length}
          chrome="PRESCRIPTION · DRAFT"
          rows={[
            ["Rx", "Metformin 500mg", "1-0-1 · 30 d", "in"],
            ["Rx", "Telmisartan 40mg", "1-0-0 · 30 d", "in"],
            ["Lab", "HbA1c", "Repeat 6 wk", "waiting"],
            ["Note", "Diet · low GI", "Patient copy", "done"],
          ]}
          footer="Templates, doses, allergy flags. Clean PDF, ready to share."
          icon={FileText}
        />
      </div>

      <div className="r2-rhythm-frame" data-frame="3">
        <RhythmCard
          stepIndex={3}
          totalSteps={STEPS.length}
          chrome="INVOICE · TOKEN 07"
          rows={[
            ["I-1042", "Consultation", "₹500", "in"],
            ["I-1042", "Procedure · INJ", "₹250", "in"],
            ["I-1042", "Discount", "−₹50", "in"],
            ["TOT", "Total payable", "₹700", "done"],
          ]}
          footer="Ties to the same visit. UPI-ready receipt, audit-logged action."
          icon={Receipt}
        />
      </div>

      <div className="r2-rhythm-frame" data-frame="4">
        <RhythmCard
          stepIndex={4}
          totalSteps={STEPS.length}
          chrome="WHATSAPP · OUTBOUND"
          rows={[
            ["RX", "Prescription PDF", "Sent", "done"],
            ["RC", "Payment receipt", "Sent", "done"],
            ["FU", "Follow-up · 6 wk", "Scheduled", "waiting"],
            ["CN", "Consent on file", "Yes", "done"],
          ]}
          footer="One workflow. Consent-aware. Shows up where the patient already reads."
          icon={MessageSquare}
        />
      </div>
    </motion.div>
  );
}

interface RhythmCardProps {
  stepIndex: number;
  totalSteps: number;
  chrome: string;
  rows: Array<readonly [string, string, string, "in" | "waiting" | "done"]>;
  footer: string;
  icon: LucideIcon;
}
function RhythmCard({
  stepIndex,
  totalSteps,
  chrome,
  rows,
  footer,
  icon: Icon,
}: RhythmCardProps) {
  return (
    <div className="r2-product">
      <div className="r2-product-chrome">
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="r2-product-chrome-dot" aria-hidden />
        <span className="ml-2 font-mono text-xs">{chrome}</span>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[var(--fs-2xs)] font-medium text-primary">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden />
            <span>Live</span>
          </span>
        </span>
      </div>
      <div className="r2-product-stage" style={{ minHeight: "auto" }}>
        <div className="flex flex-col gap-2 p-1">
          <div className="flex items-center justify-between pb-1">
            <span className="r2-eyebrow">OPD Surface</span>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-background/80 px-2 py-1 text-xs text-muted-foreground shadow-2xs">
              <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
              <span className="font-medium text-foreground">Interactive Preview</span>
            </div>
          </div>
          {rows.map((row, i) => (
            <div
              key={`${row[0]}-${i}`}
              className={cn(
                i === 0 ? "r2-row r2-row-active" : "r2-row",
                "transition-colors duration-150",
              )}
            >
              <span className="r2-token font-mono">{row[0]}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {row[1]}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {row[2]}
                </p>
              </div>
              <span
                className={cn(
                  row[3] === "done"
                    ? "r2-status-pill r2-status-pill--done"
                    : row[3] === "in"
                      ? "r2-status-pill r2-status-pill--in"
                      : "r2-status-pill r2-status-pill--waiting",
                  "flex items-center gap-1",
                )}
              >
                {row[3] === "done" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : null}
                {row[3] === "done"
                  ? "Done"
                  : row[3] === "in"
                    ? "Active"
                    : "Queued"}
              </span>
            </div>
          ))}
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {footer}
          </p>
        </div>
      </div>
    </div>
  );
}