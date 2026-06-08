import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  AppointmentStatus,
  ConsentStatus,
  ConsentType,
  Gender,
  InvoiceStatus,
  Prisma,
} from '@workspace/db';
import type { OcrImportCommitRequest } from '@workspace/types';
import { parseStringEnumMember, getPatientFullName } from '@workspace/utils';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import type { ImportAuditContext } from './import-types';

type OcrCommitDpdpConsent = NonNullable<OcrImportCommitRequest['dpdpConsent']>;

@Injectable()
export class OcrImportCommitService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async commitOcrImport(
    dto: OcrImportCommitRequest,
    audit: ImportAuditContext,
  ): Promise<{ patientId: string; appointmentId: string }> {
    await this.assertClinicAndDoctorExist(dto);
    const dob = this.parseDateOfBirth(dto.dateOfBirth);
    const consentSnapshot = this.assertDpdpConsentIsCurrent(dto, audit);

    return this.prisma.$transaction(async (tx) => {
      const patient = await this.createPatientWithConsent(
        tx,
        dto,
        audit,
        dob,
        consentSnapshot,
      );
      const appointment = await this.createAppointmentRecord(
        tx,
        dto,
        patient.id,
      );
      await this.createVitalsIfPresent(tx, dto, appointment.id);
      await this.createPrescriptionIfPresent(
        tx,
        dto,
        appointment.id,
        patient.id,
      );
      await this.createInvoiceIfPresent(tx, dto, patient.id, appointment.id);

      return { patientId: patient.id, appointmentId: appointment.id };
    });
  }

  private async assertClinicAndDoctorExist(
    dto: OcrImportCommitRequest,
  ): Promise<void> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: dto.clinicId },
      select: { id: true },
    });
    if (!clinic) throw new BadRequestException('Clinic not found');

    const doctor = await this.prisma.user.findFirst({
      where: { id: dto.doctorId, clinicId: dto.clinicId },
      select: { id: true },
    });
    if (!doctor)
      throw new BadRequestException('Doctor not found for this clinic');
  }

  private parseDateOfBirth(dateOfBirth: string): Date {
    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) {
      throw new BadRequestException('Invalid dateOfBirth');
    }
    return dob;
  }

  private assertDpdpConsentIsCurrent(
    dto: OcrImportCommitRequest,
    audit: ImportAuditContext,
  ): OcrCommitDpdpConsent {
    if (!dto.dpdpConsent || dto.dpdpConsent.accepted !== true)
      throw new BadRequestException(
        'DPDP consent is required to commit an OCR-extracted patient record',
      );
    if (!audit.dpdpNoticeVersion)
      throw new BadRequestException(
        'Missing DPDP consent context for OCR commit',
      );
    if (dto.dpdpConsent.noticeVersion !== audit.dpdpNoticeVersion)
      throw new BadRequestException(
        'The DPDP notice has been updated. Refresh and re-collect consent before committing.',
      );
    return dto.dpdpConsent;
  }

  private async createPatientWithConsent(
    tx: Prisma.TransactionClient,
    dto: OcrImportCommitRequest,
    audit: ImportAuditContext,
    dob: Date,
    consentSnapshot: OcrCommitDpdpConsent,
  ): Promise<{ id: string }> {
    const patient = await tx.patient.create({
      data: {
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        phoneNumber: dto.phoneNumber.trim(),
        gender:
          parseStringEnumMember(Object.values(Gender), dto.gender) ??
          Gender.OTHER,
        dateOfBirth: dob,
        address: dto.address?.trim() || undefined,
        clinicId: dto.clinicId,
        allergies:
          dto.allergies && dto.allergies.length > 0
            ? dto.allergies.join('; ')
            : undefined,
        medicalHistory: dto.diagnosis ? [dto.diagnosis] : [],
        customData: {
          ocrImport: {
            acknowledgedReview: dto.acknowledgeReview ?? false,
          },
        },
      },
    });
    await tx.consent.create({
      data: {
        patientId: patient.id,
        clinicId: dto.clinicId,
        consentType: ConsentType.DPDP_NOTICE,
        status: ConsentStatus.ACTIVE,
        givenBy: consentSnapshot.givenByName ?? getPatientFullName(dto).trim(),
        givenByRelation: consentSnapshot.relation ?? 'SELF',
        givenAt: this.clock.now(),
        validFrom: this.clock.now(),
        templateVersion: consentSnapshot.noticeVersion,
        ipAddress: audit.ipAddress,
        userAgent: audit.userAgent,
        createdBy: audit.createdBy,
        notes: 'Collected by staff via OCR import commit',
      },
    });
    return patient;
  }

  private async createAppointmentRecord(
    tx: Prisma.TransactionClient,
    dto: OcrImportCommitRequest,
    patientId: string,
  ): Promise<{ id: string }> {
    const startTime = this.clock.now();
    const endTime = new Date(this.clock.now().getTime() + 30 * 60 * 1000);

    return tx.appointment.create({
      data: {
        patientId,
        doctorId: dto.doctorId,
        clinicId: dto.clinicId,
        startTime,
        endTime,
        type: 'consultation',
        status: AppointmentStatus.CONFIRMED,
        consultationNotes: dto.consultationNotes?.trim() ?? '',
        notes: '',
        observations: dto.diagnosis?.trim() ?? '',
        provisionalDiagnosis: '',
        differentialDiagnosis: '',
        clinicalImpression: '',
        finalDiagnosis: '',
        treatmentPlan: '',
        followUpPlan: '',
      },
    });
  }

  private async createVitalsIfPresent(
    tx: Prisma.TransactionClient,
    dto: OcrImportCommitRequest,
    appointmentId: string,
  ): Promise<void> {
    const v = dto.vitals;
    if (!v) return;
    if (
      v.systolicBP === undefined &&
      v.diastolicBP === undefined &&
      v.temperature === undefined &&
      v.pulse === undefined
    )
      return;

    await tx.vitalSign.create({
      data: {
        appointmentId,
        systolicBP: v.systolicBP,
        diastolicBP: v.diastolicBP,
        temperature: v.temperature,
        pulse: v.pulse,
      },
    });
  }

  private async createPrescriptionIfPresent(
    tx: Prisma.TransactionClient,
    dto: OcrImportCommitRequest,
    appointmentId: string,
    patientId: string,
  ): Promise<void> {
    if (!dto.medications || dto.medications.length === 0) return;

    const prescription = await tx.prescription.create({
      data: {
        appointmentId,
        patientId,
        doctorId: dto.doctorId,
        instructions: dto.consultationNotes?.trim() ?? null,
      },
    });

    for (const med of dto.medications) {
      await tx.medication.create({
        data: {
          prescriptionId: prescription.id,
          name: med.name.trim(),
          dosage: med.dosage.trim() || '—',
          frequency: med.frequency.trim() || '—',
          duration: med.duration?.trim() || '—',
          route: med.route?.trim() || 'PO',
        },
      });
    }
  }

  private async createInvoiceIfPresent(
    tx: Prisma.TransactionClient,
    dto: OcrImportCommitRequest,
    patientId: string,
    appointmentId: string,
  ): Promise<void> {
    const inv = dto.invoiceDraft;
    if (!inv) return;

    await tx.invoice.create({
      data: {
        patientId,
        appointmentId,
        clinicId: dto.clinicId,
        total: inv.grandTotal,
        subtotal: inv.subtotal ?? inv.grandTotal,
        grandTotal: inv.grandTotal,
        taxTotal: inv.taxTotal ?? 0,
        discountTotal: 0,
        status: InvoiceStatus.PENDING,
        items: toPrismaInputJsonValue(inv.items),
      },
    });
  }
}
