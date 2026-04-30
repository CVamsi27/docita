import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPatientPortalRepository,
  PatientProfile,
  PatientSummary,
  PatientWithUser,
  OtpRecord,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';

@Injectable()
export class PrismaPatientPortalRepository implements IPatientPortalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPatientByUserId(userId: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({ where: { userId, deletedAt: null } }),
    );
  }

  async findPatientByPhone(phone: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { phoneNumber: phone, deletedAt: null },
      }),
    );
  }

  async findPatientWithUserByPhone(
    phone: string,
  ): Promise<PatientWithUser | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { phoneNumber: phone, deletedAt: null },
        include: { user: true },
      }),
    ) as Promise<PatientWithUser | null>;
  }

  async getPatientSummary(patientId: string): Promise<PatientSummary | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          mrn: true,
        },
      }),
    ) as Promise<PatientSummary | null>;
  }

  async hasActiveTreatmentConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    const count = await this.prisma.runUnrestricted(async () =>
      this.prisma.consent.count({
        where: {
          patientId,
          clinicId,
          status: 'ACTIVE',
          consentType: 'TREATMENT',
        },
      }),
    );
    return count > 0;
  }

  async getPatientProfile(patientId: string): Promise<PatientProfile | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { id: patientId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          address: true,
          mrn: true,
          preferredLanguage: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          whatsappConsent: true,
          whatsappConsentAt: true,
          createdAt: true,
        },
      }),
    ) as Promise<PatientProfile | null>;
  }

  async updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.update({
        where: { id: patientId },
        data,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          preferredName: true,
          email: true,
          phoneNumber: true,
          dateOfBirth: true,
          gender: true,
          bloodGroup: true,
          address: true,
          mrn: true,
          preferredLanguage: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emergencyContactRelation: true,
          whatsappConsent: true,
          whatsappConsentAt: true,
          createdAt: true,
        },
      }),
    ) as Promise<PatientProfile>;
  }

  async getUpcomingAppointments(
    patientId: string,
    clinicId: string,
    from: Date,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.appointment.findMany({
        where: {
          patientId,
          clinicId,
          startTime: { gte: from },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        orderBy: { startTime: 'asc' },
        take,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          chiefComplaint: true,
          doctor: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async getAppointments(
    patientId: string,
    clinicId: string,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
      take: number;
      skip: number;
    },
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = { patientId, clinicId };
    if (filters.status) where.status = filters.status;
    if (filters.startDate || filters.endDate) {
      where.startTime = {
        ...(filters.startDate ? { gte: filters.startDate } : {}),
        ...(filters.endDate ? { lte: filters.endDate } : {}),
      };
    }

    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.appointment.findMany({
          where,
          orderBy: { startTime: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            startTime: true,
            endTime: true,
            status: true,
            type: true,
            chiefComplaint: true,
            notes: true,
            doctor: { select: { id: true, name: true } },
            clinic: { select: { id: true, name: true } },
          },
        }),
        this.prisma.appointment.count({ where }),
      ]);
      return { items, total };
    });
  }

  async getAppointmentById(
    appointmentId: string,
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.appointment.findFirst({
        where: { id: appointmentId, patientId, clinicId },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
          type: true,
          chiefComplaint: true,
          notes: true,
          encounterSummary: true,
          provisionalDiagnosis: true,
          finalDiagnosis: true,
          doctor: { select: { id: true, name: true } },
          clinic: { select: { id: true, name: true, address: true } },
          prescription: {
            select: {
              id: true,
              medications: {
                select: {
                  id: true,
                  name: true,
                  dosage: true,
                  frequency: true,
                  duration: true,
                  specialInstructions: true,
                },
              },
            },
          },
          invoice: { select: { id: true, total: true, status: true } },
        },
      }),
    );
  }

  async getPrescriptions(
    patientId: string,
    filters: { take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }> {
    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.prescription.findMany({
          where: { patientId },
          orderBy: { createdAt: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            createdAt: true,
            instructions: true,
            doctorName: true,
            medications: {
              select: {
                id: true,
                name: true,
                dosage: true,
                frequency: true,
                duration: true,
                specialInstructions: true,
              },
            },
            doctor: { select: { id: true, name: true } },
          },
        }),
        this.prisma.prescription.count({ where: { patientId } }),
      ]);
      return { items, total };
    });
  }

  async getPrescriptionById(
    prescriptionId: string,
    patientId: string,
  ): Promise<unknown | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.prescription.findFirst({
        where: { id: prescriptionId, patientId },
        select: {
          id: true,
          createdAt: true,
          instructions: true,
          doctorName: true,
          medications: {
            select: {
              id: true,
              name: true,
              dosage: true,
              frequency: true,
              duration: true,
              specialInstructions: true,
            },
          },
          doctor: { select: { id: true, name: true } },
          appointment: {
            select: {
              id: true,
              clinic: { select: { id: true, name: true } },
            },
          },
        },
      }),
    );
  }

  async getInvoices(
    patientId: string,
    filters: { status?: string; take: number; skip: number },
  ): Promise<{ items: unknown[]; total: number }> {
    const where: Record<string, unknown> = { patientId };
    if (filters.status) where.status = filters.status;

    return this.prisma.runUnrestricted(async () => {
      const [items, total] = await Promise.all([
        this.prisma.invoice.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: filters.take,
          skip: filters.skip,
          select: {
            id: true,
            total: true,
            status: true,
            items: true,
            createdAt: true,
          },
        }),
        this.prisma.invoice.count({ where }),
      ]);
      return { items, total };
    });
  }

  async getActivePrescriptions(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.prescription.findMany({
        where: { patientId },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          createdAt: true,
          instructions: true,
          doctorName: true,
          medications: {
            select: { id: true, name: true, dosage: true, frequency: true },
            take: 3,
          },
          doctor: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async getOutstandingInvoices(
    patientId: string,
    take: number,
  ): Promise<unknown[]> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.invoice.findMany({
        where: { patientId, status: { in: ['PENDING', 'OVERDUE'] } },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, total: true, status: true, createdAt: true },
      }),
    );
  }

  async invalidateOtps(phone: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.updateMany({
        where: { phoneNumber: phone, usedAt: null },
        data: { usedAt: new Date() },
      }),
    );
  }

  async createOtp(data: {
    phoneNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRecord> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.create({ data }),
    ) as Promise<OtpRecord>;
  }

  async findActiveOtp(phone: string, now: Date): Promise<OtpRecord | null> {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.findFirst({
        where: {
          phoneNumber: phone,
          usedAt: null,
          expiresAt: { gt: now },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ) as Promise<OtpRecord | null>;
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.update({
        where: { id },
        data: { attempts: { increment: 1 } },
      }),
    );
  }

  async markOtpUsed(id: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patientOtp.update({
        where: { id },
        data: { usedAt: new Date() },
      }),
    );
  }

  async createPortalUser(data: {
    email: string;
    password: string;
    role: Parameters<IPatientPortalRepository['createPortalUser']>[0]['role'];
    name: string;
  }) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.user.create({ data }),
    );
  }

  async linkUserToPatient(patientId: string, userId: string): Promise<void> {
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patient.update({
        where: { id: patientId },
        data: { userId },
      }),
    );
  }
}
