import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, VitalSign } from '@workspace/db';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentMetricDefinitionService } from '@/domains/appointments/application/services/appointment-metric-definition.service';
import {
  buildVitalsNumericMetricDefinitions,
  cleanVitalsPayload,
  type AppointmentVitalsPayload,
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

    if (!appointment)
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
        // jscpd:ignore-start
      );
    if (
      accessContext?.role === Role.DOCTOR &&
      accessContext.userId &&
      appointment.doctorId !== accessContext.userId
    )
      throw new ForbiddenException(
        'Doctors can only access their appointments',
      );

    const payload = cleanVitalsPayload(data);
    // jscpd:ignore-end

    const updated = await this.persistence.vitalSign.updateMany({
      where: { appointmentId, clinicId },
      data: payload,
    });

    const vital =
      updated.count > 0
        ? await this.persistence.vitalSign.findFirst({
            where: { appointmentId },
          })
        : await this.persistence.vitalSign.create({
            data: { appointmentId, clinicId, ...payload },
          });
    if (!vital)
      throw new NotFoundException(
        `Vitals for appointment ${appointmentId} not found`,
      );

    await this.persistVitalsPatientMetrics({
      clinicId,
      patientId: appointment.patientId,
      appointmentId,
      vitals: payload,
    });

    return vital;
  }

  private async persistVitalsPatientMetrics(input: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    vitals: AppointmentVitalsPayload;
  }) {
    const validMetrics = buildVitalsNumericMetricDefinitions(input.vitals);
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
        this.persistence.patientMetricRecord.create({
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
      await this.persistence.$transaction(operations);
    }
  }
}
