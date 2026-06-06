import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';
import {
  IPatientMetricsRepository,
  MetricRecordRow,
  PATIENT_METRICS_REPOSITORY_TOKEN,
} from '@/domains/patients/core/repositories/patient-metrics.repository.interface';
import {
  findInvalidMetricDefinitionIds,
  hasStructuredMetricValue,
} from '@/domains/patients/core/domain-services/patient-metrics.rules';

/**
 * Thin facade — delegates patient metrics persistence to IPatientMetricsRepository.
 */
@Injectable()
export class PatientMetricsService {
  constructor(
    @Inject(PATIENT_METRICS_REPOSITORY_TOKEN)
    private readonly patientMetricsRepository: IPatientMetricsRepository,
  ) {}

  async listCategories(clinicId: string, patientId: string) {
    const [categories, selections] = await Promise.all([
      this.patientMetricsRepository.findCategories(clinicId, patientId),
      this.patientMetricsRepository.findSelections(clinicId, patientId),
    ]);

    const selectionMap = new Map(
      selections.map((selection) => [
        selection.definitionId,
        selection.isTracked,
      ]),
    );

    return categories.map((category) => ({
      ...category,
      metricDefinitions: category.metricDefinitions.map((definition) => ({
        ...definition,
        isTracked:
          selectionMap.get(definition.id) ?? definition.isTrackedByDefault,
      })),
    }));
  }

  createCategory(clinicId: string, dto: CreateMetricCategoryDto) {
    return this.patientMetricsRepository.createCategory(clinicId, dto);
  }

  async createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ) {
    const category = await this.patientMetricsRepository.findActiveCategory(
      clinicId,
      dto.categoryId,
    );

    if (!category) throw new NotFoundException('Metric category not found');

    return this.patientMetricsRepository.createDefinition(
      clinicId,
      patientId,
      dto,
    );
  }

  async getSelections(clinicId: string, patientId: string) {
    const [definitions, selections] = await Promise.all([
      this.patientMetricsRepository.findDefinitions(clinicId, patientId),
      this.patientMetricsRepository.findSelections(clinicId, patientId),
    ]);

    const selectionMap = new Map(
      selections.map((selection) => [
        selection.definitionId,
        selection.isTracked,
      ]),
    );

    return definitions.map((definition) => ({
      ...definition,
      isTracked:
        selectionMap.get(definition.id) ?? definition.isTrackedByDefault,
    }));
  }

  async upsertSelections(
    clinicId: string,
    patientId: string,
    dto: UpsertMetricSelectionsDto,
  ) {
    if (dto.items.length === 0) return [];

    const definitionIds = [
      ...new Set(dto.items.map((item) => item.definitionId)),
    ];
    const definitions =
      await this.patientMetricsRepository.findDefinitionsForSelections(
        clinicId,
        patientId,
        definitionIds,
      );

    const invalidIds = findInvalidMetricDefinitionIds(
      definitionIds,
      definitions,
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid metric definition IDs: ${invalidIds.join(', ')}`,
      );
    }

    await this.patientMetricsRepository.upsertSelectionsBatch(
      clinicId,
      patientId,
      dto,
    );

    return this.getSelections(clinicId, patientId);
  }

  async recordMetricValue(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ) {
    const definition = await this.patientMetricsRepository.findActiveDefinition(
      clinicId,
      patientId,
      dto.definitionId,
    );

    if (!definition) throw new NotFoundException('Metric definition not found');

    if (!hasStructuredMetricValue(dto)) {
      throw new BadRequestException(
        'At least one metric value must be provided',
      );
    }

    return this.patientMetricsRepository.createMetricRecord(
      clinicId,
      patientId,
      userId,
      dto,
    );
  }

  async getHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ) {
    const records = await this.patientMetricsRepository.findMetricHistory(
      clinicId,
      patientId,
      query,
    );

    const grouped = records.reduce<Record<string, MetricRecordRow[]>>(
      (acc, record) => {
        const categoryKey = record.definition.category.key;
        if (!acc[categoryKey]) {
          acc[categoryKey] = [];
        }
        acc[categoryKey].push(record);
        return acc;
      },
      {},
    );

    return {
      total: records.length,
      timeline: records,
      byCategory: grouped,
    };
  }
}
