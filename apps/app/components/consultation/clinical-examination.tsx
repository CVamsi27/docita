"use client";

import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Button } from "@workspace/ui/components/button";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Badge } from "@workspace/ui/components/badge";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { GeneralExamination, SystemicExamination } from "@workspace/types";

// ============================================================================
// UI Helpers
// ============================================================================

// Component for a group of buttons acting as a selector
function ButtonGroupSelector({
  value,
  onChange,
  options,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
  options: { label: string; value: string }[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <Button
          key={opt.value}
          type="button"
          variant={value === opt.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(opt.value)}
          className={cn(
            "h-8 text-xs",
            value === opt.value
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </Button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

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
  // Helper to update general examination fields
  const updateGeneral = (field: keyof GeneralExamination, value: unknown) => {
    onGeneralExaminationChange({
      ...generalExamination,
      [field]: value,
    });
  };

  const markGeneralNormal = () => {
    onGeneralExaminationChange({
      ...generalExamination,
      gcs: 15,
      consciousness: "CONSCIOUS",
      orientation: "ORIENTED",
      pallor: false,
      icterus: false,
      cyanosis: false,
      clubbing: false,
      lymphadenopathy: false,
      edema: false,
      nutritionStatus: "WELL_NOURISHED",
      hydrationStatus: "WELL_HYDRATED",
      pallorNotes: undefined,
      icterusNotes: undefined,
      cyanosisNotes: undefined,
      clubbingNotes: undefined,
      lymphadenopathyNotes: undefined,
      edemaLocation: undefined,
      generalNotes: undefined,
    });
  };

  // System Specific Defaults
  const SYSTEM_DEFAULTS = {
    cvs: {
      rhythm: "REGULAR" as const,
      heartSounds: "S1 S2 Normal",
      notes: "No murmurs",
    },
    rs: {
      breathSounds: "Vesicular",
      additionalSounds: "None",
      chestMovement: "NORMAL" as const,
      notes: "Clear Air Entry",
    },
    pa: {
      shape: "FLAT" as const,
      tenderness: false,
      bowelSounds: "NORMAL" as const,
      notes: "Soft, Non-tender",
    },
    cns: {
      consciousness: "CONSCIOUS" as const,
      notes: "No focal deficits",
    },
    mss: {
      gait: "NORMAL" as const,
      notes: "Full ROM",
    },
    skin: {
      color: "Normal",
      notes: "No abnormalities",
    },
    localExamination: "",
    additionalNotes: "",
  };

  const markSystemicNormal = () => {
    onSystemicExaminationChange({
      ...systemicExamination,
      cvs: {
        ...(systemicExamination.cvs || {}),
        ...SYSTEM_DEFAULTS.cvs,
      },
      rs: {
        ...(systemicExamination.rs || {}),
        ...SYSTEM_DEFAULTS.rs,
      },
      pa: {
        ...(systemicExamination.pa || {}),
        ...SYSTEM_DEFAULTS.pa,
      },
      cns: {
        ...(systemicExamination.cns || {}),
        ...SYSTEM_DEFAULTS.cns,
      },
      mss: {
        ...(systemicExamination.mss || {}),
        ...SYSTEM_DEFAULTS.mss,
      },
      skin: {
        ...(systemicExamination.skin || {}),
        ...SYSTEM_DEFAULTS.skin,
      },
    });
  };

  const setSystemNormal = (system: keyof SystemicExamination) => {
    const defaults = SYSTEM_DEFAULTS[system];
    const currentSystem = (systemicExamination as any)[system] || {}; // eslint-disable-line @typescript-eslint/no-explicit-any

    // Handle string fields (localExamination, additionalNotes) vs object fields
    if (typeof defaults === "string") {
      onSystemicExaminationChange({
        ...systemicExamination,
        [system]: defaults,
      });
    } else {
      onSystemicExaminationChange({
        ...systemicExamination,
        [system]: { ...currentSystem, ...defaults },
      });
    }
  };

  const updateSystemField = (
    system: keyof SystemicExamination,
    field: string,
    value: unknown,
  ) => {
    const currentSystem = (systemicExamination as any)[system] || {}; // eslint-disable-line @typescript-eslint/no-explicit-any
    const updatedSystem = { ...currentSystem, [field]: value };
    onSystemicExaminationChange({
      ...systemicExamination,
      [system]: updatedSystem,
    });
  };

  // Determine if General Exam is normal
  const isGeneralNormal =
    generalExamination.consciousness === "CONSCIOUS" &&
    generalExamination.orientation === "ORIENTED" &&
    generalExamination.gcs === 15 &&
    !generalExamination.pallor &&
    !generalExamination.icterus &&
    !generalExamination.cyanosis &&
    !generalExamination.clubbing &&
    !generalExamination.lymphadenopathy &&
    !generalExamination.edema &&
    generalExamination.nutritionStatus === "WELL_NOURISHED" &&
    generalExamination.hydrationStatus === "WELL_HYDRATED" &&
    !generalExamination.generalNotes;

  return (
    <div className="space-y-6">
      {/* General Examination Section - Flattened */}
      <div className="border rounded-lg bg-card">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">
              General Physical Examination
            </span>
            {isGeneralNormal && (
              <Badge
                variant="outline"
                className="text-green-600 border-green-200 bg-green-50"
              >
                <Check className="h-3 w-3 mr-1" /> Normal
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              markGeneralNormal();
            }}
            className="text-xs h-7"
          >
            Mark All Normal
          </Button>
        </div>

        <div className="p-4 space-y-6">
          {/* Vitals & Consciousness */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>GCS Score</Label>
              <Input
                type="number"
                min={3}
                max={15}
                placeholder="15"
                value={generalExamination.gcs || ""}
                onChange={(e) =>
                  updateGeneral("gcs", parseInt(e.target.value) || undefined)
                }
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Consciousness</Label>
              <ButtonGroupSelector
                value={generalExamination.consciousness || "CONSCIOUS"}
                onChange={(val) => updateGeneral("consciousness", val)}
                options={[
                  { label: "Conscious", value: "CONSCIOUS" },
                  { label: "Drowsy", value: "DROWSY" },
                  { label: "Stupor", value: "STUPOR" },
                  { label: "Coma", value: "COMA" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Orientation</Label>
              <ButtonGroupSelector
                value={generalExamination.orientation || "ORIENTED"}
                onChange={(val) => updateGeneral("orientation", val)}
                options={[
                  { label: "Oriented", value: "ORIENTED" },
                  { label: "Confused", value: "CONFUSED" },
                  { label: "Delirious", value: "DELIRIOUS" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Nutrition</Label>
              <ButtonGroupSelector
                value={generalExamination.nutritionStatus || "WELL_NOURISHED"}
                onChange={(val) => updateGeneral("nutritionStatus", val)}
                options={[
                  { label: "Normal", value: "WELL_NOURISHED" },
                  { label: "Under", value: "UNDER_NOURISHED" },
                  { label: "Obese", value: "OBESE" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Hydration</Label>
              <ButtonGroupSelector
                value={generalExamination.hydrationStatus || "WELL_HYDRATED"}
                onChange={(val) => updateGeneral("hydrationStatus", val)}
                options={[
                  { label: "Normal", value: "WELL_HYDRATED" },
                  { label: "Dehydrated", value: "DEHYDRATED" },
                  { label: "Over", value: "OVER_HYDRATED" },
                ]}
              />
            </div>
          </div>

          {/* Signs Checklist */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/10 rounded-lg">
            {[
              { key: "pallor", label: "Pallor", noteKey: "pallorNotes" },
              { key: "icterus", label: "Icterus", noteKey: "icterusNotes" },
              { key: "cyanosis", label: "Cyanosis", noteKey: "cyanosisNotes" },
              { key: "clubbing", label: "Clubbing", noteKey: "clubbingNotes" },
              {
                key: "lymphadenopathy",
                label: "Lymph Nodes",
                noteKey: "lymphadenopathyNotes",
              },
              { key: "edema", label: "Edema", noteKey: "edemaLocation" },
            ].map((sign) => (
              <div key={sign.key} className="flex flex-col space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id={sign.key}
                    checked={
                      !!generalExamination[sign.key as keyof GeneralExamination]
                    }
                    onCheckedChange={(checked) =>
                      updateGeneral(
                        sign.key as keyof GeneralExamination,
                        checked,
                      )
                    }
                  />
                  <Label
                    htmlFor={sign.key}
                    className="cursor-pointer font-normal"
                  >
                    {sign.label}
                  </Label>
                </div>
                {!!(generalExamination as any)[sign.key] && ( // eslint-disable-line @typescript-eslint/no-explicit-any
                  <Input
                    placeholder="Notes..."
                    value={(generalExamination as any)[sign.noteKey] || ""} // eslint-disable-line @typescript-eslint/no-explicit-any
                    onChange={(e) =>
                      updateGeneral(
                        sign.noteKey as keyof GeneralExamination,
                        e.target.value,
                      )
                    }
                    className="h-7 text-xs"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Additional Notes */}
          <div className="space-y-2 pt-2">
            <Label className="text-sm">Additional General Notes</Label>
            <Textarea
              placeholder="Any additional general examination findings..."
              value={generalExamination.generalNotes || ""}
              onChange={(e) => updateGeneral("generalNotes", e.target.value)}
              rows={2}
              className="resize-none"
            />
          </div>
        </div>
      </div>

      {/* Systemic Examination Section - Flattened */}
      <div className="border rounded-lg bg-card">
        <div className="flex items-center justify-between p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">Systemic Examination</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              markSystemicNormal();
            }}
            className="text-xs h-7"
          >
            Mark All Normal
          </Button>
        </div>

        <div className="p-4 grid grid-cols-1 gap-6">
          {[
            {
              id: "cvs",
              label: "Cardiovascular System (CVS)",
              defaults: SYSTEM_DEFAULTS.cvs,
            },
            {
              id: "rs",
              label: "Respiratory System (RS)",
              defaults: SYSTEM_DEFAULTS.rs,
            },
            {
              id: "pa",
              label: "Per Abdomen (PA)",
              defaults: SYSTEM_DEFAULTS.pa,
            },
            {
              id: "cns",
              label: "Central Nervous System (CNS)",
              defaults: SYSTEM_DEFAULTS.cns,
            },
            {
              id: "mss",
              label: "Musculoskeletal System (MSS)",
              defaults: SYSTEM_DEFAULTS.mss,
            },
            {
              id: "skin",
              label: "Skin / Integumentary",
              defaults: SYSTEM_DEFAULTS.skin,
            },
          ].map((system) => {
            // Determine if system is abnormal: if notes != default notes
            const currentData =
              systemicExamination[system.id as keyof SystemicExamination] || {};

            // Handle string fields (localExamination, additionalNotes) vs object fields
            if (typeof system.defaults === "string") {
              const defaultValue = system.defaults;
              const currentValue =
                typeof currentData === "string" ? currentData : "";
              const isAbnormal =
                currentValue &&
                currentValue !== defaultValue &&
                currentValue.trim() !== "";
              const isNormal = !isAbnormal;

              return (
                <div
                  key={system.id}
                  className={cn(
                    "border rounded-lg p-4 transition-colors",
                    isAbnormal
                      ? "border-orange-200 bg-orange-50/10"
                      : "bg-card",
                  )}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-sm">{system.label}</h3>
                    <div className="flex gap-2 items-center">
                      {!isNormal && (
                        <Badge
                          variant="outline"
                          className="border-orange-200 text-orange-700"
                        >
                          Abnormal
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setSystemNormal(
                            system.id as keyof SystemicExamination,
                          )
                        }
                        className="text-xs h-7"
                      >
                        Mark Normal
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            const defaultNotes = (system.defaults as any).notes; // eslint-disable-line @typescript-eslint/no-explicit-any
            const isAbnormal =
              (currentData as any).notes && // eslint-disable-line @typescript-eslint/no-explicit-any
              (currentData as any).notes !== defaultNotes && // eslint-disable-line @typescript-eslint/no-explicit-any
              (currentData as any).notes.trim() !== ""; // eslint-disable-line @typescript-eslint/no-explicit-any
            const isNormal = !isAbnormal;

            return (
              <div
                key={system.id}
                className={cn(
                  "border rounded-lg p-4 transition-colors",
                  isAbnormal ? "border-orange-200 bg-orange-50/10" : "bg-card",
                )}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{system.label}</span>
                    {isAbnormal ? (
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700 border-orange-200 text-[10px]"
                      >
                        Abnormal Findings
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-green-50 text-green-700 border-green-200 text-[10px] gap-1"
                      >
                        <Check className="h-3 w-3" /> Normal
                      </Badge>
                    )}
                  </div>
                  {isAbnormal ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setSystemNormal(system.id as keyof SystemicExamination)
                      }
                      className="h-7 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <Check className="h-3 w-3 mr-1" /> Mark Normal
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        updateSystemField(
                          system.id as keyof SystemicExamination,
                          "notes",
                          "",
                        )
                      }
                      className="h-7 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                      <AlertCircle className="h-3 w-3 mr-1" /> Add Findings
                    </Button>
                  )}
                </div>

                {/* System-specific fields */}
                {system.id === "cvs" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Rhythm</Label>
                      <ButtonGroupSelector
                        value={(currentData as any).rhythm || "REGULAR"} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "rhythm",
                            val,
                          )
                        }
                        options={[
                          { label: "Regular", value: "REGULAR" },
                          { label: "Irregular", value: "IRREGULAR" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heart Sounds</Label>
                      <Input
                        placeholder="S1 S2 Normal, Murmurs, Gallop..."
                        value={(currentData as any).heartSounds || ""} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(e) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "heartSounds",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {system.id === "rs" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Chest Movement</Label>
                      <ButtonGroupSelector
                        value={(currentData as any).chestMovement || "NORMAL"} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "chestMovement",
                            val,
                          )
                        }
                        options={[
                          { label: "Normal", value: "NORMAL" },
                          { label: "Reduced", value: "REDUCED" },
                          { label: "Accessory", value: "ACCESSORY" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Breath Sounds</Label>
                      <Input
                        placeholder="Vesicular, Bronchial, Diminished..."
                        value={(currentData as any).breathSounds || ""} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(e) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "breathSounds",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Additional Sounds</Label>
                      <Input
                        placeholder="Crepitations, Wheeze, Rhonchi..."
                        value={(currentData as any).additionalSounds || ""} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(e) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "additionalSounds",
                            e.target.value,
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                {system.id === "pa" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Shape</Label>
                      <ButtonGroupSelector
                        value={(currentData as any).shape || "FLAT"} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "shape",
                            val,
                          )
                        }
                        options={[
                          { label: "Flat", value: "FLAT" },
                          { label: "Distended", value: "DISTENDED" },
                          { label: "Scaphoid", value: "SCAPHOID" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tenderness</Label>
                      <ButtonGroupSelector
                        value={(currentData as any).tenderness ? "YES" : "NO"} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "tenderness",
                            val === "YES",
                          )
                        }
                        options={[
                          { label: "No", value: "NO" },
                          { label: "Yes", value: "YES" },
                        ]}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Bowel Sounds</Label>
                      <ButtonGroupSelector
                        value={(currentData as any).bowelSounds || "NORMAL"} // eslint-disable-line @typescript-eslint/no-explicit-any
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "bowelSounds",
                            val,
                          )
                        }
                        options={[
                          { label: "Normal", value: "NORMAL" },
                          { label: "Increased", value: "INCREASED" },
                          { label: "Decreased", value: "DECREASED" },
                          { label: "Absent", value: "ABSENT" },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {system.id === "cns" && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Consciousness</Label>
                      <ButtonGroupSelector
                        value={
                          (currentData as any).consciousness || "CONSCIOUS" // eslint-disable-line @typescript-eslint/no-explicit-any
                        }
                        onChange={(val) =>
                          updateSystemField(
                            system.id as keyof SystemicExamination,
                            "consciousness",
                            val,
                          )
                        }
                        options={[
                          { label: "Conscious", value: "CONSCIOUS" },
                          { label: "Drowsy", value: "DROWSY" },
                          { label: "Stupor", value: "STUPOR" },
                          { label: "Coma", value: "COMA" },
                        ]}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2 mt-4">
                  <Label>Findings / Notes</Label>
                  <Textarea
                    placeholder={`Describe ${system.label} findings...`}
                    value={(currentData as any).notes || ""} // eslint-disable-line @typescript-eslint/no-explicit-any
                    onChange={(e) =>
                      updateSystemField(
                        system.id as keyof SystemicExamination,
                        "notes",
                        e.target.value,
                      )
                    }
                    className={cn(
                      "min-h-20",
                      isNormal ? "text-muted-foreground" : "",
                    )}
                  />
                  {isNormal && (
                    <p className="text-[10px] text-muted-foreground">
                      (Default Normal Findings will be saved)
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
