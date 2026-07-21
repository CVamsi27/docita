"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  Building2,
  type LucideIcon,
  Sparkles,
  Stethoscope,
  Users,
} from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

import {
  landingFadeUpVariants,
  landingInViewViewport,
} from "@/lib/motion-prefs";
import { FALLBACK_PRICING_CONFIG } from "@/lib/landing-data";
import { PLAN_MODE_INFO, planModeSchema, type TierName, tierSchema } from "@workspace/types";

type PracticeShape = "solo" | "small" | "multi" | "hospital";
type WorkType = "front_desk" | "opd" | "full_clinical";

interface QuestionOption<V extends string> {
  id: V;
  label: string;
  hint: string;
  icon: LucideIcon;
}

type PracticeOption = QuestionOption<PracticeShape>;
type WorkOption = QuestionOption<WorkType>;

const PRACTICE_OPTIONS: PracticeOption[] = [
  {
    id: "solo",
    label: "Just me",
    hint: "Single doctor, 1\u20133 staff",
    icon: Stethoscope,
  },
  {
    id: "small",
    label: "Small clinic",
    hint: "2\u20135 doctors, shared reception",
    icon: Users,
  },
  {
    id: "multi",
    label: "Multi-doctor",
    hint: "6\u201325 doctors, multi-specialty",
    icon: Users,
  },
  {
    id: "hospital",
    label: "Hospital / chain",
    hint: "Multi-branch, dedicated ops team",
    icon: Building2,
  },
];

const WORK_OPTIONS: WorkOption[] = [
  {
    id: "front_desk",
    label: "Reception & billing only",
    hint: "Front-desk-only mode",
    icon: Users,
  },
  {
    id: "opd",
    label: "OPD + prescribing",
    hint: "Standard clinical workflow",
    icon: Stethoscope,
  },
  {
    id: "full_clinical",
    label: "Full clinical + AI + lab",
    hint: "Everything in the platform",
    icon: Sparkles,
  },
];

const RECOMMENDATIONS: Record<string, {
  tier: string;
  mode: string;
  billing: string;
  rationale: string;
}> = {
  "solo:front_desk": {
    tier: "STARTER",
    mode: "FRONT_DESK",
    billing: "monthly",
    rationale:
      "Front desk mode covers scheduling and billing without the full clinical surface.",
  },
  "small:front_desk": {
    tier: "PROFESSIONAL",
    mode: "FRONT_DESK",
    billing: "monthly",
    rationale:
      "Multi-desk reception on a small-clinic tier. Switch to full clinical any time from Settings.",
  },
  "multi:front_desk": {
    tier: "HOSPITAL",
    mode: "FRONT_DESK",
    billing: "yearly",
    rationale:
      "Hospital-scale reception with multi-OPD routing and shift handover.",
  },
  "solo:opd": {
    tier: "ESSENTIAL",
    mode: "FULL",
    billing: "monthly",
    rationale:
      "Solo OPD with prescribing, lab, and inventory. The most common Docita setup.",
  },
  "small:opd": {
    tier: "PROFESSIONAL",
    mode: "FULL",
    billing: "monthly",
    rationale:
      "Multi-doctor OPD with shared queue, per-doctor daybook, and broadcast campaigns.",
  },
  "multi:opd": {
    tier: "PROFESSIONAL",
    mode: "FULL",
    billing: "yearly",
    rationale:
      "Multi-doctor full clinical with priority support. Annual saves two months.",
  },
  "hospital:opd": {
    tier: "HOSPITAL",
    mode: "FULL",
    billing: "yearly",
    rationale:
      "Hospital plan with pooled WhatsApp, multi-branch analytics, and a CSM.",
  },
  "solo:full_clinical": {
    tier: "PROFESSIONAL",
    mode: "FULL",
    billing: "monthly",
    rationale:
      "Full clinical surface from day one; you can drop down to Essential at any time.",
  },
  "small:full_clinical": {
    tier: "PROFESSIONAL",
    mode: "FULL",
    billing: "monthly",
    rationale:
      "Multi-doctor full clinical with priority support and broadcast campaigns.",
  },
  "multi:full_clinical": {
    tier: "HOSPITAL",
    mode: "FULL",
    billing: "yearly",
    rationale:
      "Hospital plan with everything in Professional plus multi-branch and pooled WhatsApp.",
  },
  "hospital:full_clinical": {
    tier: "ENTERPRISE",
    mode: "FULL",
    billing: "yearly",
    rationale:
      "Custom contract, dedicated AM, custom SLA. We will scope this with you.",
  },
};

