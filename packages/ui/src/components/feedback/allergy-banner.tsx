"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/feedback/alert";
import { Badge } from "@workspace/ui/components/indicators/badge";

export type AllergySeverity = "mild" | "moderate" | "severe";

export interface AllergyEntry {
  allergen: string;
  severity?: AllergySeverity;
  reaction?: string;
}

export interface AllergyBannerProps {
  allergies: ReadonlyArray<string | AllergyEntry>;
  patientName?: string;
  className?: string;
  /**
   * Optional pre-localized title override. When provided, replaces the
   * default English banner heading. Consumers in apps/app/apps/internal
   * pass a string from their `useTranslations` namespace so the banner
   * stays a presentational primitive without depending on next-intl.
   */
  title?: string;
  /**
   * Pre-localized label for the "Severe allergies" branch (when no
   * patient name is supplied and at least one entry is severe).
   */
  severeTitle?: string;
  /**
   * Pre-localized label for the generic "Allergies" branch.
   */
  allergiesTitle?: string;
}

function normalize(entry: string | AllergyEntry): AllergyEntry {
  return typeof entry === "string" ? { allergen: entry } : entry;
}

export function AllergyBanner({
  allergies,
  patientName,
  className,
  title,
  severeTitle = "Severe allergies",
  allergiesTitle = "Allergies",
}: AllergyBannerProps) {
  if (!allergies || allergies.length === 0) return null;

  const entries = allergies.map(normalize).filter((e) => e.allergen.trim());
  if (entries.length === 0) return null;

  const hasSevere = entries.some((e) => e.severity === "severe");
  const resolvedTitle =
    title ??
    (patientName
      ? `Allergy alert — ${patientName}`
      : hasSevere
        ? severeTitle
        : allergiesTitle);

  return (
    <Alert
      variant="destructive"
      className={cn("border-destructive/40 bg-destructive/10", className)}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>{resolvedTitle}</AlertTitle>
      <AlertDescription>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {entries.map((entry, idx) => (
            <Badge
              key={`${entry.allergen}-${idx}`}
              variant={entry.severity === "severe" ? "destructive" : "secondary"}
              className={cn(
                "font-medium",
                entry.severity !== "severe" &&
                  "border-destructive/30 bg-destructive/15 text-destructive",
              )}
              title={entry.reaction}
            >
              {entry.allergen}
            </Badge>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
}
