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
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// Common drug interaction database (simplified for demo)
// In production, this would be fetched from a medical API like DrugBank, RxNorm, etc.
interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: "major" | "moderate" | "minor";
  description: string;
  recommendation: string;
}

// Sample drug interactions database
const DRUG_INTERACTIONS: DrugInteraction[] = [
  // Major interactions
  {
    drug1: "warfarin",
    drug2: "aspirin",
    severity: "major",
    description:
      "Increased risk of bleeding when combining warfarin with aspirin.",
    recommendation:
      "Avoid combination or use with extreme caution. Monitor closely for signs of bleeding.",
  },
  {
    drug1: "metformin",
    drug2: "contrast dye",
    severity: "major",
    description:
      "Risk of lactic acidosis when metformin is combined with iodinated contrast agents.",
    recommendation:
      "Hold metformin 48 hours before and after contrast procedures.",
  },
  {
    drug1: "ssri",
    drug2: "maoi",
    severity: "major",
    description: "Serotonin syndrome risk - potentially fatal.",
    recommendation:
      "Contraindicated. Allow 14-day washout between MAOIs and SSRIs.",
  },
  {
    drug1: "fluoxetine",
    drug2: "tramadol",
    severity: "major",
    description: "Risk of serotonin syndrome and seizures.",
    recommendation: "Use alternative pain management if possible.",
  },
  {
    drug1: "ciprofloxacin",
    drug2: "tizanidine",
    severity: "major",
    description: "Ciprofloxacin significantly increases tizanidine levels.",
    recommendation: "Combination is contraindicated.",
  },

  // Moderate interactions
  {
    drug1: "amlodipine",
    drug2: "simvastatin",
    severity: "moderate",
    description: "Increased risk of myopathy/rhabdomyolysis.",
    recommendation: "Limit simvastatin dose to 20mg when used with amlodipine.",
  },
  {
    drug1: "omeprazole",
    drug2: "clopidogrel",
    severity: "moderate",
    description: "Omeprazole may reduce the effectiveness of clopidogrel.",
    recommendation: "Consider using pantoprazole instead of omeprazole.",
  },
  {
    drug1: "nsaid",
    drug2: "ace inhibitor",
    severity: "moderate",
    description:
      "NSAIDs may reduce the antihypertensive effect and increase renal risk.",
    recommendation: "Monitor blood pressure and kidney function.",
  },
  {
    drug1: "metformin",
    drug2: "alcohol",
    severity: "moderate",
    description: "Increased risk of lactic acidosis and hypoglycemia.",
    recommendation: "Advise patient to limit alcohol consumption.",
  },
  {
    drug1: "levothyroxine",
    drug2: "calcium",
    severity: "moderate",
    description: "Calcium can reduce levothyroxine absorption.",
    recommendation: "Separate administration by at least 4 hours.",
  },

  // Minor interactions
  {
    drug1: "ibuprofen",
    drug2: "antacid",
    severity: "minor",
    description: "Antacids may slightly reduce ibuprofen absorption.",
    recommendation: "Take ibuprofen 2 hours before or after antacid.",
  },
  {
    drug1: "metformin",
    drug2: "vitamin b12",
    severity: "minor",
    description: "Long-term metformin use may reduce B12 absorption.",
    recommendation: "Monitor B12 levels in long-term users.",
  },
];

// Drug class mappings for broader matching
const DRUG_CLASSES: Record<string, string[]> = {
  ssri: [
    "fluoxetine",
    "sertraline",
    "paroxetine",
    "escitalopram",
    "citalopram",
    "fluvoxamine",
  ],
  maoi: ["phenelzine", "tranylcypromine", "isocarboxazid", "selegiline"],
  nsaid: [
    "ibuprofen",
    "naproxen",
    "diclofenac",
    "celecoxib",
    "meloxicam",
    "indomethacin",
    "aspirin",
  ],
  "ace inhibitor": [
    "lisinopril",
    "enalapril",
    "ramipril",
    "captopril",
    "benazepril",
    "perindopril",
  ],
  statin: [
    "atorvastatin",
    "simvastatin",
    "rosuvastatin",
    "pravastatin",
    "lovastatin",
  ],
  ppi: [
    "omeprazole",
    "pantoprazole",
    "esomeprazole",
    "lansoprazole",
    "rabeprazole",
  ],
  anticoagulant: [
    "warfarin",
    "rivaroxaban",
    "apixaban",
    "dabigatran",
    "edoxaban",
  ],
  fluoroquinolone: [
    "ciprofloxacin",
    "levofloxacin",
    "moxifloxacin",
    "ofloxacin",
  ],
};

function normalizeDrugName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, " ");
}

function getDrugClass(drug: string): string | null {
  const normalized = normalizeDrugName(drug);
  for (const [className, drugs] of Object.entries(DRUG_CLASSES)) {
    if (drugs.some((d) => normalized.includes(d))) {
      return className;
    }
  }
  return null;
}

function checkInteraction(
  drug1: string,
  drug2: string,
): DrugInteraction | null {
  const norm1 = normalizeDrugName(drug1);
  const norm2 = normalizeDrugName(drug2);

  // Get drug classes
  const class1 = getDrugClass(drug1);
  const class2 = getDrugClass(drug2);

  for (const interaction of DRUG_INTERACTIONS) {
    const interDrug1 = interaction.drug1.toLowerCase();
    const interDrug2 = interaction.drug2.toLowerCase();

    // Direct match
    if (
      (norm1.includes(interDrug1) && norm2.includes(interDrug2)) ||
      (norm1.includes(interDrug2) && norm2.includes(interDrug1))
    ) {
      return interaction;
    }

    // Class-based match
    if (
      (class1 === interDrug1 &&
        (norm2.includes(interDrug2) || class2 === interDrug2)) ||
      (class2 === interDrug1 &&
        (norm1.includes(interDrug2) || class1 === interDrug2)) ||
      (class1 === interDrug2 &&
        (norm2.includes(interDrug1) || class2 === interDrug1)) ||
      (class2 === interDrug2 &&
        (norm1.includes(interDrug1) || class1 === interDrug1))
    ) {
      return interaction;
    }
  }

  return null;
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

  React.useEffect(() => {
    const detected: DetectedInteraction[] = [];
    const validMeds = medications.filter(
      (m) => m.name && m.name.trim().length > 0,
    );

    // Check drug-drug interactions
    for (let i = 0; i < validMeds.length; i++) {
      for (let j = i + 1; j < validMeds.length; j++) {
        const med1 = validMeds[i];
        const med2 = validMeds[j];
        if (med1 && med2) {
          const interaction = checkInteraction(med1.name, med2.name);
          if (interaction) {
            detected.push({
              ...interaction,
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
  }, [medications, patientAllergies]);

  const majorInteractions = interactions.filter((i) => i.severity === "major");
  const moderateInteractions = interactions.filter(
    (i) => i.severity === "moderate",
  );
  const minorInteractions = interactions.filter((i) => i.severity === "minor");

  const hasWarnings = interactions.length > 0 || allergyWarnings.length > 0;

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
