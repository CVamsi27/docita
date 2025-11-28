"use client";

import { useState } from "react";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { ChevronDown } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// Define types locally since they may not be exported yet
export interface GeneralExamination {
  gcs?: number;
  consciousness?: string;
  orientation?: string;
  pallor?: boolean;
  icterus?: boolean;
  cyanosis?: boolean;
  clubbing?: boolean;
  lymphadenopathy?: boolean;
  edema?: boolean;
  pallorNotes?: string;
  icterusNotes?: string;
  cyanosisNotes?: string;
  clubbingNotes?: string;
  lymphadenopathyNotes?: string;
  edemaLocation?: string;
  nutritionStatus?: string;
  hydrationStatus?: string;
  generalNotes?: string;
}

export interface SystemicExamination {
  cvs?: {
    heartRate?: number;
    rhythm?: string;
    heartSounds?: string;
    jvp?: string;
    peripheralPulses?: string;
    notes?: string;
  };
  rs?: {
    respiratoryRate?: number;
    breathSounds?: string;
    additionalSounds?: string;
    chestMovement?: string;
    percussion?: string;
    notes?: string;
  };
  pa?: {
    shape?: string;
    tenderness?: boolean;
    tendernessLocation?: string;
    organomegaly?: string;
    bowelSounds?: string;
    ascites?: boolean;
    notes?: string;
  };
  cns?: {
    consciousness?: string;
    cranialNerves?: string;
    motorFunction?: string;
    sensoryFunction?: string;
    reflexes?: string;
    coordination?: string;
    notes?: string;
  };
  mss?: {
    gait?: string;
    jointExamination?: string;
    muscleStrength?: string;
    deformities?: string;
    notes?: string;
  };
  skin?: {
    color?: string;
    texture?: string;
    lesions?: string;
    rashes?: string;
    notes?: string;
  };
  localExamination?: string;
  additionalNotes?: string;
}

// Custom Accordion component (simple implementation)
interface AccordionProps {
  type: "single" | "multiple";
  value?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: React.ReactNode;
}

function Accordion({
  value = [],
  onValueChange,
  className,
  children,
}: AccordionProps) {
  return (
    <div className={className} data-accordion-value={JSON.stringify(value)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(
            child as React.ReactElement<AccordionItemProps>,
            {
              isOpen: value.includes(
                (child.props as AccordionItemProps).value || "",
              ),
              onToggle: (itemValue: string) => {
                const newValue = value.includes(itemValue)
                  ? value.filter((v) => v !== itemValue)
                  : [...value, itemValue];
                onValueChange?.(newValue);
              },
            },
          );
        }
        return child;
      })}
    </div>
  );
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: (value: string) => void;
}

function AccordionItem({
  value,
  className,
  children,
  isOpen,
  onToggle,
}: AccordionItemProps) {
  return (
    <div className={className} data-state={isOpen ? "open" : "closed"}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          const childType = (child.type as { displayName?: string })
            ?.displayName;
          if (childType === "AccordionTrigger") {
            return React.cloneElement(
              child as React.ReactElement<AccordionTriggerProps>,
              {
                isOpen,
                onClick: () => onToggle?.(value),
              },
            );
          }
          if (childType === "AccordionContent") {
            return React.cloneElement(
              child as React.ReactElement<AccordionContentProps>,
              {
                isOpen,
              },
            );
          }
        }
        return child;
      })}
    </div>
  );
}

interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onClick?: () => void;
}

function AccordionTrigger({
  className,
  children,
  isOpen,
  onClick,
}: AccordionTriggerProps) {
  return (
    <button
      type="button"
      className={cn(
        "flex flex-1 w-full items-center justify-between py-4 font-medium transition-all hover:underline",
        className,
      )}
      onClick={onClick}
      data-state={isOpen ? "open" : "closed"}
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180",
        )}
      />
    </button>
  );
}
AccordionTrigger.displayName = "AccordionTrigger";

interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
  isOpen?: boolean;
}

