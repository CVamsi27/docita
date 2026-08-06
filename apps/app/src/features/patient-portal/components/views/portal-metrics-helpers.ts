import { isRecord } from "@workspace/utils";
import type { MetricRecordResponse } from "@workspace/types";

export type PortalMetricRecord = {
  id: string;
  definitionId: string;
  recordedAt: string;
  values: Array<{
    valueNumber?: number | null;
    valueString?: string | null;
    valueBoolean?: boolean | null;
  }>;
};

export type PortalMetricDefinition = {
  id: string;
  key: string;
  label: string;
  unit?: string | null;
  valueType: string;
  isTracked: boolean;
};

export type PortalMetricCategory = {
  id: string;
  name: string;
  metricDefinitions: PortalMetricDefinition[];
};

export function toPortalMetricRecord(
  record: MetricRecordResponse,
): PortalMetricRecord | null {
  const definitionId = record.definitionId ?? record.definition.id;
  if (!definitionId) return null;
  const recordedAt =
    typeof record.recordedAt === "string"
      ? record.recordedAt
      : record.recordedAt.toISOString();
  return {
    id: record.id,
    definitionId,
    recordedAt,
    values: record.values.map((value) => ({
      valueNumber: value.valueNumber,
      valueString: value.valueString,
      valueBoolean: value.valueBoolean,
    })),
  };
}

function readPortalMetricDefinition(
  value: unknown,
): PortalMetricDefinition | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.key !== "string") return null;
  return {
    id: value.id,
    key: value.key,
    label: typeof value.label === "string" ? value.label : value.key,
    unit:
      typeof value.unit === "string" || value.unit === null ? value.unit : null,
    valueType: typeof value.valueType === "string" ? value.valueType : "NUMBER",
    isTracked: value.isTracked === true,
  };
}

export function readPortalMetricCategory(value: unknown): PortalMetricCategory | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || typeof value.name !== "string") return null;
  const metricDefinitions = Array.isArray(value.metricDefinitions)
    ? value.metricDefinitions
        .map(readPortalMetricDefinition)
        .filter((entry): entry is PortalMetricDefinition => entry !== null)
    : [];
  return { id: value.id, name: value.name, metricDefinitions };
}

export function getDateRange(days: number) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - days);
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}
