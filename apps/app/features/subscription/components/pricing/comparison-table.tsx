"use client";

import { useMemo, useState } from "react";
import { Check, Info, Minus } from "lucide-react";
import {
  FEATURE_TIER_MAP,
  getTierInfo,
  Tier,
  getFeatureComparisonData,
  type FeatureComparisonRow,
} from "@/lib/tier-config";
import { getFeatureDetails } from "@/features/subscription/config/feature-config";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import { Badge } from "@workspace/ui/components/badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  SymbolTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";
import { Feature } from "@workspace/types";

interface ComparisonTableProps {
  currentTier: number;
  keyFeaturesOnly?: boolean;
}

type AvailableFeatureItem =
  | { kind: "header"; label: string }
  | {
      kind: "feature";
      feature: Feature;
      label: string;
      requiredTier: Tier;
    };

const FEATURE_CATEGORIES: { label: string; features: Feature[] }[] = [
  {
    label: "Patient Records",
    features: [
      Feature.BASIC_PATIENT_MANAGEMENT,
      Feature.PATIENT_DEDUPLICATION,
      Feature.PAPER_SCANNING,
      Feature.EXCEL_IMPORT,
      Feature.EXPORT_CSV,
      Feature.DOCUMENT_ARCHIVAL,
      Feature.VISIT_HISTORY,
    ],
  },
  {
    label: "Clinical Workflows",
    features: [
      Feature.DIGITAL_PRESCRIPTIONS,
      Feature.MEDICINES_LIST,
      Feature.MEDICAL_CODING,
      Feature.PRESCRIPTION_TEMPLATES,
      Feature.DIGITAL_INTAKE_FORMS,
      Feature.FULL_EHR,
      Feature.LAB_TESTS,
      Feature.CONSENT_MANAGEMENT,
      Feature.DOCTOR_SIGNATURE,
    ],
  },
  {
    label: "Scheduling & Queues",
    features: [
      Feature.CALENDAR_SLOTS,
      Feature.AUTO_REMINDERS,
      Feature.QUEUE_MANAGEMENT,
    ],
  },
  {
    label: "Scanning",
    features: [Feature.OCR_BASIC, Feature.OCR_ADVANCED],
  },
  {
    label: "Billing & Payments",
    features: [
      Feature.INVOICING,
      Feature.PAYMENT_LINKS,
      Feature.INSURANCE_BILLING,
    ],
  },
  {
    label: "Communication",
    features: [
      Feature.WHATSAPP_MESSAGING,
      Feature.BROADCAST_CAMPAIGNS,
    ],
  },
  {
    label: "Team & Access Control",
    features: [
      Feature.MULTI_DEVICE,
      Feature.ROLE_MANAGEMENT,
      Feature.AUDIT_LOGS,
      Feature.SSO,
    ],
  },
  {
    label: "Analytics",
    features: [
      Feature.BASIC_ANALYTICS,
      Feature.ADVANCED_ANALYTICS,
      Feature.MULTI_LOCATION_ANALYTICS,
    ],
  },
  {
    label: "Scale & Integrations",
    features: [
      Feature.MULTI_DOCTOR,
      Feature.MULTI_CLINIC,
      Feature.INVENTORY,
      Feature.API_ACCESS,
      Feature.CUSTOM_BRANDING,
      Feature.DATA_WAREHOUSE_EXPORT,
      Feature.BULK_IMPORT_SUITE,
    ],
  },
    {
      label: "AI Features",
      features: [
        Feature.AI_PRESCRIPTION_ASSISTANT,
        Feature.AI_DIAGNOSIS_HINTS,
      Feature.SMART_TASK_ENGINE,
      Feature.PREDICTIVE_NO_SHOW,
      Feature.PATIENT_SEGMENTATION,
      Feature.ANOMALY_DETECTION,
    ],
  },
];

const KEY_FEATURE_CATEGORIES = FEATURE_CATEGORIES.slice(0, 4);

const LIMIT_ROW_DESCRIPTIONS: Record<string, string> = {
  "Patient Limit":
    "Maximum number of unique patient profiles you can actively manage in the plan",
  Doctors:
    "Maximum number of doctor accounts that can practice under this facility plan",
  Storage:
    "Total cloud storage included for files like scanned records, prescriptions, and reports",
  Branches:
    "Number of facility locations/branches you can operate under one subscription",
  Consultations:
    "Number of consultations included in the billing cycle before overage charges apply",
  Prescriptions:
    "Number of digital prescriptions included in the billing cycle",
  Invoices:
    "Number of invoices you can generate in the billing cycle",
  "WhatsApp messages (incl. / mo)":
    "WhatsApp messages included per calendar month before per-message overage applies (Essential and above)",
};

