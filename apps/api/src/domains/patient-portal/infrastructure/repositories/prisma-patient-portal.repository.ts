import { Injectable } from '@nestjs/common';
import { User } from '@workspace/db';
import {
  IPatientPortalRepository,
  PatientProfile,
  PatientSummary,
  PatientWithUser,
  OtpRecord,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PrismaPortalProfileRepository } from './prisma-portal-profile.repository';
import { PrismaPortalAuthRepository } from './prisma-portal-auth.repository';
import { PrismaPortalAppointmentsRepository } from './prisma-portal-appointments.repository';
import { PrismaPortalDocumentsRepository } from './prisma-portal-documents.repository';

@Injectable()
export class PrismaPatientPortalRepository implements IPatientPortalRepository {
  constructor(
    private readonly profile: PrismaPortalProfileRepository,
    private readonly auth: PrismaPortalAuthRepository,
    private readonly appointments: PrismaPortalAppointmentsRepository,
    private readonly documents: PrismaPortalDocumentsRepository,
  ) {}

  runUnrestricted<T>(operation: () => Promise<T>): Promise<T> {
    // RLS-BYPASS: patient portal identity is scoped by patient token, not clinic RLS
    return this.profile.runUnrestricted(operation);
  }

  findPatientByUserId(userId: string) {
    return this.profile.findPatientByUserId(userId);
  }

  findPatientByPhone(phone: string) {
    return this.profile.findPatientByPhone(phone);
  }

  findPatientWithUserByPhone(phone: string): Promise<PatientWithUser | null> {
    return this.profile.findPatientWithUserByPhone(phone);
  }

  getPatientSummary(patientId: string): Promise<PatientSummary | null> {
    return this.profile.getPatientSummary(patientId);
  }

  getPatientProfile(patientId: string): Promise<PatientProfile | null> {
    return this.profile.getPatientProfile(patientId);
  }

  hasActiveTreatmentConsent(patientId: string, clinicId: string) {
    return this.profile.hasActiveTreatmentConsent(patientId, clinicId);
  }

  updatePatient(
    patientId: string,
    data: Record<string, unknown>,
  ): Promise<PatientProfile> {
    return this.profile.updatePatient(patientId, data);
  }

  linkUserToPatient(patientId: string, userId: string): Promise<void> {
    return this.profile.linkUserToPatient(patientId, userId);
  }

  getUpcomingAppointments(
    patientId: string,
    clinicId: string,
    from: Date,
    take: number,
  ) {
    return this.appointments.getUpcomingAppointments(
      patientId,
      clinicId,
      from,
      take,
    );
  }

  getAppointments(
    patientId: string,
    clinicId: string,
    filters: Parameters<PrismaPortalAppointmentsRepository['getAppointments']>[2],
  ) {
    return this.appointments.getAppointments(patientId, clinicId, filters);
  }

  getAppointmentById(
    appointmentId: string,
    patientId: string,
    clinicId: string,
  ) {
    return this.appointments.getAppointmentById(
      appointmentId,
      patientId,
      clinicId,
    );
  }

  getPrescriptions(
    patientId: string,
    filters: Parameters<PrismaPortalDocumentsRepository['getPrescriptions']>[1],
  ) {
    return this.documents.getPrescriptions(patientId, filters);
  }

  getPrescriptionById(prescriptionId: string, patientId: string) {
    return this.documents.getPrescriptionById(prescriptionId, patientId);
  }

  getInvoices(
    patientId: string,
    filters: Parameters<PrismaPortalDocumentsRepository['getInvoices']>[1],
  ) {
    return this.documents.getInvoices(patientId, filters);
  }

  getActivePrescriptions(patientId: string, take: number) {
    return this.documents.getActivePrescriptions(patientId, take);
  }

  getOutstandingInvoices(patientId: string, take: number) {
    return this.documents.getOutstandingInvoices(patientId, take);
  }

  invalidateOtps(phone: string): Promise<void> {
    return this.auth.invalidateOtps(phone);
  }

  createOtp(data: {
    phoneNumber: string;
    otpHash: string;
    expiresAt: Date;
  }): Promise<OtpRecord> {
    return this.auth.createOtp(data);
  }

  findActiveOtp(phone: string, now: Date): Promise<OtpRecord | null> {
    return this.auth.findActiveOtp(phone, now);
  }

  incrementOtpAttempts(id: string): Promise<void> {
    return this.auth.incrementOtpAttempts(id);
  }

  markOtpUsed(id: string): Promise<void> {
    return this.auth.markOtpUsed(id);
  }

  createPortalUser(data: {
    email: string;
    password: string;
    role: User['role'];
    name: string;
  }): Promise<User> {
    return this.auth.createPortalUser(data);
  }
}
