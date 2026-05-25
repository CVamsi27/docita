import { Injectable, Inject } from '@nestjs/common';
import {
  APPOINTMENT_PERSISTENCE_PORT,
  type AppointmentPersistencePort,
} from '@/domains/appointments/application/ports/appointment-persistence.port';
import { AppointmentMetricDefinitionService } from './appointment-metric-definition.service';
import {
  RecordAppointmentVitalsUseCase,
  type RecordAppointmentVitalsCommand,
} from '@/domains/appointments/application/use-cases/record-appointment-vitals.use-case';

type AppointmentAccessContext = RecordAppointmentVitalsCommand['accessContext'];

/**
 * Handles vitals recording and patient metric tracking for appointments.
 * Vitals persistence is delegated to {@link RecordAppointmentVitalsUseCase}.
 */
@Injectable()
export class AppointmentMetricsService {
  constructor(
    @Inject(APPOINTMENT_PERSISTENCE_PORT)
    private readonly persistence: AppointmentPersistencePort,
    private readonly metricDefinitionService: AppointmentMetricDefinitionService,
    private readonly recordVitalsUseCase: RecordAppointmentVitalsUseCase,
  ) {}

  createVitals(
    appointmentId: string,
    clinicId: string,
    data: RecordAppointmentVitalsCommand['data'],
    accessContext?: AppointmentAccessContext,
  ): ReturnType<RecordAppointmentVitalsUseCase['execute']> {
    return this.recordVitalsUseCase.execute({
      appointmentId,
      clinicId,
      data,
      accessContext,
    });
  }

  updateVitals(
    appointmentId: string,
    clinicId: string,
    data: RecordAppointmentVitalsCommand['data'],
    accessContext?: AppointmentAccessContext,
  ): ReturnType<RecordAppointmentVitalsUseCase['execute']> {
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

    const operations = input.metrics.flatMap((metric) => {
      const definitionId = definitionIdsByKey.get(
        metric.definitionKey.trim().toLowerCase(),
      );
      if (!definitionId) {
        return [];
      }

      return [
        this.persistence.patientMetricRecord.create({
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
      ];
    });

    if (operations.length > 0) {
      await this.persistence.$transaction(operations);
    }
  }
}
