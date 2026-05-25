import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Role, VitalSign } from '@workspace/db';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentMetricDefinitionService } from '@/domains/appointments/application/services/appointment-metric-definition.service';
import {
  buildVitalsNumericMetricDefinitions,
  cleanVitalsPayload,
} from '@/domains/appointments/core/domain-services/appointment-vitals-payload.rules';

export interface RecordAppointmentVitalsCommand {
  appointmentId: string;
  clinicId: string;
  data: Partial<VitalSign>;
  accessContext?: {
    role?: Role;
    userId?: string;
  };
}

@Injectable()
export class RecordAppointmentVitalsUseCase {
  constructor(
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private readonly persistence: AppointmentPersistencePort,
    private readonly metricDefinitionService: AppointmentMetricDefinitionService,
  ) {}

  async execute(command: RecordAppointmentVitalsCommand): Promise<VitalSign> {
    const { appointmentId, clinicId, data, accessContext } = command;

    const appointment = await this.persistence.appointment.findFirst({
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

    const payload = cleanVitalsPayload(data);

    // Resolve metric definitions before opening the transaction — this step
    // may create definition rows of its own and isn't safe to roll back.
    const validMetrics = buildVitalsNumericMetricDefinitions(payload);
    const definitionIdsByKey =
      validMetrics.length > 0
        ? await this.metricDefinitionService.ensureMetricDefinitions({
            clinicId,
            patientId: appointment.patientId,
            categoryKey: 'vitals',
            categoryName: 'Vitals',
            definitions: validMetrics.map((metric) => ({
              key: metric.key,
              label: metric.label,
              valueType: 'NUMBER',
              unit: metric.unit,
            })),
          })
        : new Map<string, string>();

    // Write the vital row and each metric record in one atomic transaction so
    // a metrics-side failure doesn't leave the timeline with vitals but no
    // structured metrics (or vice versa). The interactive `$transaction`
    // form (callback) preserves the strict typing on `tx.vitalSign.upsert`
    // without a cast on the result tuple.
    const vital = await this.persistence.$transaction(async (tx) => {
      const upserted = await tx.vitalSign.upsert({
        where: { appointmentId },
        update: payload,
        create: { appointmentId, clinicId, ...payload },
      });

      for (const metric of validMetrics) {
        const definitionId = definitionIdsByKey.get(metric.key);
        if (!definitionId) continue;

        await tx.patientMetricRecord.create({
          data: {
            clinicId,
            patientId: appointment.patientId,
            appointmentId,
            definitionId,
            source: 'VITALS_FORM',
            values: {
              create: [{ valueNumber: metric.value }],
            },
          },
        });
      }

      return upserted;
    });

    if (!vital) {
      throw new NotFoundException(
        `Vitals for appointment ${appointmentId} not found`,
      );
    }

    return vital;
  }
}
