import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
} from '@/domains/appointments/core/repositories/appointment.repository.interface';
import { Prisma, Role, VitalSign } from '@workspace/db';
import {
  CreateAppointmentUseCase,
  CreateAppointmentCommand,
} from '@/domains/appointments/application/use-cases/create-appointment.use-case';
import { AppointmentCreatedEvent } from '@/domains/appointments/application/events/appointment-created.event';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import { PrismaService } from '@/prisma/prisma.service';

type AppointmentAccessContext = {
  role?: Role;
  userId?: string;
};

const CONSULTATION_START_ALLOWED_STATUSES = new Set([
  'SCHEDULED',
  'CONFIRMED',
  'IN_PROGRESS',
]);

@Injectable()
export class AppointmentService {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly appointmentRepository: IAppointmentRepository,
    private readonly createAppointmentUseCase: CreateAppointmentUseCase,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createAppointment(
    command: CreateAppointmentCommand,
  ): Promise<Appointment> {
    const appointment = await this.createAppointmentUseCase.execute(command);

    this.eventEmitter.emit(
      'appointment.created',
      new AppointmentCreatedEvent(
        appointment.id,
        appointment.clinicId,
        appointment.patientId,
        appointment,
      ),
    );

    return appointment;
  }

  async getAppointment(
    id: string,
    clinicId?: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);
    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (clinicId && appointment.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied for this appointment');
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

    return appointment;
  }

  async listAppointments(params: AppointmentSearchParams) {
    return this.appointmentRepository.findAll(params);
  }