function AccordionContent({
  className,
  children,
  isOpen,
}: AccordionContentProps) {
  if (!isOpen) return null;
  return (
    <div className={cn("overflow-hidden text-sm pb-4 pt-0", className)}>
      {children}
    </div>
  );
}
AccordionContent.displayName = "AccordionContent";

// Need React for React.Children
import React from "react";

export interface ClinicalExaminationProps {
  generalExamination: GeneralExamination;
  systemicExamination: SystemicExamination;
  onGeneralExaminationChange: (data: GeneralExamination) => void;
  onSystemicExaminationChange: (data: SystemicExamination) => void;
}

export function ClinicalExamination({
  generalExamination,
  systemicExamination,
  onGeneralExaminationChange,
  onSystemicExaminationChange,
}: ClinicalExaminationProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>([
    "general",
  ]);

  // Helper to update general examination fields
  const updateGeneral = (field: keyof GeneralExamination, value: unknown) => {
    onGeneralExaminationChange({
      ...generalExamination,
      [field]: value,
    });
  };

  // Helper to update systemic examination fields
  const updateSystemic = (
    system: keyof SystemicExamination,
    field: string,
    value: unknown,
  ) => {
    const currentSystem = systemicExamination[system] || {};
    onSystemicExaminationChange({
      ...systemicExamination,
      [system]:
        typeof currentSystem === "object"
          ? { ...currentSystem, [field]: value }
          : { [field]: value },
    });
  };

  // Check if general examination has findings
  const hasGeneralFindings =
    generalExamination.pallor ||
    generalExamination.icterus ||
    generalExamination.cyanosis ||
    generalExamination.clubbing ||
    generalExamination.lymphadenopathy ||
    generalExamination.edema;

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-3"
      >
        {/* General Physical Examination */}
        <AccordionItem value="general" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2">
              <span className="font-medium">General Physical Examination</span>
              {hasGeneralFindings && (
                <Badge variant="secondary" className="text-xs">
                  Findings noted
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-6">
              {/* Consciousness & Orientation */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>GCS Score (3-15)</Label>
                  <Input
                    type="number"
                    min={3}
                    max={15}
                    placeholder="15"
                    value={generalExamination.gcs || ""}
                    onChange={(e) =>
                      updateGeneral(
                        "gcs",
                        parseInt(e.target.value) || undefined,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Consciousness</Label>
                  <Select
                    value={generalExamination.consciousness || ""}
                    onValueChange={(v) =>
                      updateGeneral("consciousness", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSCIOUS">Conscious</SelectItem>
                      <SelectItem value="DROWSY">Drowsy</SelectItem>
                      <SelectItem value="STUPOR">Stupor</SelectItem>
                      <SelectItem value="COMA">Coma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Orientation</Label>
                  <Select
                    value={generalExamination.orientation || ""}
                    onValueChange={(v) =>
                      updateGeneral("orientation", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ORIENTED">
                        Oriented to Time, Place, Person
                      </SelectItem>
                      <SelectItem value="DISORIENTED">Disoriented</SelectItem>
                      <SelectItem value="CONFUSED">Confused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* General Signs - Checkboxes with notes */}
              <div className="space-y-4">
                <Label className="text-sm font-medium">General Signs</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Pallor */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="pallor"
                        checked={generalExamination.pallor || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("pallor", checked)
                        }
                      />
                      <Label htmlFor="pallor" className="cursor-pointer">
                        Pallor
                      </Label>
                    </div>
                    {generalExamination.pallor && (
                      <Input
                        placeholder="Notes (e.g., conjunctival pallor)"
                        value={generalExamination.pallorNotes || ""}
                        onChange={(e) =>
                          updateGeneral("pallorNotes", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Icterus (Jaundice) */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="icterus"
                        checked={generalExamination.icterus || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("icterus", checked)
                        }
                      />
                      <Label htmlFor="icterus" className="cursor-pointer">
                        Icterus (Jaundice)
                      </Label>
                    </div>
                    {generalExamination.icterus && (
                      <Input
                        placeholder="Notes (e.g., scleral icterus)"
                        value={generalExamination.icterusNotes || ""}
                        onChange={(e) =>
                          updateGeneral("icterusNotes", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Cyanosis */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="cyanosis"
                        checked={generalExamination.cyanosis || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("cyanosis", checked)
                        }
                      />
                      <Label htmlFor="cyanosis" className="cursor-pointer">
                        Cyanosis
                      </Label>
                    </div>
                    {generalExamination.cyanosis && (
                      <Input
                        placeholder="Notes (central/peripheral)"
                        value={generalExamination.cyanosisNotes || ""}
                        onChange={(e) =>
                          updateGeneral("cyanosisNotes", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Clubbing */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="clubbing"
                        checked={generalExamination.clubbing || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("clubbing", checked)
                        }
                      />
                      <Label htmlFor="clubbing" className="cursor-pointer">
                        Clubbing
                      </Label>
                    </div>
                    {generalExamination.clubbing && (
                      <Input
                        placeholder="Notes (grade, location)"
                        value={generalExamination.clubbingNotes || ""}
                        onChange={(e) =>
                          updateGeneral("clubbingNotes", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Lymphadenopathy */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="lymphadenopathy"
                        checked={generalExamination.lymphadenopathy || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("lymphadenopathy", checked)
                        }
                      />
                      <Label
                        htmlFor="lymphadenopathy"
                        className="cursor-pointer"
                      >
                        Lymphadenopathy
                      </Label>
                    </div>
                    {generalExamination.lymphadenopathy && (
                      <Input
                        placeholder="Notes (site, size, consistency)"
                        value={generalExamination.lymphadenopathyNotes || ""}
                        onChange={(e) =>
                          updateGeneral("lymphadenopathyNotes", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>

                  {/* Edema */}
                  <div className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="edema"
                        checked={generalExamination.edema || false}
                        onCheckedChange={(checked) =>
                          updateGeneral("edema", checked)
                        }
                      />
                      <Label htmlFor="edema" className="cursor-pointer">
                        Edema
                      </Label>
                    </div>
                    {generalExamination.edema && (
                      <Input
                        placeholder="Location (e.g., bilateral pedal edema)"
                        value={generalExamination.edemaLocation || ""}
                        onChange={(e) =>
                          updateGeneral("edemaLocation", e.target.value)
                        }
                        className="text-sm"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Nutritional & Hydration Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nutritional Status</Label>
                  <Select
                    value={generalExamination.nutritionStatus || ""}
                    onValueChange={(v) =>
                      updateGeneral("nutritionStatus", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WELL_NOURISHED">
                        Well Nourished
                      </SelectItem>
                      <SelectItem value="MALNOURISHED">Malnourished</SelectItem>
                      <SelectItem value="OBESE">Obese</SelectItem>
                      <SelectItem value="UNDERWEIGHT">Underweight</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Hydration Status</Label>
                  <Select
                    value={generalExamination.hydrationStatus || ""}
                    onValueChange={(v) =>
                      updateGeneral("hydrationStatus", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WELL_HYDRATED">
                        Well Hydrated
                      </SelectItem>
                      <SelectItem value="DEHYDRATED">Dehydrated</SelectItem>
                      <SelectItem value="OVERHYDRATED">Overhydrated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional general examination findings..."
                  value={generalExamination.generalNotes || ""}
                  onChange={(e) =>
                    updateGeneral("generalNotes", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Cardiovascular System (CVS) */}
        <AccordionItem value="cvs" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="font-medium">Cardiovascular System (CVS)</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Heart Rate (bpm)</Label>
                  <Input
                    type="number"
                    placeholder="72"
                    value={systemicExamination.cvs?.heartRate || ""}
                    onChange={(e) =>
                      updateSystemic(
                        "cvs",
                        "heartRate",
                        parseInt(e.target.value) || undefined,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rhythm</Label>
                  <Select
                    value={systemicExamination.cvs?.rhythm || ""}
                    onValueChange={(v) =>
                      updateSystemic("cvs", "rhythm", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="REGULAR">Regular</SelectItem>
                      <SelectItem value="IRREGULAR">Irregular</SelectItem>
                      <SelectItem value="IRREGULARLY_IRREGULAR">
                        Irregularly Irregular
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>JVP</Label>
                  <Input
                    placeholder="Normal / Raised"
                    value={systemicExamination.cvs?.jvp || ""}
                    onChange={(e) =>
                      updateSystemic("cvs", "jvp", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Heart Sounds</Label>
                  <Input
                    placeholder="S1 S2 heard, no murmurs"
                    value={systemicExamination.cvs?.heartSounds || ""}
                    onChange={(e) =>
                      updateSystemic("cvs", "heartSounds", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Peripheral Pulses</Label>
                  <Input
                    placeholder="All peripheral pulses palpable"
                    value={systemicExamination.cvs?.peripheralPulses || ""}
                    onChange={(e) =>
                      updateSystemic("cvs", "peripheralPulses", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CVS Notes</Label>
                <Textarea
                  placeholder="Additional CVS findings..."
                  value={systemicExamination.cvs?.notes || ""}
                  onChange={(e) =>
                    updateSystemic("cvs", "notes", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Respiratory System (RS) */}
        <AccordionItem value="rs" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="font-medium">Respiratory System (RS)</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Respiratory Rate (/min)</Label>
                  <Input
                    type="number"
                    placeholder="16"
                    value={systemicExamination.rs?.respiratoryRate || ""}
                    onChange={(e) =>
                      updateSystemic(
                        "rs",
                        "respiratoryRate",
                        parseInt(e.target.value) || undefined,
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Chest Movement</Label>
                  <Select
                    value={systemicExamination.rs?.chestMovement || ""}
                    onValueChange={(v) =>
                      updateSystemic("rs", "chestMovement", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="REDUCED">Reduced</SelectItem>
                      <SelectItem value="ASYMMETRIC">Asymmetric</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Percussion</Label>
                  <Input
                    placeholder="Resonant / Dull"
                    value={systemicExamination.rs?.percussion || ""}
                    onChange={(e) =>
                      updateSystemic("rs", "percussion", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Breath Sounds</Label>
                  <Input
                    placeholder="Bilateral vesicular breath sounds"
                    value={systemicExamination.rs?.breathSounds || ""}
                    onChange={(e) =>
                      updateSystemic("rs", "breathSounds", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Additional Sounds</Label>
                  <Input
                    placeholder="Crackles, wheezes, rhonchi..."
                    value={systemicExamination.rs?.additionalSounds || ""}
                    onChange={(e) =>
                      updateSystemic("rs", "additionalSounds", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>RS Notes</Label>
                <Textarea
                  placeholder="Additional respiratory findings..."
                  value={systemicExamination.rs?.notes || ""}
                  onChange={(e) =>
                    updateSystemic("rs", "notes", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Per Abdomen (P/A) */}
        <AccordionItem value="pa" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="font-medium">Per Abdomen (P/A)</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Shape</Label>
                  <Select
                    value={systemicExamination.pa?.shape || ""}
                    onValueChange={(v) =>
                      updateSystemic("pa", "shape", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="FLAT">Flat</SelectItem>
                      <SelectItem value="DISTENDED">Distended</SelectItem>
                      <SelectItem value="SCAPHOID">Scaphoid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bowel Sounds</Label>
                  <Select
                    value={systemicExamination.pa?.bowelSounds || ""}
                    onValueChange={(v) =>
                      updateSystemic("pa", "bowelSounds", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NORMAL">Normal</SelectItem>
                      <SelectItem value="HYPERACTIVE">Hyperactive</SelectItem>
                      <SelectItem value="HYPOACTIVE">Hypoactive</SelectItem>
                      <SelectItem value="ABSENT">Absent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="tenderness"
                        checked={systemicExamination.pa?.tenderness || false}
                        onCheckedChange={(checked) =>
                          updateSystemic("pa", "tenderness", checked)
                        }
                      />
                      <Label htmlFor="tenderness">Tenderness</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="ascites"
                        checked={systemicExamination.pa?.ascites || false}
                        onCheckedChange={(checked) =>
                          updateSystemic("pa", "ascites", checked)
                        }
                      />
                      <Label htmlFor="ascites">Ascites</Label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {systemicExamination.pa?.tenderness && (
                  <div className="space-y-2">
                    <Label>Tenderness Location</Label>
                    <Input
                      placeholder="e.g., Right iliac fossa"
                      value={systemicExamination.pa?.tendernessLocation || ""}
                      onChange={(e) =>
                        updateSystemic(
                          "pa",
                          "tendernessLocation",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Organomegaly</Label>
                  <Input
                    placeholder="Hepatomegaly, splenomegaly..."
                    value={systemicExamination.pa?.organomegaly || ""}
                    onChange={(e) =>
                      updateSystemic("pa", "organomegaly", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>P/A Notes</Label>
                <Textarea
                  placeholder="Additional abdominal findings..."
                  value={systemicExamination.pa?.notes || ""}
                  onChange={(e) =>
                    updateSystemic("pa", "notes", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Central Nervous System (CNS) */}
        <AccordionItem value="cns" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="font-medium">Central Nervous System (CNS)</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Consciousness</Label>
                  <Select
                    value={systemicExamination.cns?.consciousness || ""}
                    onValueChange={(v) =>
                      updateSystemic("cns", "consciousness", v || undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONSCIOUS">Conscious</SelectItem>
                      <SelectItem value="DROWSY">Drowsy</SelectItem>
                      <SelectItem value="STUPOR">Stupor</SelectItem>
                      <SelectItem value="COMA">Coma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cranial Nerves</Label>
                  <Input
                    placeholder="All cranial nerves intact"
                    value={systemicExamination.cns?.cranialNerves || ""}
                    onChange={(e) =>
                      updateSystemic("cns", "cranialNerves", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Motor Function</Label>
                  <Input
                    placeholder="Power 5/5 in all limbs"
                    value={systemicExamination.cns?.motorFunction || ""}
                    onChange={(e) =>
                      updateSystemic("cns", "motorFunction", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sensory Function</Label>
                  <Input
                    placeholder="Intact to light touch, pinprick"
                    value={systemicExamination.cns?.sensoryFunction || ""}
                    onChange={(e) =>
                      updateSystemic("cns", "sensoryFunction", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reflexes</Label>
                  <Input
                    placeholder="DTR 2+ bilaterally, plantars flexor"
                    value={systemicExamination.cns?.reflexes || ""}
                    onChange={(e) =>
                      updateSystemic("cns", "reflexes", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Coordination</Label>
                  <Input
                    placeholder="Finger-nose test normal"
                    value={systemicExamination.cns?.coordination || ""}
                    onChange={(e) =>
                      updateSystemic("cns", "coordination", e.target.value)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>CNS Notes</Label>
                <Textarea
                  placeholder="Additional neurological findings..."
                  value={systemicExamination.cns?.notes || ""}
                  onChange={(e) =>
                    updateSystemic("cns", "notes", e.target.value)
                  }
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Local Examination */}
        <AccordionItem value="local" className="border rounded-lg">
          <AccordionTrigger className="px-4 hover:no-underline">
            <span className="font-medium">Local Examination</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4">
            <div className="space-y-2">
              <Label>Local Examination Findings</Label>
              <Textarea
                placeholder="Specific examination findings related to the presenting complaint (e.g., ENT examination, skin lesion examination, joint examination)..."
                value={systemicExamination.localExamination || ""}
                onChange={(e) =>
                  onSystemicExaminationChange({
                    ...systemicExamination,
                    localExamination: e.target.value,
                  })
                }
                rows={4}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
