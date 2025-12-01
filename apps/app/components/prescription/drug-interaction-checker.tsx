"use client";

import * as React from "react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { checkDrugDrugContraindications } from "@workspace/types";

interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  recommendation: string;
}

interface Medication {
  name: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

export interface DrugInteractionCheckerProps {
  medications: Medication[];
  patientAllergies?: string[];
  className?: string;
}

interface DetectedInteraction extends DrugInteraction {
  medication1: string;
  medication2: string;
}

export function DrugInteractionChecker({
  medications,
  patientAllergies = [],
  className,
}: DrugInteractionCheckerProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [interactions, setInteractions] = React.useState<DetectedInteraction[]>(
    [],
  );
  const [allergyWarnings, setAllergyWarnings] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const checkInteractions = async () => {
      try {
        setIsLoading(true);
        const validMeds = medications.filter(
          (m) => m.name && m.name.trim().length > 0,
        );

        if (validMeds.length < 2) {
          setInteractions([]);
          setAllergyWarnings([]);
          return;
        }

        // Check drug-drug interactions using backend validation function
        const detected: DetectedInteraction[] = [];
        for (let i = 0; i < validMeds.length; i++) {
          for (let j = i + 1; j < validMeds.length; j++) {
            const med1 = validMeds[i];
            const med2 = validMeds[j];
            if (med1 && med2) {
              const result = checkDrugDrugContraindications(med1.name, [
                med2.name,
              ]);
              if (result && result.isContraindicated) {
                detected.push({
                  drug1: med1.name,
                  drug2: med2.name,
                  severity: (result.severity?.toLowerCase() === "critical"
                    ? "major"
                    : result.severity?.toLowerCase() || "minor") as
                    | "major"
                    | "moderate"
                    | "minor",
                  description: result.message || "Interaction detected",
                  recommendation: result.recommendation || "Use with caution",
                  medication1: med1.name,
                  medication2: med2.name,
                });
              }
            }
          }
        }

        setInteractions(detected);

        // Check for allergy warnings
        const warnings: string[] = [];
        for (const med of validMeds) {
          for (const allergy of patientAllergies) {
            if (
              med.name.toLowerCase().includes(allergy.toLowerCase()) ||
              allergy.toLowerCase().includes(med.name.toLowerCase())
            ) {
              warnings.push(
                `${med.name} may be related to patient's ${allergy} allergy`,
              );
            }
          }
        }
        setAllergyWarnings(warnings);
      } catch (error) {
        console.error("Failed to check interactions:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkInteractions();
  }, [medications, patientAllergies]);

  const majorInteractions = interactions.filter((i) => i.severity === "major");
  const moderateInteractions = interactions.filter(
    (i) => i.severity === "moderate",
  );
  const minorInteractions = interactions.filter((i) => i.severity === "minor");

  const hasWarnings = interactions.length > 0 || allergyWarnings.length > 0;

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Checking for interactions...</span>
      </div>
    );
  }

  if (!hasWarnings) {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-sm text-green-600 dark:text-green-400",
          className,
        )}
      >
        <Shield className="h-4 w-4" />
        <span>No drug interactions detected</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header Alert - Clickable to expand/collapse */}
      <Alert
        className={cn(
          "cursor-pointer transition-all hover:bg-muted/50",
          majorInteractions.length > 0
            ? "border-red-500/50 bg-red-500/5"
            : moderateInteractions.length > 0
              ? "border-yellow-500/50 bg-yellow-500/5"
              : "border-blue-500/50 bg-blue-500/5",
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {majorInteractions.length > 0 ? (
              <AlertTriangle className="h-4 w-4 text-red-500" />
            ) : moderateInteractions.length > 0 ? (
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            ) : (
              <Info className="h-4 w-4 text-blue-500" />
            )}
            <AlertTitle className="mb-0">
              {interactions.length} Drug Interaction
              {interactions.length !== 1 ? "s" : ""} Detected
            </AlertTitle>
            <div className="flex gap-1 ml-2">
              {majorInteractions.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {majorInteractions.length} Major
                </Badge>
              )}
              {moderateInteractions.length > 0 && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400"
                >
                  {moderateInteractions.length} Moderate
                </Badge>
              )}
              {minorInteractions.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {minorInteractions.length} Minor
                </Badge>
              )}
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </Alert>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Allergy Warnings */}
          {allergyWarnings.length > 0 && (
            <Alert className="border-red-500/50 bg-red-500/5">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <AlertTitle>Allergy Alert</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-4 mt-2 space-y-1">
                  {allergyWarnings.map((warning, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-red-700 dark:text-red-400"
                    >
                      {warning}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Major Interactions */}
          {majorInteractions.map((interaction, idx) => (
            <InteractionCard key={`major-${idx}`} interaction={interaction} />
          ))}

          {/* Moderate Interactions */}
          {moderateInteractions.map((interaction, idx) => (
            <InteractionCard
              key={`moderate-${idx}`}
              interaction={interaction}
            />
          ))}

          {/* Minor Interactions */}
          {minorInteractions.map((interaction, idx) => (
            <InteractionCard key={`minor-${idx}`} interaction={interaction} />
          ))}

          <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t">
            <span>Data sourced from clinical databases</span>
            <Button variant="link" size="sm" className="h-auto p-0 text-xs">
              <ExternalLink className="h-3 w-3 mr-1" />
              Learn more
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function InteractionCard({
  interaction,
}: {
  interaction: DetectedInteraction;
}) {
  const getSeverityStyles = () => {
    switch (interaction.severity) {
      case "major":
        return {
          border: "border-red-500/30",
          bg: "bg-red-500/5",
          badge: "bg-red-500/20 text-red-700 dark:text-red-400",
          icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
        };
      case "moderate":
        return {
          border: "border-yellow-500/30",
          bg: "bg-yellow-500/5",
          badge: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
          icon: <AlertCircle className="h-4 w-4 text-yellow-500" />,
        };
      default:
        return {
          border: "border-blue-500/30",
          bg: "bg-blue-500/5",
          badge: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
          icon: <Info className="h-4 w-4 text-blue-500" />,
        };
    }
  };

  const styles = getSeverityStyles();

  return (
    <Card className={cn("border", styles.border, styles.bg)}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {styles.icon}
            <div>
              <p className="font-medium text-sm">
                {interaction.medication1} + {interaction.medication2}
              </p>
              <Badge
                variant="secondary"
                className={cn("text-xs mt-1", styles.badge)}
              >
                {interaction.severity.charAt(0).toUpperCase() +
                  interaction.severity.slice(1)}{" "}
                Interaction
              </Badge>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          {interaction.description}
        </p>

        <div className="bg-background/50 rounded-md p-3 border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
            Recommendation
          </p>
          <p className="text-sm">{interaction.recommendation}</p>
        </div>
      </CardContent>
    </Card>
  );
}
