import { Injectable } from '@nestjs/common';
import { MetricCardinality, MetricCaptureScope, Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';

type MetricDefinitionConfig = {
  key: string;
  label: string;
  valueType: 'STRING' | 'NUMBER';
  unit?: string;
};

/**
 * Ensures that metric categories and definitions exist for a given clinic,
 * creating them on first use. Extracted from AppointmentMetricsService (SRP).
 */
@Injectable()
export class AppointmentMetricDefinitionService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureMetricDefinitions(input: {
    clinicId: string;
    patientId: string;
    categoryKey: string;
    categoryName: string;
    definitions: MetricDefinitionConfig[];
  }): Promise<Map<string, string>> {
    const definitionConfigByKey = new Map<string, MetricDefinitionConfig>();

    for (const definition of input.definitions) {
      const normalizedKey = definition.key.trim().toLowerCase();
      if (!normalizedKey || definitionConfigByKey.has(normalizedKey)) {
        continue;
      }
      definitionConfigByKey.set(normalizedKey, {
        ...definition,
        key: normalizedKey,
      });
    }

    if (definitionConfigByKey.size === 0) {
      return new Map();
    }

    const definitionKeys = Array.from(definitionConfigByKey.keys());
    const categoryKey = input.categoryKey.trim().toLowerCase();

    let category = await this.prisma.metricCategory.findFirst({
      where: {
        clinicId: input.clinicId,
        key: categoryKey,
        isActive: true,
      },
      select: { id: true },
    });

    if (!category) {
      category = await this.prisma.metricCategory.create({
        data: {
          clinicId: input.clinicId,
          key: categoryKey,
          name: input.categoryName,
        },
        select: { id: true },
      });
    }

    const where = {
      clinicId: input.clinicId,
      key: { in: definitionKeys },
      isActive: true,
      OR: [{ isPatientScoped: false }, { patientId: input.patientId }],
    } satisfies Prisma.MetricDefinitionWhereInput;

    const existingDefinitions = await this.prisma.metricDefinition.findMany({
      where,
      select: { id: true, key: true },
      orderBy: [{ isPatientScoped: 'asc' }, { createdAt: 'asc' }],
    });

    const definitionIdsByKey = new Map<string, string>();
    for (const definition of existingDefinitions) {
      if (!definitionIdsByKey.has(definition.key)) {
        definitionIdsByKey.set(definition.key, definition.id);
      }
    }

    const missingDefinitionKeys = definitionKeys.filter(
      (definitionKey) => !definitionIdsByKey.has(definitionKey),
    );

    if (missingDefinitionKeys.length > 0) {
      await this.prisma.metricDefinition.createMany({
        data: missingDefinitionKeys
          .map((definitionKey) => {
            const config = definitionConfigByKey.get(definitionKey);
            if (!config) {
              return null;
            }

            return {
              clinicId: input.clinicId,
              categoryId: category.id,
              key: definitionKey,
              label: config.label,
              valueType: config.valueType,
              unit: config.unit,
              scope: MetricCaptureScope.ENCOUNTER,
              cardinality: MetricCardinality.SINGLE,
              isTrackedByDefault: true,
              isPatientScoped: false,
              isCustom: false,
            };
          })
          .filter((entry) => entry !== null),
        skipDuplicates: true,
      });

      const refreshedDefinitions = await this.prisma.metricDefinition.findMany({
        where,
        select: { id: true, key: true },
        orderBy: [{ isPatientScoped: 'asc' }, { createdAt: 'asc' }],
      });

      for (const definition of refreshedDefinitions) {
        if (!definitionIdsByKey.has(definition.key)) {
          definitionIdsByKey.set(definition.key, definition.id);
        }
      }
    }

    return definitionIdsByKey;
  }
}
