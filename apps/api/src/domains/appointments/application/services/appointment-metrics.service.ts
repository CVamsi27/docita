import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma, Role, VitalSign } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { AppointmentMetricDefinitionService } from './appointment-metric-definition.service';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

/**
 * Handles vitals recording and patient metric tracking for appointments.
 * Metric category/definition provisioning is delegated to AppointmentMetricDefinitionService.
 */
@Injectable()
export class AppointmentMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricDefinitionService: AppointmentMetricDefinitionService,
  ) {}

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
    const definitionIdsByKey =
      await this.metricDefinitionService.ensureMetricDefinitions({
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

    const definitionIdsByKey =
      await this.metricDefinitionService.ensureMetricDefinitions({
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
}
