import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '@/domains/patients/application/dto/patient-metrics.dto';
import {
  IPatientMetricsRepository,
  MetricCategoryRow,
  MetricDefinitionExistsRow,
  MetricDefinitionRow,
  MetricRecordRow,
  MetricSelectionRow,
} from '@/domains/patients/core/repositories/patient-metrics.repository.interface';
import {
  MetricCardinality,
  MetricCaptureScope,
  MetricRecordSource,
  MetricValueType,
  Prisma,
} from '@workspace/db';

function toMetricValueType(valueType: CreateMetricDefinitionDto['valueType']) {
  const mapping: Record<
    CreateMetricDefinitionDto['valueType'],
    MetricValueType
  > = {
    NUMBER: MetricValueType.NUMBER,
    TEXT: MetricValueType.STRING,
    BOOLEAN: MetricValueType.BOOLEAN,
    DATE: MetricValueType.DATE,
    JSON: MetricValueType.JSON,
    OPTION: MetricValueType.SINGLE_SELECT,
    MULTI_OPTION: MetricValueType.MULTI_SELECT,
  };
  return mapping[valueType];
}

function toMetricCardinality(
  cardinality: CreateMetricDefinitionDto['cardinality'],
) {
  if (!cardinality) {
    return undefined;
  }
  return cardinality === 'MULTI'
    ? MetricCardinality.MULTIPLE
    : MetricCardinality.SINGLE;
}

function toMetricScope(scope: CreateMetricDefinitionDto['scope']) {
  if (!scope) {
    return undefined;
  }
  return scope === 'VISIT'
    ? MetricCaptureScope.ENCOUNTER
    : MetricCaptureScope.PROFILE;
}

function toMetricRecordSource(
  source: CreatePatientMetricValueDto['source'],
): MetricRecordSource {
  const sourceMapping: Record<string, MetricRecordSource> = {
    MANUAL: MetricRecordSource.MANUAL,
    VITALS_FORM: MetricRecordSource.VITALS_FORM,
    OBSERVATION_FORM: MetricRecordSource.OBSERVATION_FORM,
    IMPORT: MetricRecordSource.IMPORT,
    SYSTEM: MetricRecordSource.SYSTEM,
    PATIENT_PORTAL: MetricRecordSource.PATIENT_PORTAL,
  };

  if (!source) {
    return MetricRecordSource.MANUAL;
  }

  return sourceMapping[source] ?? MetricRecordSource.MANUAL;
}

