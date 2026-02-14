import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IAppointmentRepository,
  AppointmentSearchParams,
  PaginatedResult,
} from './appointment.repository.interface';
import { Appointment, Prisma, AppointmentStatus } from '@workspace/db';
import { paginateWithCursor } from '../../../common/pagination.helper';
import {
  APPOINTMENT_CARD_SELECT,
  APPOINTMENT_DETAIL_SELECT,
  APPOINTMENT_LIST_SELECT,
} from '../../../common/select-fragments';

// Full select structure for create/update operations
const APPOINTMENT_FULL_SELECT = {
  ...APPOINTMENT_LIST_SELECT,
  notes: true,
  observations: true,
  consultationNotes: true,
  chiefComplaint: true,
  treatmentHistory: true,
  historyOfPresentIllness: true,
  pastMedicalHistory: true,
  reviewOfSystems: true,
  generalExamination: true,
  systemicExamination: true,
  dentalChart: true,
  growthData: true,
  ophthalmologyExam: true,
  cardiologyExam: true,
  gynecologyExam: true,
  dermatologyExam: true,
  psychiatryExam: true,
  provisionalDiagnosis: true,
  differentialDiagnosis: true,
  clinicalImpression: true,
  investigations: true,
  finalDiagnosis: true,
  treatmentPlan: true,
  followUpPlan: true,
  patientId: true,
  doctorId: true,
  clinicId: true,
};

@Injectable()
export class PrismaAppointmentRepository implements IAppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    params: AppointmentSearchParams,
  ): Promise<PaginatedResult<Appointment>> {
    const {
      clinicId,
      date,
      startDate,
      endDate,
      patientId,
      doctorId,
      cursor,
      limit,
      search,
      userId,
      userRole,
    } = params as any; // Using any to handle 'date' string vs Date obj mapping from service

    if (!clinicId) {
      return { items: [], nextCursor: undefined, hasMore: false, count: 0 };
    }

    const where: Prisma.AppointmentWhereInput = { clinicId };

    // Search Logic
    if (search) {
      where.patient = {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phoneNumber: { contains: search } },
        ],
      };
    }

    // Filters
    if (patientId) where.patientId = patientId;

    if (doctorId) {
      where.doctorId = doctorId;
    } else if (userRole === 'DOCTOR' && userId) {
      // Role-based access restriction
      where.doctorId = userId;
    }

    // Date Filtering
    if (date) {
      // Specific Date (YYYY-MM-DD input assumed from service)
      const [year, month, day] = (date as string).split('-').map(Number);
      const startOfDay = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      const endOfDay = new Date(
        Date.UTC(year, month - 1, day, 23, 59, 59, 999),
      );
      where.startTime = { gte: startOfDay, lte: endOfDay };
    } else if (startDate || endDate) {
      // Range
      where.startTime = {};
      if (startDate)
        (where.startTime as Prisma.DateTimeFilter).gte = new Date(startDate);
      if (endDate)
        (where.startTime as Prisma.DateTimeFilter).lte = new Date(endDate);
    }

    // Execute Pagination
    return paginateWithCursor({
      model: this.prisma.appointment as any,
      cursor,
      limit: limit || 50,
      where,
      orderBy: { startTime: 'asc' },
      select: APPOINTMENT_CARD_SELECT,
    }) as Promise<PaginatedResult<Appointment>>;
  }

  async findById(id: string): Promise<Appointment | null> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      select: APPOINTMENT_DETAIL_SELECT,
    });
    return appointment as unknown as Appointment;
  }

  async create(data: Prisma.AppointmentCreateInput): Promise<Appointment> {
    const appointment = await this.prisma.appointment.create({
      data,
      select: {
        ...APPOINTMENT_FULL_SELECT,
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
    data: Prisma.AppointmentUpdateInput,
  ): Promise<Appointment> {
    const appointment = await this.prisma.appointment.update({
      where: { id },
      data,
      select: {
        ...APPOINTMENT_FULL_SELECT,
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
    return appointment as unknown as Appointment;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.appointment.delete({ where: { id } });
  }

  async findOverlapping(
    doctorId: string,
    startTime: Date,
    endTime: Date,
    excludeId?: string,
  ): Promise<Appointment[]> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      status: {
        notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.NO_SHOW],
      },
      OR: [
        { startTime: { lte: startTime }, endTime: { gt: startTime } }, // Starts during existing
        { startTime: { lt: endTime }, endTime: { gte: endTime } }, // Ends during existing
        { startTime: { gte: startTime }, endTime: { lte: endTime } }, // Contained within
      ],
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const appointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    });

    return appointments as unknown as Appointment[]; // Safe cast for partial result
  }
}
