import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';
import {
  MetricCardinality,
  MetricCaptureScope,
  MetricRecordSource,
  MetricValueType,
  Prisma,
} from '@workspace/db';

export const PATIENT_METRICS_REPOSITORY_TOKEN = 'IPatientMetricsRepository';

export type MetricSelectionRow = {
  definitionId: string;
  isTracked: boolean;
};

export type MetricDefinitionRow = {
  id: string;
  key: string;
  label: string;
  isTrackedByDefault: boolean;
  category: {
    id: string;
    key: string;
    name: string;
  };
};

export type MetricCategoryDefinitionRow = {
  id: string;
  key: string;
  label: string;
  isTrackedByDefault: boolean;
};

export type MetricCategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string | null;
  order: number;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metricDefinitions: MetricCategoryDefinitionRow[];
};

export type MetricDefinitionExistsRow = { id: string };

export type MetricDefinitionLookupRow = { id: string } | null;

export type MetricRecordRow = {
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
    valueJson: Prisma.JsonValue | null;
    optionId: string | null;
    option: {
      id: string;
      value: string;
      label: string;
    } | null;
  }>;
};

export interface IPatientMetricsRepository {
  findCategories(
    clinicId: string,
    patientId: string,
  ): Promise<MetricCategoryRow[]>;
  findSelections(
    clinicId: string,
    patientId: string,
  ): Promise<MetricSelectionRow[]>;
  createCategory(
    clinicId: string,
    dto: CreateMetricCategoryDto,
  ): Promise<{
    id: string;
    clinicId: string;
    key: string;
    name: string;
    description: string | null;
    order: number;
    isSystem: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }>;
  findActiveCategory(
    clinicId: string,
    categoryId: string,
  ): Promise<{
    id: string;
  } | null>;
  createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ): Promise<{
    id: string;
    clinicId: string;
    categoryId: string;
    key: string;
    label: string;
    description: string | null;
    valueType: MetricValueType;
    unit: string | null;
    cardinality: MetricCardinality;
    scope: MetricCaptureScope;
    isCustom: boolean;
    isPatientScoped: boolean;
    patientId: string | null;
    isTrackedByDefault: boolean;
    isActive: boolean;
    order: number;
    createdAt: Date;
    updatedAt: Date;
    metricOptions: Array<{
      id: string;
      definitionId: string;
      value: string;
      label: string;
      order: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
  findDefinitionsForSelections(
    clinicId: string,
    patientId: string,
    definitionIds: string[],
  ): Promise<MetricDefinitionExistsRow[]>;
  upsertSelectionsBatch(
    clinicId: string,
    patientId: string,
    dto: UpsertMetricSelectionsDto,
  ): Promise<void>;
  findDefinitions(
    clinicId: string,
    patientId: string,
  ): Promise<MetricDefinitionRow[]>;
  findActiveDefinition(
    clinicId: string,
    patientId: string,
    definitionId: string,
  ): Promise<MetricDefinitionLookupRow>;
  createMetricRecord(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ): Promise<MetricRecordRow>;
  findMetricHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ): Promise<MetricRecordRow[]>;
}