@Injectable()
export class PrismaPatientMetricsRepository implements IPatientMetricsRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findCategories(clinicId: string, patientId: string) {
    const categories = await this.getReadClient().metricCategory.findMany({
      where: { clinicId, isActive: true },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        metricDefinitions: {
          where: {
            isActive: true,
            OR: [{ isPatientScoped: false }, { patientId }],
          },
          orderBy: [{ order: 'asc' }, { label: 'asc' }],
          include: {
            metricOptions: {
              where: { isActive: true },
              orderBy: [{ order: 'asc' }, { label: 'asc' }],
            },
          },
        },
      },
    });

    return categories as MetricCategoryRow[];
  }

  async findSelections(clinicId: string, patientId: string) {
    const selections =
      await this.getReadClient().patientMetricSelection.findMany({
        where: { clinicId, patientId },
      });

    return selections as MetricSelectionRow[];
  }

  createCategory(clinicId: string, dto: CreateMetricCategoryDto) {
    return this.prisma.metricCategory.create({
      data: {
        clinicId,
        key: dto.key.trim().toLowerCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        order: dto.order ?? 0,
      },
    });
  }

  findActiveCategory(clinicId: string, categoryId: string) {
    return this.getReadClient().metricCategory.findFirst({
      where: {
        id: categoryId,
        clinicId,
        isActive: true,
      },
    });
  }

  createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ) {
    return this.prisma.metricDefinition.create({
      data: {
        clinicId,
        categoryId: dto.categoryId,
        key: dto.key.trim().toLowerCase(),
        label: dto.label.trim(),
        valueType: toMetricValueType(dto.valueType),
        unit: dto.unit?.trim(),
        cardinality: toMetricCardinality(dto.cardinality),
        scope: toMetricScope(dto.scope),
        isTrackedByDefault: dto.isTrackedByDefault ?? false,
        isPatientScoped: dto.isPatientScoped ?? false,
        patientId: dto.isPatientScoped ? patientId : null,
        isCustom: true,
        order: dto.order ?? 0,
        metricOptions:
          dto.options && dto.options.length > 0
            ? {
                create: dto.options.map((option, index) => ({
                  value: option.value.trim(),
                  label: option.label.trim(),
                  order: option.order ?? index,
                })),
              }
            : undefined,
      },
      include: {
        metricOptions: {
          where: { isActive: true },
          orderBy: [{ order: 'asc' }, { label: 'asc' }],
        },
      },
    });
  }

  async findDefinitionsForSelections(
    clinicId: string,
    patientId: string,
    definitionIds: string[],
  ) {
    const definitions = await this.getReadClient().metricDefinition.findMany({
      where: {
        id: { in: definitionIds },
        clinicId,
        OR: [{ isPatientScoped: false }, { patientId }],
      },
      select: { id: true },
    });

    return definitions as MetricDefinitionExistsRow[];
  }

  async upsertSelectionsBatch(
    clinicId: string,
    patientId: string,
    dto: UpsertMetricSelectionsDto,
  ) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.patientMetricSelection.upsert({
          where: {
            patientId_definitionId: {
              patientId,
              definitionId: item.definitionId,
            },
          },
          create: {
            clinicId,
            patientId,
            definitionId: item.definitionId,
            isTracked: item.isTracked,
          },
          update: {
            isTracked: item.isTracked,
          },
        }),
      ),
    );
  }

  async findDefinitions(clinicId: string, patientId: string) {
    const definitions = await this.getReadClient().metricDefinition.findMany({
      where: {
        clinicId,
        isActive: true,
        OR: [{ isPatientScoped: false }, { patientId }],
      },
      select: {
        id: true,
        key: true,
        label: true,
        isTrackedByDefault: true,
        category: {
          select: {
            id: true,
            key: true,
            name: true,
          },
        },
      },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    });

    return definitions as MetricDefinitionRow[];
  }

  async findActiveDefinition(
    clinicId: string,
    patientId: string,
    definitionId: string,
  ) {
    const definition = await this.getReadClient().metricDefinition.findFirst({
      where: {
        id: definitionId,
        clinicId,
        isActive: true,
        OR: [{ isPatientScoped: false }, { patientId }],
      },
    });

    return definition;
  }

  createMetricRecord(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ) {
    const values: Prisma.PatientMetricValueUncheckedCreateWithoutMetricRecordInput[] =
      dto.optionIds && dto.optionIds.length > 0
        ? dto.optionIds.map((optionId) => ({ optionId }))
        : [
            {
              valueString: dto.valueString,
              valueNumber: dto.valueNumber,
              valueBoolean: dto.valueBoolean,
              valueDate: dto.valueDate ? new Date(dto.valueDate) : undefined,
              valueJson: dto.valueJson as Prisma.InputJsonValue | undefined,
              optionId: dto.optionId,
            },
          ];

    return this.prisma.patientMetricRecord.create({
      data: {
        clinicId,
        patientId,
        definitionId: dto.definitionId,
        appointmentId: dto.appointmentId,
        recordedAt: dto.recordedAt
          ? new Date(dto.recordedAt)
          : this.clock.now(),
        recordedById: userId,
        source: toMetricRecordSource(dto.source),
        notes: dto.notes,
        values: {
          create: values,
        },
      },
      include: {
        definition: {
          include: {
            category: true,
          },
        },
        values: {
          include: {
            option: true,
          },
        },
      },
    });
  }

  async findMetricHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ) {
    const records = await this.getReadClient().patientMetricRecord.findMany({
      where: {
        clinicId,
        patientId,
        ...(query.definitionId ? { definitionId: query.definitionId } : {}),
        ...(query.categoryId
          ? {
              definition: {
                categoryId: query.categoryId,
              },
            }
          : {}),
        ...(query.from || query.to
          ? {
              recordedAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: {
        definition: {
          include: {
            category: {
              select: {
                id: true,
                key: true,
                name: true,
              },
            },
          },
        },
        values: {
          include: {
            option: {
              select: {
                id: true,
                value: true,
                label: true,
              },
            },
          },
        },
      },
      orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
      take: query.limit ?? 200,
    });

    return records as MetricRecordRow[];
  }
}
