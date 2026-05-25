import { formatDate } from "@/lib/formatters";
import type {
  MetricCategoryResponse,
  MetricDefinitionResponse,
  MetricHistoryResponse,
  MetricRecordResponse,
  MetricRecordValueResponse,
} from "@workspace/types";

export function filterMetricCategories(
  categories: MetricCategoryResponse[] | undefined,
  categoryKey?: string,
): MetricCategoryResponse[] {
  const list = categories ?? [];
  if (!categoryKey) {
    return list;
  }
  return list.filter((category) => category.key === categoryKey);
}

export function buildMetricSelectionMap(
  selected: MetricDefinitionResponse[] | undefined,
): Map<string, boolean> {
  const map = new Map<string, boolean>();
  for (const metric of selected ?? []) {
    map.set(metric.id, Boolean(metric.isTracked));
  }
  return map;
}

export function filterMetricTimeline(
  history: MetricHistoryResponse | undefined,
  categoryKey?: string,
): MetricRecordResponse[] {
  const timeline = history?.timeline ?? [];
  if (!categoryKey) {
    return timeline;
  }
  return timeline.filter(
    (record) => record.definition.category.key === categoryKey,
  );
}

export function flattenMetricDefinitions(
  categories: MetricCategoryResponse[],
): Array<{ id: string; label: string; valueType: string }> {
  const output: Array<{ id: string; label: string; valueType: string }> = [];
  for (const category of categories) {
    for (const definition of category.metricDefinitions) {
      output.push({
        id: definition.id,
        label: definition.label,
        valueType: definition.valueType ?? "TEXT",
      });
    }
  }
  return output;
}

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

export function extractValue(values: MetricRecordValueResponse[]): string {
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
      if (value.option) {
        return value.option.label || value.option.value || "—";
      }
      if (value.valueJson && typeof value.valueJson === "object") {
        return JSON.stringify(value.valueJson);
      }
      return "—";
    })
    .join(", ");
}
