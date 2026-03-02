import React, { useMemo } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Pill, Plus, Trash2 } from "lucide-react";
import { useClinicSettings } from "@/hooks/api/use-settings";
import ClinicFeatureService, {
  MEDICATION_ROUTES,
} from "@/lib/services/clinic-feature.service";

import { ClinicType } from "@workspace/types";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  route: string;
  instructions?: string;
}

interface PrescriptionInputProps {
  value: Medication[];
  onChange: (medications: Medication[]) => void;
  readOnly?: boolean;
}

export function PrescriptionInput({
  value = [],
  onChange,
  readOnly = false,
}: PrescriptionInputProps) {
  const { data: clinic } = useClinicSettings();
  const medications = value.length > 0 ? value : [];

  const groupedRoutes = useMemo(() => {
    return ClinicFeatureService.getMedicationRoutesGrouped(
      clinic?.type as ClinicType,
    );
  }, [clinic?.type]);

  const prioritizedRoutes = useMemo(() => {
    return ClinicFeatureService.getMedicationRoutes(clinic?.type as ClinicType);
  }, [clinic?.type]);

  const addMedication = () => {

    const defaultRoute = prioritizedRoutes[0]?.value || "ORAL";

    onChange([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        route: defaultRoute,
        instructions: "",
      },
    ]);
  };

  const updateMedication = (
    index: number,
    field: keyof Medication,
    fieldValue: string,
  ) => {
    const newMeds = [...medications];
    newMeds[index] = { ...newMeds[index], [field]: fieldValue };
    onChange(newMeds);
  };

  const removeMedication = (index: number) => {
    const newMeds = medications.filter((_, i) => i !== index);
    onChange(newMeds);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {medications.map((med, index) => (
          <div
            key={index}
            className="p-4 bg-muted/20 border rounded-lg space-y-3 transition-colors hover:bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-1.5 rounded-full">
                  <Pill className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-medium">
                  Medication #{index + 1}
                </span>
              </div>
              {!readOnly && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeMedication(index)}
                  title="Remove medication"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="col-span-1 md:col-span-4">
                <Input
                  placeholder="Medication Name (e.g. Amoxicillin 500mg)"
                  value={med.name}
                  onChange={(e) =>
                    updateMedication(index, "name", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input
                  placeholder="Dosage (e.g. 1 tab)"
                  value={med.dosage}
                  onChange={(e) =>
                    updateMedication(index, "dosage", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input
                  placeholder="Freq (e.g. BID)"
                  value={med.frequency}
                  onChange={(e) =>
                    updateMedication(index, "frequency", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                <Input
                  placeholder="Duration"
                  value={med.duration}
                  onChange={(e) =>
                    updateMedication(index, "duration", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
              <div className="col-span-1 md:col-span-2">
                {readOnly ? (
                  <Input
                    value={
                      MEDICATION_ROUTES.find((r) => r.value === med.route)
                        ?.label || med.route
                    }
                    readOnly
                    className="bg-background"
                  />
                ) : (
                  <Select
                    value={med.route}
                    onValueChange={(val) =>
                      updateMedication(index, "route", val)
                    }
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Route" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(groupedRoutes).map(
                        ([category, routes]) => (
                          <SelectGroup key={category}>
                            <SelectLabel>{category} Routes</SelectLabel>
                            {routes.map((route) => (
                              <SelectItem key={route.value} value={route.value}>
                                {route.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="col-span-1 md:col-span-12">
                <Input
                  placeholder="Instructions (e.g. Take after food)"
                  value={med.instructions || ""}
                  onChange={(e) =>
                    updateMedication(index, "instructions", e.target.value)
                  }
                  readOnly={readOnly}
                  className="bg-background"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {!readOnly && (
        <Button
          variant="outline"
          onClick={addMedication}
          className="w-full border-dashed py-6 text-muted-foreground hover:text-primary"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Medication
        </Button>
      )}

      {medications.length === 0 && readOnly && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          No medications prescribed.
        </div>
      )}
    </div>
  );
}
