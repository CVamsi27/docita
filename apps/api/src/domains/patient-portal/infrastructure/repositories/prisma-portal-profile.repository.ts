import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  PatientProfile,
  PatientSummary,
  PatientWithUser,
} from '@/domains/patient-portal/core/repositories/portal-patient.types';
import { IPortalProfileRepository } from '@/domains/patient-portal/core/repositories/portal-profile.repository.interface';

@Injectable()
export class PrismaPortalProfileRepository implements IPortalProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  runUnrestricted<T>(operation: () => Promise<T>): Promise<T> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(operation);
  }

  async findPatientByUserId(userId: string) {
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({ where: { userId, deletedAt: null } }),
    );
  }

  async findPatientByPhone(phone: string) {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { phoneNumber: phone, deletedAt: null },
      }),
    );
  }

  async findPatientWithUserByPhone(
    phone: string,
  ): Promise<PatientWithUser | null> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.prisma.runUnrestricted(async () =>
      this.prisma.patient.findFirst({
        where: { phoneNumber: phone, deletedAt: null },
        include: { user: true },
      }),
    );
  }

  async getPatientSummary(patientId: string): Promise<PatientSummary | null> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
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
    );
  }

  async hasActiveTreatmentConsent(
    patientId: string,
    clinicId: string,
  ): Promise<boolean> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
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
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
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
    );
  }

  async updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
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
    );
  }

  async linkUserToPatient(patientId: string, userId: string): Promise<void> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    await this.prisma.runUnrestricted(async () =>
      this.prisma.patient.update({
        where: { id: patientId },
        data: { userId },
      }),
    );
  }
}
