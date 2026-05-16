import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  MetricCardinality,
  MetricCaptureScope,
  Prisma,
  Role,
  VitalSign,
} from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

type MetricDefinitionConfig = {
  key: string;
  label: string;
  valueType: 'STRING' | 'NUMBER';
  unit?: string;
};

/**
 * Handles vitals recording and patient metric tracking for appointments.
 * Extracted from AppointmentCommandService to keep each service under 400 lines.
 */
@Injectable()
export class AppointmentMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async createVitals(
    appointmentId: string,
    clinicId: string,
    data: Partial<VitalSign>,
    accessContext?: AppointmentAccessContext,
  ): Promise<VitalSign> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, clinicId },
      select: {
        id: true,
        clinicId: true,
        patientId: true,
        doctorId: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    if (
      accessContext?.role === Role.DOCTOR &&
      accessContext.userId &&
      appointment.doctorId !== accessContext.userId
    ) {
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );
    }

    const payload = this.cleanVitalsPayload(data);

    const updated = await this.prisma.vitalSign.updateMany({
      where: { appointmentId, clinicId },
      data: payload,
    });

    const vital =
      updated.count > 0
        ? await this.prisma.vitalSign.findFirst({ where: { appointmentId } })
        : await this.prisma.vitalSign.create({
            data: {
              appointmentId,
              clinicId,
              ...payload,
            },
          });

    if (!vital) {
      throw new NotFoundException(
        `Vitals for appointment ${appointmentId} not found`,
      );
    }

    await this.recordVitalsMetrics({
      clinicId,
      patientId: appointment.patientId,
      appointmentId,
      vitals: payload,
    });

    return vital;
  }

  async updateVitals(
    appointmentId: string,
    clinicId: string,
    data: Partial<VitalSign>,
    accessContext?: AppointmentAccessContext,
  ): Promise<VitalSign> {
    return this.createVitals(appointmentId, clinicId, data, accessContext);
  }

  async recordObservationMetrics(input: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    metrics: Array<{
      definitionKey: string;
      definitionLabel: string;
      value: string;
    }>;
  }) {
    const definitionIdsByKey = await this.ensureMetricDefinitions({
      clinicId: input.clinicId,
      patientId: input.patientId,
      categoryKey: 'observations',
      categoryName: 'Observations',
      definitions: input.metrics.map((metric) => ({
        key: metric.definitionKey,
        label: metric.definitionLabel,
        valueType: 'STRING',
      })),
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const metric of input.metrics) {
      const definitionId = definitionIdsByKey.get(
        metric.definitionKey.trim().toLowerCase(),
      );
      if (!definitionId) {
        continue;
      }

      operations.push(
        this.prisma.patientMetricRecord.create({
          data: {
            clinicId: input.clinicId,
            patientId: input.patientId,
            appointmentId: input.appointmentId,
            definitionId,
            source: 'OBSERVATION_FORM',
            values: {
              create: [{ valueString: metric.value }],
            },
          },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  cleanVitalsPayload(data: Partial<VitalSign>) {
    return {
      height: data.height,
      weight: data.weight,
      bloodPressure: data.bloodPressure,
      systolicBP: data.systolicBP,
      diastolicBP: data.diastolicBP,
      pulse: data.pulse,
      temperature: data.temperature,
      spo2: data.spo2,
      bloodGlucose: data.bloodGlucose,
      notes: data.notes,
      painScore: data.painScore,
      respiratoryRate: data.respiratoryRate,
      bmi: data.bmi,
      headCircumference: data.headCircumference,
      waistCircumference: data.waistCircumference,
      oxygenFlowRate: data.oxygenFlowRate,
      oxygenDelivery: data.oxygenDelivery,
      bpPosition: data.bpPosition,
      bpMigrationStatus: data.bpMigrationStatus,
    };
  }

  private async recordVitalsMetrics(input: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    vitals: ReturnType<AppointmentMetricsService['cleanVitalsPayload']>;
  }) {
    const mappings: Array<{
      key: string;
      label: string;
      unit?: string;
      value?: number | null;
    }> = [
      {
        key: 'height',
        label: 'Height',
        unit: 'cm',
        value: input.vitals.height,
      },
      {
        key: 'weight',
        label: 'Weight',
        unit: 'kg',
        value: input.vitals.weight,
      },
      {
        key: 'systolic_bp',
        label: 'Systolic BP',
        unit: 'mmHg',
        value: input.vitals.systolicBP,
      },
      {
        key: 'diastolic_bp',
        label: 'Diastolic BP',
        unit: 'mmHg',
        value: input.vitals.diastolicBP,
      },
      { key: 'pulse', label: 'Pulse', unit: 'bpm', value: input.vitals.pulse },
      {
        key: 'respiratory_rate',
        label: 'Respiratory Rate',
        unit: 'breaths/min',
        value: input.vitals.respiratoryRate,
      },
      {
        key: 'temperature',
        label: 'Temperature',
        unit: '°C',
        value: input.vitals.temperature,
      },
      { key: 'spo2', label: 'SpO2', unit: '%', value: input.vitals.spo2 },
      {
        key: 'pain_score',
        label: 'Pain Score',
        unit: 'score',
        value: input.vitals.painScore,
      },
      {
        key: 'blood_glucose',
        label: 'Blood Glucose',
        unit: 'mg/dL',
        value: input.vitals.bloodGlucose,
      },
    ];

    const validMetrics = mappings.filter(
      (metric): metric is (typeof mappings)[number] & { value: number } =>
        typeof metric.value === 'number' && !Number.isNaN(metric.value),
    );

    if (validMetrics.length === 0) {
      return;
    }

    const definitionIdsByKey = await this.ensureMetricDefinitions({
      clinicId: input.clinicId,
      patientId: input.patientId,
      categoryKey: 'vitals',
      categoryName: 'Vitals',
      definitions: validMetrics.map((metric) => ({
        key: metric.key,
        label: metric.label,
        valueType: 'NUMBER',
        unit: metric.unit,
      })),
    });

    const operations: Prisma.PrismaPromise<unknown>[] = [];

    for (const metric of validMetrics) {
      const definitionId = definitionIdsByKey.get(metric.key);
      if (!definitionId) {
        continue;
      }

      operations.push(
        this.prisma.patientMetricRecord.create({
          data: {
            clinicId: input.clinicId,
            patientId: input.patientId,
            appointmentId: input.appointmentId,
            definitionId,
            source: 'VITALS_FORM',
            values: {
              create: [{ valueNumber: metric.value }],
            },
          },
        }),
      );
    }

    if (operations.length > 0) {
      await this.prisma.$transaction(operations);
    }
  }

  private async ensureMetricDefinitions(input: {
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