export function ComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: ComparisonTableProps) {
  // Sort by the published upgrade ladder, NOT the raw enum values. The
  // numeric Tier enum is for cumulative feature-access comparisons; UI
  // should always render columns in the order customers see in marketing.
  const PUBLISHED_LADDER: Tier[] = [
    Tier.STARTER,
    Tier.FRONT_DESK,
    Tier.ESSENTIAL,
    Tier.PROFESSIONAL,
    Tier.HOSPITAL,
    Tier.ENTERPRISE,
  ];
  const tiers = PUBLISHED_LADDER;

  const limitRows = useMemo(
    () =>
      getFeatureComparisonData().filter(
        (r: FeatureComparisonRow) => r.category === "limit",
      ),
    [],
  );
  const categories = keyFeaturesOnly
    ? KEY_FEATURE_CATEGORIES
    : FEATURE_CATEGORIES;

  const [mobileTier, setMobileTier] = useState<number>(() => {
    return tiers.includes(currentTier) ? currentTier : (tiers[0] ?? Tier.STARTER);
  });

  /**
   * On mobile we compare two tiers side-by-side: the user's current tier on
   * the left, and a target tier on the right that they pick. Single-tier
   * view is useless because the whole point is comparison.
   */
  const validCurrentTier = tiers.includes(currentTier)
    ? currentTier
    : (tiers[0] ?? Tier.STARTER);
  const compareWithTier: Tier =
    mobileTier !== validCurrentTier
      ? (mobileTier as Tier)
      : ((tiers.find((t) => t !== validCurrentTier) ?? validCurrentTier) as Tier);

  const availableFeatures = useMemo(() => {
    return categories.flatMap<AvailableFeatureItem>((category) => {
      const validFeatures = category.features.filter(
        (f) => f in FEATURE_TIER_MAP && getFeatureDetails(f).isGenerallyAvailable,
      );
      if (validFeatures.length === 0) return [];

      const header: AvailableFeatureItem = {
        kind: "header",
        label: category.label,
      };

      const features: AvailableFeatureItem[] = validFeatures.map((feature) => ({
        kind: "feature",
        feature,
        label: getFeatureDetails(feature).name,
        requiredTier: FEATURE_TIER_MAP[feature],
      }));

      return [header, ...features];
    });
  }, [categories]);

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
      <div className="p-6 border-b">
        <h2 className="ui-section-title text-center text-[var(--fs-2xl)]">
          Compare Plans
        </h2>
        <p className="ui-page-subtitle mt-2 text-center">
          Find the perfect fit for your facility&apos;s needs
        </p>
      </div>
      <div className="block md:hidden p-4 space-y-4">
        {/* Tier picker — shows which tier we're comparing against the current */}
        <div className="space-y-2">
          <p className="text-[var(--fs-2xs)] font-semibold uppercase tracking-wide text-muted-foreground">
            Compare {getTierInfo(validCurrentTier).name} with
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tiers
              .filter((tier) => tier !== validCurrentTier)
              .map((tier) => {
                const info = getTierInfo(tier);
                const isActive = compareWithTier === tier;
                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setMobileTier(tier)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:bg-muted/50",
                    )}
                  >
                    {info.name}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Side-by-side header */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-wide">
          <span className="text-muted-foreground">Feature</span>
          <span className="text-right text-foreground">
            {getTierInfo(validCurrentTier).name}
          </span>
          <span className="text-right text-primary">
            {getTierInfo(compareWithTier).name}
          </span>
        </div>

        <div className="rounded-lg border bg-background/50">
          <div className="border-b px-3 py-2">
            <p className="text-[var(--fs-xs)] font-semibold text-foreground">
              Plan limits
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {limitRows.map((row) => (
              <div
                key={row.name}
                className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 px-3 py-2.5"
              >
                <p className="min-w-0 break-words text-[var(--fs-xs)] text-muted-foreground">
                  {row.name}
                </p>
                <p className="text-right text-[var(--fs-sm)] font-medium tabular-nums text-foreground">
                  {String(row.values[validCurrentTier as Tier])}
                </p>
                <p className="text-right text-[var(--fs-sm)] font-semibold tabular-nums text-primary">
                  {String(row.values[compareWithTier as Tier])}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background/50">
          <div className="border-b px-3 py-2">
            <p className="text-[var(--fs-xs)] font-semibold text-foreground">
              Features
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {availableFeatures.map((item, index) => {
              if (item.kind === "header") {
                return (
                  <p
                    key={`${item.label}-${index}`}
                    className="bg-muted/30 px-3 py-1.5 text-[var(--fs-2xs)] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {item.label}
                  </p>
                );
              }

              const inCurrent = validCurrentTier >= item.requiredTier;
              const inCompare = compareWithTier >= item.requiredTier;
              return (
                <div
                  key={item.feature}
                  className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-baseline gap-3 px-3 py-2"
                >
                  <p className="min-w-0 break-words text-[var(--fs-xs)] text-foreground">
                    {item.label}
                  </p>
                  <div className="flex justify-end">
                    {inCurrent ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex justify-end">
                    {inCompare ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="hidden overflow-x-auto md:block">
        <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-10 w-[200px] min-w-[180px] border-r bg-card lg:w-[240px]">
                  <span className="sr-only">Features</span>
                </TableHead>
                {tiers.map((tier) => {
                  const info = getTierInfo(tier);
                  const isCurrent = currentTier === tier;
                  return (
                    <TableHead
                      key={tier}
                      className={cn(
                        "min-w-[120px] px-3 py-4 align-top text-center",
                        isCurrent && "bg-primary/5",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="text-sm font-bold tracking-tight">
                          {info.name}
                        </span>
                        {isCurrent ? (
                          <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                            Current
                          </Badge>
                        ) : null}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              <SectionHeader label="Plan Limits" colSpan={tiers.length + 1} />
              {limitRows.map((row: FeatureComparisonRow) => (
                <TableRow key={row.name} className="hover:bg-muted/50">
                  <TableCell className="sticky left-0 z-10 w-[200px] min-w-[180px] border-r bg-card py-2.5 text-sm font-medium transition-colors hover:bg-muted/50 lg:w-[240px]">
                    <div className="flex items-center gap-2">
                      <SymbolTooltip
                        label={row.name}
                        side="top"
                        contentClassName="max-w-[280px]"
                      >
                        <span className="text-sm truncate">{row.name}</span>
                      </SymbolTooltip>
                      {LIMIT_ROW_DESCRIPTIONS[row.name] && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info
                              className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0"
                              aria-label="About this limit"
                            />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px]" side="right">
                            <p className="text-xs">
                              {LIMIT_ROW_DESCRIPTIONS[row.name]}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  {tiers.map((tier) => (
                    <TableCell
                      key={tier}
                      className={cn(
                        "text-center align-middle border-l py-2.5",
                        currentTier === tier && "bg-primary/5",
                      )}
                    >
                      <span className="text-sm font-medium">
                        {String(row.values[tier as Tier])}
                      </span>
                    </TableCell>
                  ))}
                </TableRow>
              ))}

              {categories.map((category) => {
                const validFeatures = category.features.filter(
                  (f) =>
                    f in FEATURE_TIER_MAP && getFeatureDetails(f).isGenerallyAvailable,
                );
                if (validFeatures.length === 0) return null;
                return (
                  <FeatureCategoryRows
                    key={category.label}
                    label={category.label}
                    features={validFeatures}
                    tiers={tiers}
                    currentTier={currentTier}
                  />
                );
              })}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}

function SectionHeader({
  label,
  colSpan,
}: {
  label: string;
  colSpan: number;
}) {
  return (
    <TableRow className="bg-muted/40 hover:bg-muted/40">
      <TableCell
        colSpan={colSpan}
        className="py-1.5 px-4 sticky left-0 border-r"
      >
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      </TableCell>
    </TableRow>
  );
}

function FeatureCategoryRows({
  label,
  features,
  tiers,
  currentTier,
}: {
  label: string;
  features: Feature[];
  tiers: number[];
  currentTier: number;
}) {
  return (
    <>
      <SectionHeader label={label} colSpan={tiers.length + 1} />
      {features.map((feature) => {
        const requiredTier = FEATURE_TIER_MAP[feature];
        const details = getFeatureDetails(feature);
        return (
          <TableRow key={feature} className="hover:bg-muted/50">
            <TableCell className="sticky left-0 z-10 bg-card border-r w-[260px] min-w-[200px] hover:bg-muted/50 transition-colors py-2.5">
              <div className="flex items-center gap-2">
                <SymbolTooltip
                  label={details.name}
                  side="top"
                  contentClassName="max-w-[280px]"
                >
                  <span className="text-sm truncate">{details.name}</span>
                </SymbolTooltip>
                {!details.isGenerallyAvailable && (
                  <Badge variant="secondary" className="text-[var(--fs-2xs)] px-1.5 py-0">
                    Planned
                  </Badge>
                )}
                {details.description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info
                        className="h-3.5 w-3.5 text-muted-foreground cursor-pointer shrink-0"
                        aria-label="About this feature"
                      />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[280px]" side="right">
                      <p className="text-xs">{details.description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TableCell>
            {tiers.map((tier) => {
              const hasAccess =
                details.isGenerallyAvailable && tier >= requiredTier;
              return (
                <TableCell
                  key={tier}
                  className={cn(
                    "text-center align-middle border-l py-2.5",
                    currentTier === tier && "bg-primary/5",
                  )}
                >
                  {hasAccess ? (
                    <Check className="h-4 w-4 text-success mx-auto" />
                  ) : !details.isGenerallyAvailable ? (
                    <Badge
                      variant="outline"
                      className="text-[var(--fs-2xs)] px-1.5 py-0 text-muted-foreground"
                    >
                      Planned
                    </Badge>
                  ) : (
                    <Minus className="h-3.5 w-3.5 text-muted-foreground/20 mx-auto" />
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        );
      })}
    </>
  );
}
