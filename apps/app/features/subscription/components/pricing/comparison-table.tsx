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
    features: [Feature.BROADCAST_CAMPAIGNS],
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
};

export function ComparisonTable({
  currentTier,
  keyFeaturesOnly,
}: ComparisonTableProps) {
  const tiers = Object.values(Tier)
    .filter((t): t is number => typeof t === "number" && t !== Tier.INTELLIGENCE)
    .sort((a, b) => a - b);

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
        <div className="flex flex-wrap items-center justify-center gap-2">
          {tiers.map((tier) => {
            const info = getTierInfo(tier);
            const isActive = mobileTier === tier;
            return (
              <button
                key={tier}
                type="button"
                onClick={() => setMobileTier(tier)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-foreground border-border hover:bg-muted/50",
                )}
              >
                {info.name}
              </button>
            );
          })}
        </div>

        <div className="rounded-lg border bg-background/50">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold text-foreground">Plan Limits</p>
          </div>
          <div className="p-4 space-y-3">
            {limitRows.map((row) => (
              <div key={row.name} className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground min-w-0 break-words">
                  {row.name}
                </p>
                <p className="text-sm font-medium text-foreground text-right">
                  {String(row.values[mobileTier as Tier])}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border bg-background/50">
          <div className="p-4 border-b">
            <p className="text-sm font-semibold text-foreground">Features</p>
          </div>
          <div className="p-4 space-y-2">
            {availableFeatures.map((item, index) => {
              if (item.kind === "header") {
                return (
                  <p
                    key={`${item.label}-${index}`}
                    className="pt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {item.label}
                  </p>
                );
              }

              const hasAccess = mobileTier >= item.requiredTier;
              return (
                <div
                  key={item.feature}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 bg-background/70 px-3 py-2"
                >
                  <p className="text-sm text-foreground min-w-0 break-words">
                    {item.label}
                  </p>
                  <div className="shrink-0 pt-0.5">
                    {hasAccess ? (
                      <Check className="h-4 w-4 text-success" />
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

      <div className="hidden md:block">
        <Table className="text-sm">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[260px] min-w-[200px] sticky left-0 z-10 bg-card border-r">
                  <span className="sr-only">Features</span>
                </TableHead>
                {tiers.map((tier) => {
                  const info = getTierInfo(tier);
                  const isCurrent = currentTier === tier;
                  return (
                    <TableHead
                      key={tier}
                      className={cn(
                        "text-center min-w-[110px] px-3 py-5 align-top",
                        isCurrent && "bg-primary/5",
                      )}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="font-bold text-sm">{info.name}</span>
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
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
                  <TableCell className="sticky left-0 z-10 bg-card border-r w-[260px] min-w-[200px] text-sm font-medium py-2.5 hover:bg-muted/50 transition-colors">
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
