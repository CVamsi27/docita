import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Appointment } from '@workspace/types';
import { Prisma } from '@workspace/db';
import {
  APPOINTMENT_LIST_SELECT,
  APPOINTMENT_CARD_SELECT,
  APPOINTMENT_DETAIL_SELECT,
} from '../common/select-fragments';
import { paginateWithCursor } from '../common/pagination.helper';

// Extended select for appointment with all clinical documentation fields
// Used for updates and creates where full object is needed
const appointmentFullSelect = {
  ...APPOINTMENT_LIST_SELECT,
  // Legacy fields
  notes: true,
  observations: true,
  // Consultation Notes
  consultationNotes: true,
  // Clinical Documentation - Subjective
  chiefComplaint: true,
  treatmentHistory: true,
  historyOfPresentIllness: true,
  pastMedicalHistory: true,
  reviewOfSystems: true,
  // Clinical Documentation - Objective
  generalExamination: true,
  systemicExamination: true,
  // Specialty-specific
  dentalChart: true,
  growthData: true,
  ophthalmologyExam: true,
  cardiologyExam: true,
  gynecologyExam: true,
  dermatologyExam: true,
  psychiatryExam: true,
  // Clinical Documentation - Assessment
  provisionalDiagnosis: true,
  differentialDiagnosis: true,
  clinicalImpression: true,
  // Clinical Documentation - Plan
  investigations: true,
  finalDiagnosis: true,
  treatmentPlan: true,
  followUpPlan: true,
  patientId: true,
  doctorId: true,
  clinicId: true,
};

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

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
    },
  ) {
    if (!clinicId) {
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
        count: 0,
      };
    }

    const where: Prisma.AppointmentWhereInput = { clinicId };

    // Handle Search
    if (options?.search) {
      where.patient = {
        OR: [
          { firstName: { contains: options.search, mode: 'insensitive' } },
          { lastName: { contains: options.search, mode: 'insensitive' } },
          { phoneNumber: { contains: options.search } },
        ],
      };
    }

    // Filter by patient if specified
    if (options?.patientId) {
      where.patientId = options.patientId;
    }

    // Filter by specific doctor if provided (for admin/receptionist viewing specific doctor's calendar)
    if (options?.doctorId) {
      where.doctorId = options.doctorId;
    }
    // If user is a doctor (not admin or admin_doctor), only show their appointments
    else if (options?.userRole === 'DOCTOR' && options?.userId) {
      where.doctorId = options.userId;
    }

    // Filter by specific date (for today's appointments)
    if (options?.date) {
      // options.date is expected in YYYY-MM-DD format
      const [year, month, day] = options.date.split('-').map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endOfDay = new Date(
        Date.UTC(year, month - 1, day, 23, 59, 59, 999),
      );

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay,
      };
    }
    // Filter by date range
    else if (options?.startDate || options?.endDate) {
      where.startTime = {};
      if (options.startDate) {
        (where.startTime as Prisma.DateTimeFilter).gte = new Date(
          options.startDate,
        );
      }
      if (options.endDate) {
        (where.startTime as Prisma.DateTimeFilter).lte = new Date(
          options.endDate,
        );
      }
    }

    const result = await paginateWithCursor({
      model: this.prisma.appointment,
      cursor: options?.cursor,
      limit: options?.limit || 50,
      where,
      orderBy: { startTime: 'asc' },
      select: {
        ...APPOINTMENT_CARD_SELECT, // Use optimized card select for lists
      },
    });

    return result;
  }

  async findOne(id: string): Promise<Appointment> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: APPOINTMENT_DETAIL_SELECT, // Use optimized detail select
    });

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

    const conflictingAppointment = await this.prisma.appointment.findFirst({
      where: {
        doctorId: rest.doctorId as string,
        status: {
          notIn: ['cancelled', 'no-show'],
        },
        OR: [
          // New appointment starts during an existing appointment
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New appointment ends during an existing appointment
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New appointment completely contains an existing appointment
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        patient: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (conflictingAppointment) {
      const conflictStart = new Date(conflictingAppointment.startTime);
      const conflictEnd = new Date(conflictingAppointment.endTime);
      const patientName = conflictingAppointment.patient
        ? `${conflictingAppointment.patient.firstName} ${conflictingAppointment.patient.lastName}`
        : 'another patient';

      throw new ConflictException(
        `Schedule conflict: Dr. ${doctorRecord.name} already has an appointment with ${patientName} from ${conflictStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} to ${conflictEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      );
    }

    const appointmentData: Prisma.AppointmentCreateInput = {
      id: undefined,
      startTime: startTime,
      endTime: endTime,
      status: rest.status as string,
      type: rest.type as string,
      notes: rest.notes as string | undefined,
      observations: rest.observations as string | undefined,
      patient: { connect: { id: rest.patientId as string } },
      doctor: { connect: { id: rest.doctorId as string } },
      clinic: { connect: { id: rest.clinicId } },
    };

    const appointment = await this.prisma.appointment.create({
      data: appointmentData,
      select: {
        ...appointmentFullSelect,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
          },
        },
      },
    });
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
      if (currentAppointment?.status === 'in-progress') {
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
      ...(shouldAutoComplete && { status: 'completed' }),
    };

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: updateData,
      select: {
        ...appointmentFullSelect,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
            qualification: true,
            registrationNumber: true,
          },
        },
        vitalSign: true,
        diagnoses: {
          select: {
            id: true,
            icdCodeId: true,
            notes: true,
            isPrimary: true,
            createdAt: true,
            icdCode: {
              select: {
                id: true,
                code: true,
                description: true,
                category: true,
              },
            },
          },
        },
        procedures: {
          select: {
            id: true,
            cptCodeId: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            cptCode: {
              select: {
                id: true,
                code: true,
                description: true,
                category: true,
                price: true,
              },
            },
          },
        },
      },
    });

    // Also update queue token status if exists
    if (shouldAutoComplete) {
      await this.prisma.queueToken.updateMany({
        where: {
          appointmentId: id,
          status: 'in-progress',
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });
    }

    return appointment as unknown as Appointment;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.appointment.delete({
      where: { id },
    });
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
