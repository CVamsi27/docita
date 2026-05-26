"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Baby, Eye, Smile } from "lucide-react";
import {
  GrowthChartData,
  OphthalmologyExamData,
  PatientWithMedicalHistory,
} from "@workspace/types";
import {
  DentalChartUI,
  type DentalChartValue,
} from "@/features/consultation/components/specialty/DentalChartUI";
import { GrowthChartUI } from "@/features/consultation/components/specialty/GrowthChartUI";
import { VisionExamUI } from "@/features/consultation/components/specialty/VisionExamUI";
import {
  parseDentalChartValue,
  parseGrowthChartValue,
  parseOphthalmologyExamValue,
} from "@/features/patients/components/details/patient-medical-history-helpers";

function readCustomData(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value))
    : {};
}

export function PatientMedicalHistorySpecialty({
  patient,
  clinicType,
  readOnly,
  isGrowthReadOnly,
  isCompact,
  onCustomDataUpdate,
}: {
  patient: PatientWithMedicalHistory;
  clinicType?: string;
  readOnly: boolean;
  isGrowthReadOnly: boolean;
  isCompact: boolean;
  onCustomDataUpdate?: (
    key: string,
    value: string | number | boolean | Record<string, unknown>,
  ) => void;
}) {
  const customData = readCustomData(patient.customData);

  let component = null;
  let title = "";
  let icon = null;

  if (clinicType === "DENTAL") {
    title = "Baseline Dental Chart";
    icon = <Smile className="h-5 w-5 text-info" />;
    component = (
      <DentalChartUI
        value={parseDentalChartValue(customData.dentalChart)}
        onChange={(val: DentalChartValue) =>
          onCustomDataUpdate?.(
            "dentalChart",
            Object.fromEntries(Object.entries(val)),
          )
        }
        readOnly={readOnly}
      />
    );
  } else if (clinicType === "OPHTHALMOLOGY") {
    title = "Baseline Vision Exam";
    icon = <Eye className="h-5 w-5 text-info" />;
    component = (
      <VisionExamUI
        value={parseOphthalmologyExamValue(customData.ophthalmologyExam)}
        onChange={(val: OphthalmologyExamData) =>
          onCustomDataUpdate?.(
            "ophthalmologyExam",
            Object.fromEntries(Object.entries(val)),
          )
        }
        readOnly={readOnly}
      />
    );
  } else if (clinicType === "PEDIATRIC") {
    title = "Growth Data";
    icon = <Baby className="h-5 w-5 text-destructive" />;
    component = (
      <GrowthChartUI
        value={parseGrowthChartValue(customData.growthData, patient.gender)}
        onChange={(val: GrowthChartData) =>
          onCustomDataUpdate?.(
            "growthData",
            Object.fromEntries(Object.entries(val)),
          )
        }
        readOnly={isGrowthReadOnly}
      />
    );
  } else {
    return null;
  }

  if (isCompact) {
    return (
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2 font-medium">
          {icon}
          {title}
        </div>
        {component}
      </div>
    );
  }

  return (
    <Card className="mb-6 border-l-4 border-l-primary/50">
      <CardHeader className="py-4">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>
          Clinic-specific baseline records for this patient
        </CardDescription>
      </CardHeader>
      <CardContent>{component}</CardContent>
    </Card>
  );
}
