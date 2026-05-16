import { formatDate } from "@/lib/formatters";

export type MetricValueType =
  | "TEXT"
  | "NUMBER"
  | "BOOLEAN"
  | "DATE"
  | "JSON"
  | "OPTION"
  | "MULTI_OPTION";

export interface PatientMetricsHistoryUIProps {
  patientId: string;
  readOnly?: boolean;
  className?: string;
  categoryKey?: string;
  title?: string;
  emptyHistoryMessage?: string;
  emptyDefinitionsMessage?: string;
  showTracking?: boolean;
  showConfiguration?: boolean;
  showRecording?: boolean;
}

export function extractValue(values: Array<Record<string, unknown>>): string {
  if (!values || values.length === 0) return "—";

  return values
    .map((value) => {
      if (typeof value.valueString === "string") return value.valueString;
      if (typeof value.valueNumber === "number")
        return String(value.valueNumber);
      if (typeof value.valueBoolean === "boolean")
        return value.valueBoolean ? "Yes" : "No";
      if (typeof value.valueDate === "string")
        return formatDate(value.valueDate);
      if (value.option && typeof value.option === "object") {
        const option = value.option as { label?: string; value?: string };
        return option.label || option.value || "—";
      }
      if (value.valueJson && typeof value.valueJson === "object") {
        return JSON.stringify(value.valueJson);
      }
      return "—";
    })
    .join(", ");
}