  async startConsultation(
    id: string,
    clinicId: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<{ appointmentId: string; status: string }> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: {
        id: true,
        clinicId: true,
        doctorId: true,
        status: true,
        queueToken: {
          select: {
            id: true,
            status: true,
            calledAt: true,
            consultationStart: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (appointment.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied for this appointment');
    }

    if (
      !accessContext?.userId ||
      (accessContext.role !== Role.DOCTOR &&
        accessContext.role !== Role.ADMIN_DOCTOR)
    ) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    if (appointment.doctorId !== accessContext.userId) {
      throw new ForbiddenException(
        'Only the assigned doctor can start this consultation',
      );
    }

    if (!CONSULTATION_START_ALLOWED_STATUSES.has(appointment.status)) {
      throw new BadRequestException(
        'This consultation cannot be started from its current appointment status',
      );
    }

    if (appointment.status !== 'IN_PROGRESS') {
      await this.prisma.appointment.update({
        where: { id },
        data: {
          status: 'IN_PROGRESS',
          version: { increment: 1 },
        },
      });
    }

    if (appointment.queueToken) {
      const startTime = appointment.queueToken.consultationStart ?? new Date();
      const calledAt = appointment.queueToken.calledAt ?? new Date();

      await this.prisma.queueToken.update({
        where: { id: appointment.queueToken.id },
        data: {
          status: 'IN_PROGRESS',
          calledAt,
          consultationStart: startTime,
        },
      });
    }

    return {
      appointmentId: appointment.id,
      status: 'in-progress',
    };
  }

  async cancelAppointment(
    id: string,
    reason: string,
    clinicId?: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<void> {
    const appointment = await this.getAppointment(id, clinicId, accessContext);
    appointment.cancel(reason);
    await this.appointmentRepository.update(appointment);
  }

  async rescheduleAppointment(
    id: string,
    startTime: Date,
    endTime: Date,
    clinicId?: string,
    accessContext?: AppointmentAccessContext,
  ): Promise<void> {
    const appointment = await this.getAppointment(id, clinicId, accessContext);
    appointment.reschedule(startTime, endTime);
    await this.appointmentRepository.update(appointment);
  }

  async updateAppointmentDetails(
    id: string,
    clinicId: string,
    data: Prisma.AppointmentUpdateInput,
    accessContext?: AppointmentAccessContext,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: { id: true, clinicId: true, patientId: true, doctorId: true },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (appointment.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied for this appointment');
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

    await this.prisma.appointment.update({
      where: { id },
      data: {
        ...data,
        version: { increment: 1 },
      },
    });

    const observations =
      typeof data.observations === 'string' ? data.observations.trim() : '';
    if (observations) {
      await this.recordObservationMetric({
        clinicId,
        patientId: appointment.patientId,
        appointmentId: id,
        definitionKey: 'observations',
        definitionLabel: 'Observations',
        value: observations,
      });
    }

    const consultationNotes =
      typeof data.consultationNotes === 'string'
        ? data.consultationNotes.trim()
        : '';
    if (consultationNotes) {
      await this.recordObservationMetric({
        clinicId,
        patientId: appointment.patientId,
        appointmentId: id,
        definitionKey: 'consultation_notes',
        definitionLabel: 'Consultation Notes',
        value: consultationNotes,
      });
    }

    return this.getAppointment(id, clinicId, accessContext);
  }

  async createVitals(
    appointmentId: string,
    clinicId: string,
    data: Partial<VitalSign>,
    accessContext?: AppointmentAccessContext,
  ): Promise<VitalSign> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
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

    if (appointment.clinicId !== clinicId) {
      throw new ForbiddenException('Access denied for this appointment');
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

    const vital = await this.prisma.vitalSign.upsert({
      where: { appointmentId },
      update: payload,
      create: {
        appointmentId,
        ...payload,
      },
    });

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

  private cleanVitalsPayload(data: Partial<VitalSign>) {
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
    vitals: ReturnType<AppointmentService['cleanVitalsPayload']>;
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
      {
        key: 'pulse',
        label: 'Pulse',
        unit: 'bpm',
        value: input.vitals.pulse,
      },
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
      {
        key: 'spo2',
        label: 'SpO2',
        unit: '%',
        value: input.vitals.spo2,
      },
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

    for (const metric of mappings) {
      if (typeof metric.value !== 'number' || Number.isNaN(metric.value)) {
        continue;
      }

      const definitionId = await this.ensureMetricDefinition({
        clinicId: input.clinicId,
        patientId: input.patientId,
        categoryKey: 'vitals',
        categoryName: 'Vitals',
        definitionKey: metric.key,
        definitionLabel: metric.label,
        valueType: 'NUMBER',
        unit: metric.unit,
      });

      if (!definitionId) {
        continue;
      }

      await this.prisma.patientMetricRecord.create({
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
      });
    }
  }

  private async recordObservationMetric(input: {
    clinicId: string;
    patientId: string;
    appointmentId: string;
    definitionKey: string;
    definitionLabel: string;
    value: string;
  }) {
    const definitionId = await this.ensureMetricDefinition({
      clinicId: input.clinicId,
      patientId: input.patientId,
      categoryKey: 'observations',
      categoryName: 'Observations',
      definitionKey: input.definitionKey,
      definitionLabel: input.definitionLabel,
      valueType: 'STRING',
    });

    if (!definitionId) {
      return;
    }

    await this.prisma.patientMetricRecord.create({
      data: {
        clinicId: input.clinicId,
        patientId: input.patientId,
        appointmentId: input.appointmentId,
        definitionId,
        source: 'OBSERVATION_FORM',
        values: {
          create: [{ valueString: input.value }],
        },
      },
    });
  }

  private async ensureMetricDefinition(input: {
    clinicId: string;
    patientId: string;
    categoryKey: string;
    categoryName: string;
    definitionKey: string;
    definitionLabel: string;
    valueType: 'STRING' | 'NUMBER';
    unit?: string;
  }): Promise<string | null> {
    const categoryKey = input.categoryKey.trim().toLowerCase();
    const definitionKey = input.definitionKey.trim().toLowerCase();

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

    const existingDefinition = await this.prisma.metricDefinition.findFirst({
      where: {
        clinicId: input.clinicId,
        key: definitionKey,
        isActive: true,
        OR: [{ isPatientScoped: false }, { patientId: input.patientId }],
      },
      select: { id: true },
    });

    if (existingDefinition?.id) {
      return existingDefinition.id;
    }

    const createdDefinition = await this.prisma.metricDefinition.create({
      data: {
        clinicId: input.clinicId,
        categoryId: category.id,
        key: definitionKey,
        label: input.definitionLabel,
        valueType: input.valueType,
        unit: input.unit,
        scope: 'ENCOUNTER',
        cardinality: 'SINGLE',
        isTrackedByDefault: true,
        isPatientScoped: false,
        isCustom: false,
      },
      select: { id: true },
    });

    return createdDefinition.id;
  }
}
