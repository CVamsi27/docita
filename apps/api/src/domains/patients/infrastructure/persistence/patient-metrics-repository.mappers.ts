import { MetricRecordSource, Prisma } from '@workspace/db';
import {
  MetricCategoryRow,
  MetricDefinitionRow,
  MetricRecordRow,
  MetricSelectionRow,
} from '@/domains/patients/core/repositories/patient-metrics.repository.interface';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { patientMetricValueJsonSchema } from '@workspace/types';

type MetricCategorySource = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  order: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metricDefinitions: Array<{
    id: string;
    key: string;
    label: string;
    isTrackedByDefault: boolean;
  }>;
};

type MetricHistoryRecordSource = {
  id: string;
  clinicId: string;
  patientId: string;
  definitionId: string;
  appointmentId: string | null;
  recordedAt: Date;
  recordedById: string | null;
  source: MetricRecordSource;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  definition: {
    category: {
      key: string;
    };
  };
  values: Array<{
    id: string;
    metricRecordId: string;
    valueString: string | null;
    valueNumber: number | null;
    valueBoolean: boolean | null;
    valueDate: Date | null;
    valueJson: Prisma.JsonValue;
    optionId: string | null;
    option: {
      id: string;
      value: string;
      label: string;
    } | null;
  }>;
};

export function mapMetricCategoryRow(
  category: MetricCategorySource,
): MetricCategoryRow {
  return {
    id: category.id,
    key: category.key,
    name: category.name,
    description: category.description,
    order: category.order,
    isSystem: category.isSystem,
    isActive: category.isActive,
    createdAt: category.createdAt,
    updatedAt: category.updatedAt,
    metricDefinitions: category.metricDefinitions.map((definition) => ({
      id: definition.id,
      key: definition.key,
      label: definition.label,
      isTrackedByDefault: definition.isTrackedByDefault,
    })),
  };
}

export function mapMetricSelectionRow(
  selection: Prisma.PatientMetricSelectionGetPayload<Record<string, never>>,
): MetricSelectionRow {
  return {
    definitionId: selection.definitionId,
    isTracked: selection.isTracked,
  };
}

export function mapMetricDefinitionRow(
  definition: Prisma.MetricDefinitionGetPayload<{
    select: {
      id: true;
      key: true;
      label: true;
      isTrackedByDefault: true;
      category: {
        select: {
          id: true;
          key: true;
          name: true;
        };
      };
    };
  }>,
): MetricDefinitionRow {
  return {
    id: definition.id,
    key: definition.key,
    label: definition.label,
    isTrackedByDefault: definition.isTrackedByDefault,
    category: definition.category,
  };
}

export function mapMetricRecordRow(
  record: MetricHistoryRecordSource,
): MetricRecordRow {
  return {
    id: record.id,
    clinicId: record.clinicId,
    patientId: record.patientId,
    definitionId: record.definitionId,
    appointmentId: record.appointmentId,
    recordedAt: record.recordedAt,
    recordedById: record.recordedById,
    source: record.source,
    notes: record.notes,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    definition: {
      category: {
        key: record.definition.category.key,
      },
    },
    values: record.values.map((value) => ({
      id: value.id,
      metricRecordId: value.metricRecordId,
      valueString: value.valueString,
      valueNumber: value.valueNumber,
      valueBoolean: value.valueBoolean,
      valueDate: value.valueDate,
      valueJson: (parsePrismaJsonColumn(
        value.valueJson,
        patientMetricValueJsonSchema,
      ) ?? null) as Prisma.JsonValue | null,
      optionId: value.optionId,
      option: value.option,
    })),
  };
}
