"use client";

import { AlertTriangle } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Badge } from "@workspace/ui/components/badge";

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
}

function normalize(entry: string | AllergyEntry): AllergyEntry {
  return typeof entry === "string" ? { allergen: entry } : entry;
}

export function AllergyBanner({
  allergies,
  patientName,
  className,
}: AllergyBannerProps) {
  if (!allergies || allergies.length === 0) return null;

  const entries = allergies.map(normalize).filter((e) => e.allergen.trim());
  if (entries.length === 0) return null;

  const hasSevere = entries.some((e) => e.severity === "severe");
  const title = patientName
    ? `Allergy alert — ${patientName}`
    : hasSevere
      ? "Severe allergies"
      : "Allergies";

  return (
    <Alert
      variant="destructive"
      className={cn("border-destructive/40 bg-destructive/10", className)}
    >
      <AlertTriangle className="h-4 w-4" aria-hidden />
      <AlertTitle>{title}</AlertTitle>
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
