import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  CreateMetricCategoryDto,
  CreateMetricDefinitionDto,
  CreatePatientMetricValueDto,
  MetricHistoryQueryDto,
  UpsertMetricSelectionsDto,
} from '../dto/patient-metrics.dto';

type DynamicPrisma = PrismaService & {
  metricCategory: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  metricDefinition: {
    findMany: (args: unknown) => Promise<unknown[]>;
    findFirst: (args: unknown) => Promise<unknown>;
    create: (args: unknown) => Promise<unknown>;
  };
  patientMetricSelection: {
    findMany: (args: unknown) => Promise<unknown[]>;
    upsert: (args: unknown) => Promise<unknown>;
  };
  patientMetricRecord: {
    create: (args: unknown) => Promise<unknown>;
    findMany: (args: unknown) => Promise<unknown[]>;
  };
};

type MetricSelectionRow = {
  definitionId: string;
  isTracked: boolean;
};

type MetricDefinitionRow = {
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

type MetricCategoryDefinitionRow = {
  id: string;
  isTrackedByDefault: boolean;
};

type MetricCategoryRow = {
  metricDefinitions: MetricCategoryDefinitionRow[];
};

type MetricDefinitionExistsRow = { id: string };

type MetricDefinitionLookupRow = { id: string } | null;

type MetricRecordRow = {
  definition: {
    category: {
      key: string;
    };
  };
};

@Injectable()
export class PatientMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db(): DynamicPrisma {
    return this.prisma as DynamicPrisma;
  }

  async listCategories(clinicId: string, patientId: string) {
    const [categoriesRaw, selectionsRaw] = await Promise.all([
      this.db.metricCategory.findMany({
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
      }),
      this.db.patientMetricSelection.findMany({
        where: { clinicId, patientId },
      }),
    ]);

    const categories = categoriesRaw as MetricCategoryRow[];
    const selections = selectionsRaw as MetricSelectionRow[];

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
    return this.db.metricCategory.create({
      data: {
        clinicId,
        key: dto.key.trim().toLowerCase(),
        name: dto.name.trim(),
        description: dto.description?.trim(),
        order: dto.order ?? 0,
      },
    });
  }

  async createDefinition(
    clinicId: string,
    patientId: string,
    dto: CreateMetricDefinitionDto,
  ) {
    const category = await this.db.metricCategory.findFirst({
      where: {
        id: dto.categoryId,
        clinicId,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Metric category not found');
    }

    return this.db.metricDefinition.create({
      data: {
        clinicId,
        categoryId: dto.categoryId,
        key: dto.key.trim().toLowerCase(),
        label: dto.label.trim(),
        valueType: dto.valueType,
        unit: dto.unit?.trim(),
        cardinality: dto.cardinality ?? 'SINGLE',
        scope: dto.scope ?? 'PROFILE',
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

  async getSelections(clinicId: string, patientId: string) {
    const [definitionsRaw, selectionsRaw] = await Promise.all([
      this.db.metricDefinition.findMany({
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
      }),
      this.db.patientMetricSelection.findMany({
        where: { clinicId, patientId },
      }),
    ]);

    const definitions = definitionsRaw as MetricDefinitionRow[];
    const selections = selectionsRaw as MetricSelectionRow[];

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
    if (dto.items.length === 0) {
      return [];
    }

    const definitionIds = dto.items.map((item) => item.definitionId);
    const definitionsRaw = await this.db.metricDefinition.findMany({
      where: {
        id: { in: definitionIds },
        clinicId,
        OR: [{ isPatientScoped: false }, { patientId }],
      },
      select: { id: true },
    });

    const definitions = definitionsRaw as MetricDefinitionExistsRow[];

    const validDefinitionIds = new Set(
      definitions.map((definition) => definition.id),
    );
    const invalidIds = definitionIds.filter(
      (id) => !validDefinitionIds.has(id),
    );

    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Invalid metric definition IDs: ${invalidIds.join(', ')}`,
      );
    }

    for (const item of dto.items) {
      await this.db.patientMetricSelection.upsert({
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
      });
    }

    return this.getSelections(clinicId, patientId);
  }

  async recordMetricValue(
    clinicId: string,
    patientId: string,
    userId: string | undefined,
    dto: CreatePatientMetricValueDto,
  ) {
    const definition = (await this.db.metricDefinition.findFirst({
      where: {
        id: dto.definitionId,
        clinicId,
        isActive: true,
        OR: [{ isPatientScoped: false }, { patientId }],
      },
    })) as MetricDefinitionLookupRow;

    if (!definition) {
      throw new NotFoundException('Metric definition not found');
    }

    const hasStructuredValue =
      dto.valueString !== undefined ||
      dto.valueNumber !== undefined ||
      dto.valueBoolean !== undefined ||
      dto.valueDate !== undefined ||
      dto.valueJson !== undefined ||
      dto.optionId !== undefined ||
      (dto.optionIds !== undefined && dto.optionIds.length > 0);

    if (!hasStructuredValue) {
      throw new BadRequestException(
        'At least one metric value must be provided',
      );
    }

    const values =
      dto.optionIds && dto.optionIds.length > 0
        ? dto.optionIds.map((optionId) => ({ optionId }))
        : [
            {
              valueString: dto.valueString,
              valueNumber: dto.valueNumber,
              valueBoolean: dto.valueBoolean,
              valueDate: dto.valueDate ? new Date(dto.valueDate) : undefined,
              valueJson: dto.valueJson,
              optionId: dto.optionId,
            },
          ];

    return this.db.patientMetricRecord.create({
      data: {
        clinicId,
        patientId,
        definitionId: dto.definitionId,
        appointmentId: dto.appointmentId,
        recordedAt: dto.recordedAt ? new Date(dto.recordedAt) : new Date(),
        recordedById: userId,
        source: dto.source ?? 'MANUAL',
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

  async getHistory(
    clinicId: string,
    patientId: string,
    query: MetricHistoryQueryDto,
  ) {
    const records = (await this.db.patientMetricRecord.findMany({
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
    })) as MetricRecordRow[];

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
