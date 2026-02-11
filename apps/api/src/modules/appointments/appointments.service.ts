import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { Appointment } from '@workspace/types';
import { Prisma, AppointmentStatus } from '@workspace/db';
import { IAppointmentRepository } from './repositories/appointment.repository.interface';
import { VitalsFactory } from '../patients/factories/vitals.factory';
import { VitalSignInput } from '../patients/schemas/vitals.schema';
import { AppointmentCreatedEvent } from './events/appointment-created.event';
import { AppointmentUpdatedEvent } from './events/appointment-updated.event';
import { AppointmentStatus } from '@workspace/db';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    @Inject('IAppointmentRepository')
    private appointmentRepository: IAppointmentRepository,
    private vitalsFactory: VitalsFactory,
    private eventEmitter: EventEmitter2,
  ) {}

  async findAll(
    clinicId: string,
    options?: {
      date?: string;
      startDate?: string;
      endDate?: string;
      patientId?: string;
      doctorId?: string;
      cursor?: string;
      limit?: number;
      search?: string;
      userId?: string;
      userRole?: string;
      status?: AppointmentStatus[];
    },
  ) {
    const result = await this.appointmentRepository.findAll({
      clinicId,
      ...options,
      startDate: options?.startDate ? new Date(options.startDate) : undefined,
      endDate: options?.endDate ? new Date(options.endDate) : undefined,
      status: options?.status,
    });

    return result as unknown as {
      items: Appointment[];
      nextCursor?: string;
      hasMore: boolean;
      count: number;
    };
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(id);

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    return appointment as unknown as Appointment;
  }

  async create(
    data: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Appointment> {
    // Extract relational fields that shouldn't be passed directly
    const { doctor, vitalSign, prescription, invoice, patient, ...rest } =
      data as Record<string, unknown>;
    const diagnoses = (data as Record<string, unknown>).diagnoses;
    const procedures = (data as Record<string, unknown>).procedures;

    // Validate that patient exists in the clinic
    const patientRecord = await this.prisma.patient.findUnique({
      where: { id: rest.patientId as string },
      select: { id: true, clinicId: true },
    });

    if (!patientRecord) {
      throw new Error(`Patient with ID ${rest.patientId as string} not found`);
    }

    if (patientRecord.clinicId !== rest.clinicId) {
      throw new Error('Patient does not belong to this clinic');
    }

    // Validate that doctor exists (clinicId may be NULL for doctors)
    const doctorRecord = await this.prisma.user.findUnique({
      where: { id: rest.doctorId as string },
      select: { id: true, role: true, name: true },
    });

    if (!doctorRecord) {
      throw new Error(`Doctor with ID ${rest.doctorId as string} not found`);
    }

    // Check for appointment conflicts with the same doctor
    const startTime = new Date(data.startTime);
    const endTime = new Date(data.endTime);

    const conflictingAppointments =
      await this.appointmentRepository.findOverlapping(
        rest.doctorId as string,
        startTime,
        endTime,
      );

    if (conflictingAppointments.length > 0) {
      // Logic to format conflict message could be moved to a helper or kept here
      const conflict = conflictingAppointments[0] as any; // Cast to access relation
      const conflictStart = new Date(conflict.startTime);
      const conflictEnd = new Date(conflict.endTime);
      const patientName = conflict.patient
        ? `${conflict.patient.firstName} ${conflict.patient.lastName}`
        : 'another patient';

      throw new ConflictException(
        `Schedule conflict: Dr. ${doctorRecord.name} already has an appointment with ${patientName} from ${conflictStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} to ${conflictEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      );
    }

    const appointmentData: Prisma.AppointmentCreateInput = {
      id: undefined,
      startTime: startTime,
      endTime: endTime,
      status: rest.status as AppointmentStatus,
      type: rest.type as string,
      notes: rest.notes as string | undefined,
      observations: rest.observations as string | undefined,
      patient: { connect: { id: rest.patientId as string } },
      doctor: { connect: { id: rest.doctorId as string } },
      clinic: { connect: { id: rest.clinicId } },
    };

    const appointment =
      await this.appointmentRepository.create(appointmentData);

    // Emit event for notifications
    this.eventEmitter.emit(
      'appointment.created',
      new AppointmentCreatedEvent(appointment.id, rest.clinicId),
    );

    return appointment as unknown as Appointment;
  }

  async update(
    id: string,
    data: Partial<Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>>,
    userClinicId?: string,
  ): Promise<Appointment> {
    // Validate clinic ownership if clinicId is provided
    if (userClinicId) {
      const existingAppointment = await this.prisma.appointment.findUnique({
        where: { id },
        select: { clinicId: true },
      });

      if (!existingAppointment) {
        throw new Error(`Appointment with ID ${id} not found`);
      }

      if (existingAppointment.clinicId !== userClinicId) {
        throw new Error(
          'Unauthorized: Appointment does not belong to your clinic',
        );
      }
    }

    // Extract relational fields and fields needing special handling
    const dataRecord = data as Record<string, unknown>;
    const {
      doctor,
      vitalSign,
      prescription,
      invoice,
      patient,
      clinicId,
      diagnoses,
      procedures,
      generalExamination,
      systemicExamination,
      investigations,
      startTime,
      endTime,
      ...rest
    } = dataRecord;

    // Check if clinical documentation fields are being saved
    // Auto-completion criteria:
    // 1. Appointment status must be 'in-progress'
    // 2. At least one clinical documentation field is being saved
    // 3. Clinical documentation fields include:
    //    - chiefComplaint
    //    - consultationNotes
    //    - historyOfPresentIllness
    //    - provisionalDiagnosis
    //    - finalDiagnosis
    //    - treatmentPlan
    //    - clinicalImpression
    const clinicalDocFields = [
      'chiefComplaint',
      'consultationNotes',
      'historyOfPresentIllness',
      'provisionalDiagnosis',
      'finalDiagnosis',
      'treatmentPlan',
      'clinicalImpression',
    ];
    const hasClinicalDoc = clinicalDocFields.some(
      (field) => dataRecord[field] !== undefined && dataRecord[field] !== '',
    );

    // If clinical documentation is being saved, check if we should auto-complete
    let shouldAutoComplete = false;
    if (hasClinicalDoc) {
      const currentAppointment = await this.prisma.appointment.findUnique({
        where: { id },
        select: { status: true },
      });
      if (currentAppointment?.status === AppointmentStatus.IN_PROGRESS) {
        shouldAutoComplete = true;
      }
    }

    const updateData: Prisma.AppointmentUpdateInput = {
      ...(rest as object),
      ...(startTime ? { startTime: new Date(startTime as string | Date) } : {}),
      ...(endTime ? { endTime: new Date(endTime as string | Date) } : {}),
      // Handle JSON fields - Prisma expects JsonValue type
      ...(generalExamination !== undefined && {
        generalExamination: generalExamination as Prisma.InputJsonValue,
      }),
      ...(systemicExamination !== undefined && {
        systemicExamination: systemicExamination as Prisma.InputJsonValue,
      }),
      ...(investigations !== undefined && {
        investigations: investigations as Prisma.InputJsonValue,
      }),
      // Auto-complete if saving clinical documentation for in-progress appointment
      ...(shouldAutoComplete && { status: AppointmentStatus.COMPLETED }),
    };

    // Fetch current status/clinicId and version for optimistic locking
    let oldStatus = 'unknown';
    let oldStartTime: Date | undefined;
    let targetClinicId = userClinicId;
    let currentVersion: number | undefined;

    // Always fetch current state to capture old values for event diffing and version check
    if (
      !targetClinicId ||
      (dataRecord.status && oldStatus === 'unknown') ||
      startTime ||
      dataRecord.version !== undefined
    ) {
      const current = await this.prisma.appointment.findUnique({
        where: { id },
        select: {
          status: true,
          clinicId: true,
          startTime: true,
          version: true,
        },
      });
      if (current) {
        oldStatus = current.status;
        targetClinicId = targetClinicId || current.clinicId;
        oldStartTime = current.startTime;
        currentVersion = current.version;

        // Optimistic concurrency check: if client provided version, validate it
        if (
          dataRecord.version !== undefined &&
          currentVersion !== dataRecord.version
        ) {
          const clientVersion =
            typeof dataRecord.version === 'number'
              ? dataRecord.version
              : Number(dataRecord.version);
          throw new ConflictException(
            `Appointment has been modified by another user. Expected version ${clientVersion}, but current version is ${currentVersion}. Please refresh and try again.`,
          );
        }
      }
    }

    let appointment: any;

    if (shouldAutoComplete) {
      // Atomic: update appointment + queue token in a single transaction
      appointment = await this.prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({
          where: { id },
          data: updateData as any,
        });

        await tx.queueToken.updateMany({
          where: {
            appointmentId: id,
            status: AppointmentStatus.IN_PROGRESS,
          },
          data: {
            status: AppointmentStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        return updated;
      });
    } else {
      appointment = await this.appointmentRepository.update(id, updateData);
    }

    // Emit update event if status changed or just general update
    if (targetClinicId) {
      this.eventEmitter.emit(
        'appointment.updated',
        new AppointmentUpdatedEvent(
          id,
          targetClinicId,
          oldStatus,
          appointment.status,
          appointment as unknown as Appointment,
          oldStartTime,
        ),
      );
    }

    return appointment as unknown as Appointment;
  }

  async remove(id: string): Promise<void> {
    await this.appointmentRepository.delete(id);
  }

  async createVitals(
    appointmentId: string,
    data: {
      height?: number;
      weight?: number;
      bmi?: number;
      bloodPressure?: string;
      pulse?: number;
      respiratoryRate?: number;
      temperature?: number;
      spo2?: number;
      painScore?: number;
      bloodGlucose?: number;
      notes?: string;
    },
  ) {
    // Calculate BMI if height and weight are provided
    let bmi = data.bmi;
    if (!bmi && data.height && data.weight) {
      const heightInMeters = data.height / 100;
      bmi =
        Math.round((data.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    return this.prisma.vitalSign.create({
      data: {
        appointmentId,
        ...data,
        bmi,
      },
    });
  }

  async updateVitals(
    appointmentId: string,
    data: {
      height?: number;
      weight?: number;
      bmi?: number;
      bloodPressure?: string;
      pulse?: number;
      respiratoryRate?: number;
      temperature?: number;
      spo2?: number;
      painScore?: number;
      bloodGlucose?: number;
      notes?: string;
    },
  ) {
    // Calculate BMI if height and weight are provided
    let bmi = data.bmi;
    if (!bmi && data.height && data.weight) {
      const heightInMeters = data.height / 100;
      bmi =
        Math.round((data.weight / (heightInMeters * heightInMeters)) * 10) / 10;
    }

    return this.prisma.vitalSign.upsert({
      where: { appointmentId },
      create: {
        appointmentId,
        ...data,
        bmi,
      },
      update: {
        ...data,
        bmi,
      },
    });
  }
}
