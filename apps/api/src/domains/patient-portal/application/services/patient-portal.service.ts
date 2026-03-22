import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PatientPortalContextService } from './patient-portal-context.service';

@Injectable()
export class PatientPortalService {
  private readonly logger = new Logger(PatientPortalService.name);

  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly contextService: PatientPortalContextService,
  ) {}

  async getDashboard(userId: string) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const now = new Date();

    const [
      patient,
      upcomingAppointments,
      activePrescriptions,
      outstandingInvoices,
    ] = await Promise.all([
      this.repository.getPatientSummary(patientId),
      this.repository.getUpcomingAppointments(patientId, clinicId, now, 5),
      this.repository.getActivePrescriptions(patientId, 5),
      this.repository.getOutstandingInvoices(patientId, 5),
    ]);

    const totalOutstandingAmount = (
      outstandingInvoices as Array<{ total?: number }>
    ).reduce((sum, inv) => sum + (inv.total ?? 0), 0);

    return {
      patient,
      summary: {
        upcomingAppointmentsCount: upcomingAppointments.length,
        activePrescriptionsCount: activePrescriptions.length,
        outstandingInvoicesCount: outstandingInvoices.length,
        totalOutstandingAmount,
      },
      upcomingAppointments,
      activePrescriptions,
      outstandingInvoices,
    };
  }

  async getAppointments(
    userId: string,
    filters?: {
      status?: string;
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const { items: appointments, total } =
      await this.repository.getAppointments(patientId, clinicId, {
        status: filters?.status,
        startDate: filters?.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters?.endDate ? new Date(filters.endDate) : undefined,
        take,
        skip,
      });

    return {
      appointments,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + (appointments as unknown[]).length < total,
      },
    };
  }

  async getAppointmentById(userId: string, appointmentId: string) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const appointment = await this.repository.getAppointmentById(
      appointmentId,
      patientId,
      clinicId,
    );

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    return appointment;
  }

  async getPrescriptions(
    userId: string,
    filters?: { limit?: number; offset?: number },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const { items: prescriptions, total } =
      await this.repository.getPrescriptions(patientId, { take, skip });

    return {
      prescriptions,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + (prescriptions as unknown[]).length < total,
      },
    };
  }

  async getPrescriptionById(userId: string, prescriptionId: string) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const prescription = await this.repository.getPrescriptionById(
      prescriptionId,
      patientId,
    );

    if (!prescription) {
      throw new NotFoundException('Prescription not found');
    }

    return prescription;
  }

  async getInvoices(
    userId: string,
    filters?: { status?: string; limit?: number; offset?: number },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const take = filters?.limit ?? 20;
    const skip = filters?.offset ?? 0;

    const { items: invoices, total } = await this.repository.getInvoices(
      patientId,
      { status: filters?.status, take, skip },
    );

    return {
      invoices,
      pagination: {
        total,
        limit: take,
        offset: skip,
        hasMore: skip + (invoices as unknown[]).length < total,
      },
    };
  }

  async getProfile(userId: string) {
    const { patientId } = await this.contextService.getPatientContext(userId);
    return this.repository.getPatientProfile(patientId);
  }

  async updateProfile(
    userId: string,
    data: {
      phoneNumber?: string;
      email?: string;
      address?: string;
      whatsappConsent?: boolean;
      preferredName?: string;
      emergencyContactName?: string;
      emergencyContactPhone?: string;
      emergencyContactRelation?: string;
    },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phoneNumber !== undefined)
      updateData.phoneNumber = data.phoneNumber;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.preferredName !== undefined)
      updateData.preferredName = data.preferredName;
    if (data.emergencyContactName !== undefined)
      updateData.emergencyContactName = data.emergencyContactName;
    if (data.emergencyContactPhone !== undefined)
      updateData.emergencyContactPhone = data.emergencyContactPhone;
    if (data.emergencyContactRelation !== undefined)
      updateData.emergencyContactRelation = data.emergencyContactRelation;
    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      updateData.whatsappConsentAt = new Date();
    }

    return this.repository.updatePatient(patientId, updateData);
  }

  async getConsent(userId: string) {
    const { patientId } = await this.contextService.getPatientContext(userId);
    const patient = await this.repository.getPatientProfile(patientId);

    return {
      whatsappConsent: patient?.whatsappConsent ?? false,
      whatsappConsentAt: patient?.whatsappConsentAt ?? null,
      isFirstLogin: false,
    };
  }

  async updateConsent(
    userId: string,
    data: { whatsappConsent?: boolean; dataStorageConsent?: boolean },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const updateData: Record<string, unknown> = {};
    if (data.whatsappConsent !== undefined) {
      updateData.whatsappConsent = data.whatsappConsent;
      updateData.whatsappConsentAt = new Date();
    }

    const updated = await this.repository.updatePatient(patientId, updateData);

    return {
      whatsappConsent: updated.whatsappConsent,
      whatsappConsentAt: updated.whatsappConsentAt,
      isFirstLogin: false,
    };
  }

  async requestDataDeletion(
    userId: string,
    data: { reason: string; confirmDeletion?: boolean },
  ) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    this.logger.log(
      `Patient ${patientId} requested data deletion. Reason: ${data.reason}`,
    );

    return {
      message:
        'Your data deletion request has been received. Our team will process it within 30 days as per DPDP guidelines.',
      patientId,
      requestedAt: new Date().toISOString(),
    };
  }
}