interface PlanPickerProps {
  appUrl: string;
}

interface OptionFieldsetProps<V extends string> {
  legend: string;
  options: QuestionOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
}

function OptionFieldset<V extends string>({
  legend,
  options,
  value,
  onChange,
}: OptionFieldsetProps<V>) {
  return (
    <fieldset className="r2-plan-picker-fieldset">
      <legend className="r2-plan-picker-legend">{legend}</legend>
      <div className="r2-plan-picker-options">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn("r2-plan-picker-option", active && "is-active")}
              aria-pressed={active}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span className="font-medium">{opt.label}</span>
              <span className="r2-plan-picker-hint">{opt.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function formatPlanPickerHeadline(tier: string, mode: string, billing: string): string {
  const parsedTier = tierSchema.safeParse(tier);
  const tierName: TierName | null = parsedTier.success ? parsedTier.data : null;
  const tierLabel = tierName
    ? FALLBACK_PRICING_CONFIG.tiers.find((t) => t.id === tierName)?.name ?? tier
    : tier;
  const parsedMode = planModeSchema.safeParse(mode);
  const modeLabel = parsedMode.success ? PLAN_MODE_INFO[parsedMode.data].name : mode;
  const billingLabel = billing === "yearly" ? "Yearly" : "Monthly";
  return `${tierLabel} · ${modeLabel} · ${billingLabel}`;
}

export function PlanPicker({ appUrl }: PlanPickerProps) {
  const reduce = useReducedMotion();
  const item = landingFadeUpVariants(reduce ?? false);
  const [practice, setPractice] = useState<PracticeShape | null>(null);
  const [work, setWork] = useState<WorkType | null>(null);

  const recommendation = useMemo(() => {
    if (!practice || !work) return null;
    return RECOMMENDATIONS[`${practice}:${work}`] ?? null;
  }, [practice, work]);

  const reset = () => {
    setPractice(null);
    setWork(null);
  };

  return (
    <motion.div
      variants={item}
      initial="hidden"
      whileInView="visible"
      viewport={landingInViewViewport}
      className="r2-plan-picker"
    >
      <div className="r2-plan-picker-head">
        <p className="r2-eyebrow r2-eyebrow-accent">Plan picker</p>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
          Which plan actually fits?
        </h3>
        <p className="mt-1.5 max-w-md text-sm leading-relaxed text-muted-foreground">
          Two questions, one recommendation. You can change tier or mode at any
          time from Settings.
        </p>
      </div>

      <div className="r2-plan-picker-grid">
        <OptionFieldset<PracticeShape>
          legend="Practice size"
          options={PRACTICE_OPTIONS}
          value={practice}
          onChange={setPractice}
        />
        <OptionFieldset<WorkType>
          legend="Type of work"
          options={WORK_OPTIONS}
          value={work}
          onChange={setWork}
        />
      </div>

      {recommendation ? (
        <div className="r2-plan-picker-result" role="status" aria-live="polite">
          <p className="r2-eyebrow">Suggested plan</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            {formatPlanPickerHeadline(recommendation.tier, recommendation.mode, recommendation.billing)}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {recommendation.rationale}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              asChild
              size="sm"
              className="gap-2"
            >
              <a
                href={`${appUrl}/onboarding?tier=${recommendation.tier}&mode=${recommendation.mode}&billing=${recommendation.billing}`}
              >
                Start with this plan
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
            >
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <p className="r2-plan-picker-empty">
          Pick a size and a work type to see a recommended plan.
        </p>
      )}
    </motion.div>
  );
}
