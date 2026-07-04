import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import {
  IPatientPortalRepository,
  PATIENT_PORTAL_REPOSITORY_TOKEN,
} from '@/domains/patient-portal/core/repositories/patient-portal.repository.interface';
import { PatientPortalContextService } from './patient-portal-context.service';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ConsentType } from '@workspace/db';
import { DPDPComplianceService } from '@/shared/modules/compliance/dpdp-compliance.service';

function sumOutstandingInvoiceTotals(invoices: unknown[]): number {
  let sum = 0;
  for (const invoice of invoices) {
    if (invoice && typeof invoice === 'object' && 'total' in invoice) {
      const total = invoice.total;
      if (typeof total === 'number') {
        sum += total;
      }
    }
  }
  return sum;
}

@Injectable()
export class PatientPortalQueryService {
  constructor(
    @Inject(PATIENT_PORTAL_REPOSITORY_TOKEN)
    private readonly repository: IPatientPortalRepository,
    private readonly contextService: PatientPortalContextService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
    private readonly dpdpService: DPDPComplianceService,
  ) {}

  async getDashboard(userId: string) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);

    const now = this.clock.now();

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

    const totalOutstandingAmount =
      sumOutstandingInvoiceTotals(outstandingInvoices);

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
        hasMore: skip + appointments.length < total,
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

    if (!appointment) throw new NotFoundException('Appointment not found');

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
        hasMore: skip + prescriptions.length < total,
      },
    };
  }

  async getPrescriptionById(userId: string, prescriptionId: string) {
    const { patientId } = await this.contextService.getPatientContext(userId);

    const prescription = await this.repository.getPrescriptionById(
      prescriptionId,
      patientId,
    );

    if (!prescription) throw new NotFoundException('Prescription not found');

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
        hasMore: skip + invoices.length < total,
      },
    };
  }

  async getProfile(userId: string) {
    const { patientId } = await this.contextService.getPatientContext(userId);
    return this.repository.getPatientProfile(patientId);
  }

  async getConsent(userId: string) {
    const { patientId, clinicId } =
      await this.contextService.getPatientContext(userId);
    const patient = await this.repository.getPatientProfile(patientId);
    const dataStorageConsent = await this.dpdpService.hasValidConsent(
      patientId,
      clinicId,
      ConsentType.DPDP_NOTICE,
    );
    const marketingConsent = await this.dpdpService.hasValidConsent(
      patientId,
      clinicId,
      ConsentType.MARKETING,
    );

    return {
      whatsappConsent: patient?.whatsappConsent ?? false,
      whatsappConsentAt: patient?.whatsappConsentAt ?? null,
      // Surface the first-login consent banner until the patient has an active
      // DPDP data-processing consent on record.
      isFirstLogin: !dataStorageConsent,
      dataStorageConsent,
      marketingConsent,
    };
  }
}
