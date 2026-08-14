import { Prisma } from '@workspace/db';
import {
  MetricCategoryRow,
  MetricDefinitionRow,
  MetricSelectionRow,
} from '@/domains/patients/core/repositories/patient-metrics.repository.interface';
import { MetricRecordRow } from '@/domains/patients/core/repositories/patient-metrics-repository.types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { assertTypedJsonValue } from '@/shared/common/json/parse-serialized-json.boundary';
import { patientMetricValueJsonSchema } from '@workspace/types';

export function mapMetricCategoryRow(
  category: MetricCategoryRow,
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

export function mapMetricRecordRow(record: MetricRecordRow): MetricRecordRow {
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
      valueJson: assertTypedJsonValue<Prisma.JsonValue | null>(
        parsePrismaJsonColumn(value.valueJson, patientMetricValueJsonSchema) ??
          null,
      ),
      optionId: value.optionId,
      option: value.option,
    })),
  };
}
