import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';

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
  isTrackedByDefault: boolean;
};

export type MetricCategoryRow = Record<string, unknown> & {
  metricDefinitions: MetricCategoryDefinitionRow[];
};

export type MetricDefinitionExistsRow = { id: string };

export type MetricDefinitionLookupRow = { id: string } | null;

export type MetricRecordRow = Record<string, unknown> & {
  definition: {
    category: {
      key: string;
    };
  };
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
  ): Promise<Record<string, unknown>>;
  findActiveCategory(
    clinicId: string,
    categoryId: string,
  ): Promise<Record<string, unknown> | null>;
  createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ): Promise<Record<string, unknown>>;
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
  ): Promise<Record<string, unknown>>;
  findMetricHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ): Promise<MetricRecordRow[]>;
}
