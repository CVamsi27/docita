import {
  dentalChartSchema,
  growthChartDataSchema,
  ophthalmologyExamDataSchema,
  type GrowthChartData,
  type OphthalmologyExamData,
} from "@workspace/types";
import type { DentalChartValue } from "@/features/consultation";

export function parseDentalChartValue(value: unknown): DentalChartValue {
  const parsed = dentalChartSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

export function parseOphthalmologyExamValue(
  value: unknown,
): OphthalmologyExamData {
  const parsed = ophthalmologyExamDataSchema.safeParse(value);
  return parsed.success ? parsed.data : {};
}

function defaultGrowthChartData(
  patientGender: string | null | undefined,
): GrowthChartData {
  return {
    patientGender: patientGender === "MALE" ? "MALE" : "FEMALE",
    measurements: [],
  };
}

export function parseGrowthChartValue(
  value: unknown,
  patientGender: string | null | undefined,
): GrowthChartData {
  const parsed = growthChartDataSchema.safeParse(value);
  return parsed.success
    ? parsed.data
    : defaultGrowthChartData(patientGender);
}
